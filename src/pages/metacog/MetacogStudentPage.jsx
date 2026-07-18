// 메타인지 트레이닝 학생 응시 페이지 (/metacog)
// 60문항 × 10초 판정 → 서버 사이드 검증 5문항 랜덤 고정
//
// 단계: auth → confirm → test → done
// - auth: 이름 + 뒷4자리 명부 대조 (authenticate_student RPC)
// - confirm: 학생 정보 확인 + 세션 존재 여부 (get_active_session_for_student RPC)
// - test: 60문항 판정 (판단 10초, 미판단 시 beep 후 'cannot' 강제 판정)
// - done: 검증 5문항 안내 후 자동 초기화 (순회식 공용 태블릿 대응)

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase';

const BUCKET = 'metacog-questions';
const QUESTION_DURATION_SEC = 10;
const BEEP_AT_REMAINING_SEC = 3;
const DONE_AUTO_RESET_MS = 8000;

// 브라우저 기본 사운드 (파일 없이 AudioContext beep)
function playBeep(freq = 880, durationMs = 180) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, durationMs);
  } catch {
    /* silent */
  }
}

// 이미지 프리로드 — 태블릿 대역폭 아끼기 위해 다음 3~5개만 순서대로
function preloadImage(url) {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

export default function MetacogStudentPage() {
  const [step, setStep] = useState('auth'); // auth | confirm | test | done | already
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 지점 코드 — URL ?branch=xxx 로 오버라이드 가능, 기본 sajik
  const [branchCode] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return (p.get('branch') || 'sajik').trim().toLowerCase();
    } catch {
      return 'sajik';
    }
  });

  // auth 입력
  const [inputName, setInputName] = useState('');
  const [inputCode, setInputCode] = useState('');

  // 인증 후 학생/세션 정보
  const [student, setStudent] = useState(null);
  const [session, setSession] = useState(null);

  // 시험 상태
  const [questions, setQuestions] = useState([]); // [{q_no, image_url, signedUrl}]
  const [answers, setAnswers] = useState([]); // [{q_no, judgment, forced}]
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION_SEC);
  const [submitting, setSubmitting] = useState(false);

  // 완료 후 결과
  const [verifyQNos, setVerifyQNos] = useState([]);

  const timerRef = useRef(null);
  const beepFiredRef = useRef(false);

  // ------------------------------------------------------------
  // 상태 초기화 (순회식: 완료 후 자동 리셋)
  // ------------------------------------------------------------
  const resetAll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStep('auth');
    setLoading(false);
    setError('');
    setInputName('');
    setInputCode('');
    setStudent(null);
    setSession(null);
    setQuestions([]);
    setAnswers([]);
    setCurrentIdx(0);
    setTimeLeft(QUESTION_DURATION_SEC);
    setSubmitting(false);
    setVerifyQNos([]);
    beepFiredRef.current = false;
  }, []);

  // ------------------------------------------------------------
  // Step 1: 인증
  // ------------------------------------------------------------
  const handleAuth = async (e) => {
    e?.preventDefault?.();
    setError('');
    const name = inputName.trim();
    const code = inputCode.trim();
    if (!name) {
      setError('이름을 입력하세요.');
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      setError('학부모 연락처 뒷 4자리를 입력하세요.');
      return;
    }

    setLoading(true);
    const { data, error: err } = await supabase.rpc('authenticate_student', {
      p_name: name,
      p_verify_code: code,
      p_branch_code: branchCode,
    });

    setLoading(false);

    if (err) {
      console.error('authenticate_student 오류:', err);
      setError('인증 중 오류가 발생했습니다.');
      return;
    }
    if (!data || data.length === 0) {
      setError('이름 또는 뒷 4자리가 명부와 일치하지 않습니다.');
      return;
    }

    const s = data[0];
    setStudent(s);

    // 세션 조회
    const { data: sess, error: sessErr } = await supabase.rpc(
      'get_active_session_for_student',
      { p_student_id: s.student_id }
    );

    if (sessErr) {
      console.error('get_active_session_for_student 오류:', sessErr);
      setError('회차 조회 중 오류가 발생했습니다.');
      return;
    }

    if (!sess || sess.length === 0) {
      setSession(null);
      setStep('confirm'); // 회차 없음 안내
      return;
    }

    const active = sess[0];
    setSession(active);

    if (active.already_submitted) {
      setStep('already');
      return;
    }

    setStep('confirm');
  };

  // ------------------------------------------------------------
  // Step 2: 시작 준비 — 문항 로드 + signed URLs
  // ------------------------------------------------------------
  const handleStart = async () => {
    if (!student || !session) return;
    setLoading(true);
    setError('');

    // 트랙 문항 로드 (answer 컬럼은 REVOKE 되어 있어 조회 불가)
    const { data: qs, error: qErr } = await supabase
      .from('metacog_questions')
      .select('q_no, image_url')
      .eq('track', student.track)
      .order('q_no', { ascending: true });

    if (qErr) {
      console.error('문항 로드 실패:', qErr);
      setError('문항을 불러올 수 없습니다.');
      setLoading(false);
      return;
    }
    if (!qs || qs.length === 0) {
      setError('등록된 문항이 없습니다. 관리자에게 문의하세요.');
      setLoading(false);
      return;
    }
    if (qs.length < 60) {
      setError(
        `문항이 부족합니다 (${qs.length}/60). 관리자에게 문의하세요.`
      );
      setLoading(false);
      return;
    }

    // signed URLs 일괄 발급 (60분 유효)
    const paths = qs.map((q) => q.image_url);
    const { data: urls, error: urlErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600);

    if (urlErr) {
      console.error('이미지 URL 발급 실패:', urlErr);
      setError('이미지 URL을 발급할 수 없습니다.');
      setLoading(false);
      return;
    }

    const enriched = qs.map((q, i) => ({
      ...q,
      signedUrl: urls?.[i]?.signedUrl || null,
    }));

    // 첫 3장 사전 로드
    enriched.slice(0, 3).forEach((q) => preloadImage(q.signedUrl));

    setQuestions(enriched);
    setAnswers([]);
    setCurrentIdx(0);
    setTimeLeft(QUESTION_DURATION_SEC);
    beepFiredRef.current = false;
    setStep('test');
    setLoading(false);
  };

  // ------------------------------------------------------------
  // Step 3: 시험 타이머
  // ------------------------------------------------------------
  useEffect(() => {
    if (step !== 'test') return;
    if (currentIdx >= questions.length) return;

    // 다음 2장 미리 프리로드
    if (questions[currentIdx + 1]) preloadImage(questions[currentIdx + 1].signedUrl);
    if (questions[currentIdx + 2]) preloadImage(questions[currentIdx + 2].signedUrl);

    setTimeLeft(QUESTION_DURATION_SEC);
    beepFiredRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next === BEEP_AT_REMAINING_SEC && !beepFiredRef.current) {
          beepFiredRef.current = true;
          playBeep(660, 150);
        }
        if (next <= 0) {
          // 강제 판정: 미판단은 'cannot' (모른다고 보수적으로 처리)
          clearInterval(timerRef.current);
          timerRef.current = null;
          submitAnswer('cannot', true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentIdx, questions.length]);

  const submitAnswer = (judgment, forced = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const q = questions[currentIdx];
    if (!q) return;
    setAnswers((prev) => [
      ...prev,
      { q_no: q.q_no, judgment, forced },
    ]);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      // 마지막 문항 — 제출
      // 답변 배열이 아직 상태에 반영 안됐을 수 있으므로 로컬로 만든 것 사용
      const finalAnswers = [
        ...answers,
        { q_no: q.q_no, judgment, forced },
      ];
      handleSubmitAttempt(finalAnswers);
    } else {
      setCurrentIdx(nextIdx);
    }
  };

  // ------------------------------------------------------------
  // Step 4: 제출
  // ------------------------------------------------------------
  const handleSubmitAttempt = async (finalAnswers) => {
    if (!student || !session) return;
    setSubmitting(true);
    setError('');

    const { data, error: err } = await supabase.rpc('submit_metacog_attempt', {
      p_session_id: session.session_id,
      p_student_id: student.student_id,
      p_answers: finalAnswers,
    });

    setSubmitting(false);

    if (err) {
      console.error('submit_metacog_attempt 오류:', err);
      // 중복 응시 (UNIQUE 위반) 등
      if (err.message?.includes('duplicate') || err.code === '23505') {
        setError('이미 응시가 완료되었습니다.');
        setStep('already');
        return;
      }
      setError('제출 중 오류: ' + err.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setVerifyQNos(row?.verify_q_nos || []);
    setStep('done');

    // 순회식: 8초 후 자동 초기화 (다음 학생을 위해)
    setTimeout(() => {
      resetAll();
    }, DONE_AUTO_RESET_MS);
  };

  // ------------------------------------------------------------
  // 렌더링
  // ------------------------------------------------------------
  const currentQ = questions[currentIdx];
  const progressPct = questions.length
    ? Math.round(((currentIdx + 1) / questions.length) * 100)
    : 0;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {step === 'auth' && (
          <form onSubmit={handleAuth} style={styles.form}>
            <h1 style={styles.title}>메타인지 트레이닝</h1>
            <p style={styles.subtitle}>이름과 학부모 연락처 뒷 4자리를 입력하세요.</p>

            <label style={styles.label}>
              <span>이름</span>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="홍길동"
                style={styles.input}
                autoFocus
              />
            </label>

            <label style={styles.label}>
              <span>학부모 연락처 뒷 4자리</span>
              <input
                type="tel"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                inputMode="numeric"
                maxLength={4}
                style={styles.input}
              />
            </label>

            {error && <div style={styles.errorBox}>{error}</div>}

            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {loading ? '확인 중...' : '확인'}
            </button>

            <div style={styles.hint}>
              지점: <b>{branchCode}</b>
            </div>
          </form>
        )}

        {step === 'confirm' && student && (
          <div style={styles.form}>
            <h1 style={styles.title}>확인해주세요</h1>
            <div style={styles.infoBox}>
              <div style={styles.infoRow}>
                <span>이름</span>
                <b>{student.student_name}</b>
              </div>
              <div style={styles.infoRow}>
                <span>반</span>
                <b>{student.class_name || '-'}</b>
              </div>
              <div style={styles.infoRow}>
                <span>트랙</span>
                <b>{student.track === 'mono' ? '모노' : '트라이'}</b>
              </div>
              <div style={styles.infoRow}>
                <span>지점</span>
                <b>{student.branch_name}</b>
              </div>
            </div>

            {session ? (
              <>
                <div style={styles.sessionBox}>
                  <div style={{ fontSize: '12px', color: '#666' }}>오늘의 회차</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
                    {session.title}
                  </div>
                </div>

                <div style={styles.rules}>
                  <b>안내</b>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>총 <b>60문항</b>, 문항당 <b>10초</b> 이내 판단</li>
                    <li>"풀 수 있다" 또는 "풀 수 없다" 중 하나 선택</li>
                    <li>남은 시간 3초에 알림음이 울립니다</li>
                    <li>시간 초과 시 자동으로 "풀 수 없다"로 저장됩니다</li>
                    <li>제출 후 <b>5문항</b>을 실제로 풀어보게 됩니다</li>
                  </ul>
                </div>

                {error && <div style={styles.errorBox}>{error}</div>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={resetAll}
                    style={styles.secondaryBtn}
                    disabled={loading}
                  >
                    다시 입력
                  </button>
                  <button
                    onClick={handleStart}
                    disabled={loading}
                    style={{ ...styles.primaryBtn, flex: 2 }}
                  >
                    {loading ? '준비 중...' : '시작하기'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.warnBox}>
                  현재 진행 중인 회차가 없습니다.<br />
                  선생님께 문의해주세요.
                </div>
                <button onClick={resetAll} style={styles.primaryBtn}>
                  처음으로
                </button>
              </>
            )}
          </div>
        )}

        {step === 'already' && student && (
          <div style={styles.form}>
            <h1 style={styles.title}>이미 응시 완료</h1>
            <div style={styles.infoBox}>
              <div style={styles.infoRow}>
                <span>이름</span>
                <b>{student.student_name}</b>
              </div>
              <div style={styles.infoRow}>
                <span>반</span>
                <b>{student.class_name || '-'}</b>
              </div>
            </div>
            <div style={styles.warnBox}>
              오늘 회차는 이미 제출되었습니다.<br />
              선생님께 확인해주세요.
            </div>
            <button onClick={resetAll} style={styles.primaryBtn}>
              처음으로
            </button>
          </div>
        )}

        {step === 'test' && currentQ && (
          <div>
            {/* 상단 진행 / 타이머 */}
            <div style={styles.testHeader}>
              <div style={styles.progressLabel}>
                {currentIdx + 1} / {questions.length}
              </div>
              <div
                style={{
                  ...styles.timer,
                  color: timeLeft <= BEEP_AT_REMAINING_SEC ? '#dc2626' : '#1976d2',
                }}
              >
                {timeLeft}초
              </div>
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressPct}%`,
                }}
              />
            </div>

            {/* 문제 이미지 */}
            <div style={styles.imageWrap}>
              {currentQ.signedUrl ? (
                <img
                  src={currentQ.signedUrl}
                  alt={`Q${currentQ.q_no}`}
                  style={styles.image}
                />
              ) : (
                <div style={{ color: '#b91c1c' }}>이미지를 불러올 수 없습니다.</div>
              )}
            </div>

            <div style={styles.qNoBadge}>Q{currentQ.q_no}</div>

            {/* 판정 버튼 */}
            <div style={styles.judgeRow}>
              <button
                onClick={() => submitAnswer('cannot', false)}
                style={{ ...styles.judgeBtn, background: '#ef4444' }}
              >
                풀 수 없다
              </button>
              <button
                onClick={() => submitAnswer('can', false)}
                style={{ ...styles.judgeBtn, background: '#10b981' }}
              >
                풀 수 있다
              </button>
            </div>

            {submitting && (
              <div style={{ textAlign: 'center', marginTop: '16px', color: '#666' }}>
                제출 중...
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div style={styles.form}>
            <h1 style={styles.title}>제출 완료</h1>
            <div style={styles.doneBox}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontSize: '16px', color: '#333' }}>
                수고했습니다!
              </div>
            </div>

            {verifyQNos.length > 0 ? (
              <div style={styles.verifyBox}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  선생님과 함께 아래 문항을 실제로 풀어보세요:
                </div>
                <div style={styles.verifyList}>
                  {verifyQNos.map((n) => (
                    <span key={n} style={styles.verifyChip}>
                      Q{n}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={styles.warnBox}>
                "풀 수 있다"로 판정한 문항이 없어 검증 문항이 없습니다.
              </div>
            )}

            <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '12px' }}>
              잠시 후 처음 화면으로 돌아갑니다...
            </div>
            <button onClick={resetAll} style={styles.secondaryBtn}>
              지금 다시 시작
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// 스타일 (태블릿 세로 화면 최적화)
// ------------------------------------------------------------
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    background: 'white',
    borderRadius: '16px',
    padding: '28px 24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#111',
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '13px',
    color: '#666',
    textAlign: 'center',
    margin: 0,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#333',
    fontWeight: 600,
  },
  input: {
    padding: '12px 14px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
  },
  primaryBtn: {
    padding: '14px',
    background: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    flex: 1,
  },
  secondaryBtn: {
    padding: '14px',
    background: 'white',
    color: '#333',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
  },
  errorBox: {
    padding: '10px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    fontSize: '13px',
  },
  warnBox: {
    padding: '14px',
    background: '#fffbeb',
    border: '1px solid #fbbf24',
    color: '#92400e',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: 1.6,
    textAlign: 'center',
  },
  hint: {
    fontSize: '11px',
    color: '#999',
    textAlign: 'center',
  },
  infoBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#333',
  },
  sessionBox: {
    background: '#eff6ff',
    border: '1px solid #93c5fd',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  rules: {
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#333',
    lineHeight: 1.7,
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '8px',
  },
  progressLabel: { fontSize: '14px', color: '#666', fontWeight: 600 },
  timer: { fontSize: '32px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' },
  progressBar: {
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '14px',
  },
  progressFill: {
    height: '100%',
    background: '#1976d2',
    transition: 'width 200ms',
  },
  imageWrap: {
    background: '#f5f5f5',
    borderRadius: '10px',
    padding: '12px',
    minHeight: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '50vh',
    borderRadius: '4px',
  },
  qNoBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#e0e7ff',
    color: '#3730a3',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: '14px',
  },
  judgeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  judgeBtn: {
    padding: '20px',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '17px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  doneBox: {
    textAlign: 'center',
    padding: '20px',
  },
  verifyBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  verifyList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  verifyChip: {
    padding: '6px 14px',
    background: '#1976d2',
    color: 'white',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 700,
  },
};
