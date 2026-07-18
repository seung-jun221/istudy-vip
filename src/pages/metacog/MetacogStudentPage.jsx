// 메타인지 트레이닝 학생 응시 페이지 (/metacog)
// 프로토타입 UI 톤(다크 브라운/골드) + 실제 시스템 연동(RPC/Storage)
//
// 단계: auth → confirm → intro → sample → test → done | already
// - auth: 이름 + 뒷4자리 명부 대조 (authenticate_student RPC)
// - confirm: "○○○ 학생 맞나요?" (get_active_session_for_student RPC)
// - intro: 규칙 안내 + 시작하기 (프로토타입 인트로 이식)
// - sample: 텍스트 기반 2문항 UX 체험 (결과 저장 안 함, 건너뛰기 가능)
// - test: 60문항 판정 — 10초 + 경고음 + 1초 유예 → 소진 시 'cannot' 강제
// - done: 통계 + 검증 5문항 → 8초 후 자동 초기화

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase';

// ---------- 설정값 ----------
const BUCKET = 'metacog-questions';
const TIME_LIMIT = 10; // 초
const GRACE = 1; // 경고 후 유예 시간(초)
const DONE_AUTO_RESET_MS = 8000;

// 샘플 테스트 (옵션 C: 이미지 없이 텍스트/도형 UX 체험, 결과 저장 안 함)
const SAMPLE_QUESTIONS = [
  {
    key: 's1',
    prompt: '3 + 4 = ?',
    hint: '(연습용 · 실제 검사와 무관)',
  },
  {
    key: 's2',
    prompt: '삼각형 세 각의 합은?',
    hint: '(연습용 · 실제 검사와 무관)',
  },
];

// ---------- 색상 (프로토타입과 동일) ----------
const COLORS = {
  bg: '#1a1410',
  panel: '#241c16',
  brown: '#6b4f3a',
  gold: '#c9a35e',
  goldBright: '#e6c074',
  text: '#f3ece2',
  sub: '#a89a88',
  can: '#3f7d5a',
  cannot: '#a8543f',
  danger: '#d9534f',
};

// ---------- 경고음 (WebAudio, 프로토타입과 동일 로직) ----------
function useBeep() {
  const ctxRef = useRef(null);
  return useCallback(() => {
    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        ctxRef.current = new Ctx();
      }
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      /* silent */
    }
  }, []);
}

// 이미지 프리로드
function preloadImage(url) {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

export default function MetacogStudentPage() {
  const [phase, setPhase] = useState('auth'); // auth | confirm | intro | sample | test | done | already
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 지점 코드 — URL ?branch=xxx 오버라이드, 기본 sajik
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
  const [answers, setAnswers] = useState([]);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [inGrace, setInGrace] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 샘플 상태 (결과 저장 안 함)
  const [sampleIdx, setSampleIdx] = useState(0);
  const [sampleTimeLeft, setSampleTimeLeft] = useState(TIME_LIMIT);
  const [sampleInGrace, setSampleInGrace] = useState(false);

  // 완료 후 결과
  const [verifyQNos, setVerifyQNos] = useState([]);
  const [forcedCount, setForcedCount] = useState(0);

  const beep = useBeep();
  const intervalRef = useRef(null);

  // ------------------------------------------------------------
  // 상태 초기화 (순회식: 완료 후 자동 리셋)
  // ------------------------------------------------------------
  const resetAll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPhase('auth');
    setLoading(false);
    setError('');
    setInputName('');
    setInputCode('');
    setStudent(null);
    setSession(null);
    setQuestions([]);
    setAnswers([]);
    setIdx(0);
    setTimeLeft(TIME_LIMIT);
    setInGrace(false);
    setSampleIdx(0);
    setSampleTimeLeft(TIME_LIMIT);
    setSampleInGrace(false);
    setSubmitting(false);
    setVerifyQNos([]);
    setForcedCount(0);
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

    if (err) {
      setLoading(false);
      console.error('authenticate_student 오류:', err);
      setError('인증 중 오류가 발생했습니다.');
      return;
    }
    if (!data || data.length === 0) {
      setLoading(false);
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

    setLoading(false);

    if (sessErr) {
      console.error('get_active_session_for_student 오류:', sessErr);
      setError('회차 조회 중 오류가 발생했습니다.');
      return;
    }

    if (!sess || sess.length === 0) {
      setSession(null);
      setPhase('confirm');
      return;
    }

    const active = sess[0];
    setSession(active);

    if (active.already_submitted) {
      setPhase('already');
      return;
    }
    setPhase('confirm');
  };

  // ------------------------------------------------------------
  // Step 2: 확인 후 인트로 (문항 사전 로드는 인트로 시작 시)
  // ------------------------------------------------------------
  const handleConfirmYes = async () => {
    if (!student || !session) return;
    setLoading(true);
    setError('');

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
    if (!qs || qs.length < 60) {
      setError(`문항이 부족합니다 (${qs?.length || 0}/60). 관리자에게 문의하세요.`);
      setLoading(false);
      return;
    }

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

    enriched.slice(0, 3).forEach((q) => preloadImage(q.signedUrl));
    setQuestions(enriched);
    setLoading(false);
    setPhase('intro');
  };

  // ------------------------------------------------------------
  // Step 3: 샘플 시작
  // ------------------------------------------------------------
  const startSample = () => {
    setSampleIdx(0);
    setSampleTimeLeft(TIME_LIMIT);
    setSampleInGrace(false);
    setPhase('sample');
  };

  const skipSample = () => {
    startTest();
  };

  // ------------------------------------------------------------
  // Step 4: 본검사 시작
  // ------------------------------------------------------------
  const startTest = () => {
    setIdx(0);
    setAnswers([]);
    setTimeLeft(TIME_LIMIT);
    setInGrace(false);
    setPhase('test');
  };

  // ------------------------------------------------------------
  // 본검사 타이머 (프로토타입 로직: 10초 → 경고음 + 1초 유예 → 강제 cannot)
  // ------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'test') return;
    setTimeLeft(TIME_LIMIT);
    setInGrace(false);
    let t = TIME_LIMIT;
    let warned = false;

    intervalRef.current = setInterval(() => {
      t -= 0.1;
      if (t <= 0 && !warned) {
        warned = true;
        beep();
        setInGrace(true);
        t = GRACE;
      } else if (warned && t <= 0) {
        clearInterval(intervalRef.current);
        chooseTest('cannot', true);
        return;
      }
      setTimeLeft(Math.max(0, t));
    }, 100);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  // 다음 2장 프리로드
  useEffect(() => {
    if (phase !== 'test') return;
    if (questions[idx + 1]) preloadImage(questions[idx + 1].signedUrl);
    if (questions[idx + 2]) preloadImage(questions[idx + 2].signedUrl);
  }, [phase, idx, questions]);

  const chooseTest = (judgment, forced = false) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const q = questions[idx];
    if (!q) return;
    const next = [...answers, { q_no: q.q_no, judgment, forced }];
    setAnswers(next);
    if (idx + 1 >= questions.length) {
      submitAttempt(next);
    } else {
      setIdx(idx + 1);
    }
  };

  // ------------------------------------------------------------
  // 샘플 타이머 (본검사와 동일 로직, 결과는 저장 안 함)
  // ------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'sample') return;
    setSampleTimeLeft(TIME_LIMIT);
    setSampleInGrace(false);
    let t = TIME_LIMIT;
    let warned = false;

    intervalRef.current = setInterval(() => {
      t -= 0.1;
      if (t <= 0 && !warned) {
        warned = true;
        beep();
        setSampleInGrace(true);
        t = GRACE;
      } else if (warned && t <= 0) {
        clearInterval(intervalRef.current);
        chooseSample('cannot');
        return;
      }
      setSampleTimeLeft(Math.max(0, t));
    }, 100);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sampleIdx]);

  const chooseSample = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const nextI = sampleIdx + 1;
    if (nextI >= SAMPLE_QUESTIONS.length) {
      // 샘플 종료 → 본검사 시작
      startTest();
    } else {
      setSampleIdx(nextI);
    }
  };

  // ------------------------------------------------------------
  // 제출
  // ------------------------------------------------------------
  const submitAttempt = async (finalAnswers) => {
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
      if (err.message?.includes('duplicate') || err.code === '23505') {
        setError('이미 응시가 완료되었습니다.');
        setPhase('already');
        return;
      }
      setError('제출 중 오류: ' + err.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setVerifyQNos(row?.verify_q_nos || []);
    setForcedCount(finalAnswers.filter((a) => a.forced).length);
    setPhase('done');

    setTimeout(() => resetAll(), DONE_AUTO_RESET_MS);
  };

  // ============================================================
  // 렌더
  // ============================================================
  return (
    <div style={S.outer}>
      <div style={S.card}>
        {phase === 'auth' && renderAuth()}
        {phase === 'confirm' && renderConfirm()}
        {phase === 'intro' && renderIntro()}
        {phase === 'sample' && renderSample()}
        {phase === 'test' && renderTest()}
        {phase === 'done' && renderDone()}
        {phase === 'already' && renderAlready()}
      </div>
    </div>
  );

  // ---------- 화면들 ----------
  function renderAuth() {
    return (
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={S.badge}>메타인지 트레이닝</div>
        <h1 style={S.h1}>본인 확인</h1>
        <p style={S.lead}>이름과 학부모 연락처 뒷 4자리를 입력하세요.</p>

        <label style={S.field}>
          <span style={S.fieldLabel}>이름</span>
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="홍길동"
            style={S.input}
            autoFocus
          />
        </label>

        <label style={S.field}>
          <span style={S.fieldLabel}>학부모 연락처 뒷 4자리</span>
          <input
            type="tel"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            style={S.input}
          />
        </label>

        {error && <div style={S.errorBox}>{error}</div>}

        <button type="submit" disabled={loading} style={{ ...S.startBtn, opacity: loading ? 0.6 : 1 }}>
          {loading ? '확인 중...' : '확인 →'}
        </button>

        <div style={S.hint}>
          지점 코드: <b style={{ color: COLORS.goldBright }}>{branchCode}</b>
        </div>
      </form>
    );
  }

  function renderConfirm() {
    if (!student) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={S.badge}>학생 확인</div>
        <h1 style={S.h1}>{student.student_name} 학생 맞나요?</h1>

        <div style={S.infoBox}>
          <div style={S.infoRow}>
            <span style={{ color: COLORS.sub }}>반</span>
            <b style={{ color: COLORS.text }}>{student.class_name || '-'}</b>
          </div>
          <div style={S.infoRow}>
            <span style={{ color: COLORS.sub }}>트랙</span>
            <b style={{ color: COLORS.text }}>{student.track === 'mono' ? '모노' : '트라이'}</b>
          </div>
          <div style={S.infoRow}>
            <span style={{ color: COLORS.sub }}>지점</span>
            <b style={{ color: COLORS.text }}>{student.branch_name}</b>
          </div>
        </div>

        {session ? (
          <div style={S.sessionBox}>
            <div style={{ color: COLORS.sub, fontSize: 12, marginBottom: 4 }}>오늘의 회차</div>
            <div style={{ color: COLORS.goldBright, fontSize: 16, fontWeight: 700 }}>
              {session.title}
            </div>
          </div>
        ) : (
          <div style={S.warnBox}>
            현재 진행 중인 회차가 없습니다.<br />
            선생님께 문의해주세요.
          </div>
        )}

        {error && <div style={S.errorBox}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={resetAll} style={S.secondaryBtn} disabled={loading}>
            아니요, 다시
          </button>
          <button
            onClick={handleConfirmYes}
            disabled={loading || !session}
            style={{
              ...S.startBtn,
              flex: 2,
              opacity: loading || !session ? 0.5 : 1,
            }}
          >
            {loading ? '준비 중...' : '네, 맞아요 →'}
          </button>
        </div>
      </div>
    );
  }

  function renderIntro() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={S.badge}>메타인지 트레이닝</div>
        <h1 style={S.h1}>
          안다고 착각하는 것 vs&emsp;진짜 아는 것
        </h1>
        <p style={S.lead}>
          각 문항을 보고 <b style={{ color: COLORS.goldBright }}>10초 안에</b> 스스로 판단하세요.
        </p>

        <div style={S.ruleBox}>
          {[
            ['①', '문항당 10초. 시간이 지나면 경고음이 울리고 1초 뒤 자동으로 \'없다\' 처리됩니다.'],
            ['②', '한 번 선택하면 되돌릴 수 없습니다.'],
            ['③', '\'없다\'로 고른 문항은 전부 복습 과제로 나갑니다.'],
            ['④', '\'있다\'로 고른 문항 중 5개를 뽑아 실제로 풀어봅니다. 틀리면 1문항당 20문항 추가 과제!'],
            ['⑤', '그러니 \'될 것 같다\'가 아니라 \'확실히 풀 수 있다\'일 때만 \'있다\'를 누르세요.'],
          ].map(([n, txt]) => (
            <div key={n} style={S.rule}>
              <span style={S.ruleNum}>{n}</span>
              <span style={S.ruleTxt}>{txt}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button onClick={skipSample} style={{ ...S.secondaryBtn, flex: 1 }}>
            연습 건너뛰기
          </button>
          <button onClick={startSample} style={{ ...S.startBtn, flex: 2 }}>
            연습 후 시작하기 →
          </button>
        </div>
        <p style={{ ...S.hint, marginTop: 4 }}>
          연습은 2문항이며 결과에 반영되지 않습니다.
        </p>
      </div>
    );
  }

  function renderSample() {
    const sq = SAMPLE_QUESTIONS[sampleIdx];
    if (!sq) return null;
    const pct = (sampleTimeLeft / (sampleInGrace ? GRACE : TIME_LIMIT)) * 100;
    const ringColor = sampleInGrace
      ? COLORS.danger
      : sampleTimeLeft <= 3
      ? COLORS.goldBright
      : COLORS.gold;

    return (
      <div>
        <div style={{ ...S.badge, marginBottom: 10 }}>연습 · 결과 저장 안 함</div>
        <div style={S.judgeTop}>
          <span style={S.prog}>연습 {sampleIdx + 1} / {SAMPLE_QUESTIONS.length}</span>
          <div style={S.timerWrap}>
            <div
              style={{
                ...S.timerBar,
                width: `${pct}%`,
                background: ringColor,
                transition: 'width 0.1s linear, background 0.3s',
              }}
            />
          </div>
          <span style={{ ...S.sec, color: ringColor }}>
            {sampleInGrace ? '강제 선택!' : `${Math.ceil(sampleTimeLeft)}초`}
          </span>
        </div>

        <div style={S.qcard}>
          <div style={S.qnum}>연습</div>
          <div style={{ ...S.sampleText }}>{sq.prompt}</div>
          <div style={{ color: COLORS.sub, fontSize: 12 }}>{sq.hint}</div>
        </div>

        {sampleInGrace && (
          <div style={S.warn}>⚠ 시간 초과 — 지금 바로 선택하세요</div>
        )}

        <div style={S.choiceRow}>
          <button
            onClick={() => chooseSample('can')}
            style={{ ...S.choiceBtn, background: COLORS.can }}
          >
            <div style={S.choiceIcon}>✓</div>
            <div style={S.choiceLabel}>풀 수 있다</div>
            <div style={S.choiceSub}>확실할 때만</div>
          </button>
          <button
            onClick={() => chooseSample('cannot')}
            style={{ ...S.choiceBtn, background: COLORS.cannot }}
          >
            <div style={S.choiceIcon}>✗</div>
            <div style={S.choiceLabel}>없다</div>
            <div style={S.choiceSub}>복습 과제로</div>
          </button>
        </div>

        <button onClick={skipSample} style={{ ...S.linkBtn, marginTop: 14 }}>
          연습 그만두고 본 검사 시작 →
        </button>
      </div>
    );
  }

  function renderTest() {
    const q = questions[idx];
    if (!q) return null;
    const pct = (timeLeft / (inGrace ? GRACE : TIME_LIMIT)) * 100;
    const ringColor = inGrace
      ? COLORS.danger
      : timeLeft <= 3
      ? COLORS.goldBright
      : COLORS.gold;

    return (
      <div>
        <div style={S.judgeTop}>
          <span style={S.prog}>문항 {idx + 1} / {questions.length}</span>
          <div style={S.timerWrap}>
            <div
              style={{
                ...S.timerBar,
                width: `${pct}%`,
                background: ringColor,
                transition: 'width 0.1s linear, background 0.3s',
              }}
            />
          </div>
          <span style={{ ...S.sec, color: ringColor }}>
            {inGrace ? '강제 선택!' : `${Math.ceil(timeLeft)}초`}
          </span>
        </div>

        <div style={S.qcard}>
          <div style={S.qnum}>Q{q.q_no}</div>
          {q.signedUrl ? (
            <img
              src={q.signedUrl}
              alt={`Q${q.q_no}`}
              style={{ maxWidth: '100%', maxHeight: '50vh', borderRadius: 6 }}
            />
          ) : (
            <div style={S.placeholder}>이미지를 불러올 수 없습니다.</div>
          )}
        </div>

        {inGrace && (
          <div style={S.warn}>⚠ 시간 초과 — 지금 바로 선택하세요</div>
        )}

        <div style={S.choiceRow}>
          <button
            onClick={() => chooseTest('can')}
            style={{ ...S.choiceBtn, background: COLORS.can }}
            disabled={submitting}
          >
            <div style={S.choiceIcon}>✓</div>
            <div style={S.choiceLabel}>풀 수 있다</div>
            <div style={S.choiceSub}>확실할 때만</div>
          </button>
          <button
            onClick={() => chooseTest('cannot')}
            style={{ ...S.choiceBtn, background: COLORS.cannot }}
            disabled={submitting}
          >
            <div style={S.choiceIcon}>✗</div>
            <div style={S.choiceLabel}>없다</div>
            <div style={S.choiceSub}>복습 과제로</div>
          </button>
        </div>

        {submitting && (
          <div style={{ textAlign: 'center', marginTop: 16, color: COLORS.sub }}>
            제출 중...
          </div>
        )}
      </div>
    );
  }

  function renderDone() {
    const canCount = answers.filter((a) => a.judgment === 'can').length;
    const cannotCount = answers.filter((a) => a.judgment === 'cannot').length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={S.badge}>제출 완료</div>
        <h1 style={{ ...S.h1, fontSize: 30 }}>너 자신을 본 결과</h1>

        <div style={S.statRow}>
          <div style={S.stat}>
            <div style={{ ...S.statNum, color: COLORS.can }}>{canCount}</div>
            <div style={S.statLabel}>풀 수 있다</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statNum, color: COLORS.cannot }}>{cannotCount}</div>
            <div style={S.statLabel}>없다 → 과제</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statNum, color: COLORS.gold }}>{verifyQNos.length}</div>
            <div style={S.statLabel}>랜덤 검증</div>
          </div>
        </div>

        {forcedCount > 0 && (
          <p style={S.forcedNote}>⏱ 시간 초과로 자동 처리된 문항: {forcedCount}개</p>
        )}

        <div style={S.verifyBox}>
          <div style={S.verifyTitle}>검증 대상 문항 (실제로 풀어봅니다)</div>
          <div style={S.verifyList}>
            {verifyQNos.length > 0 ? (
              verifyQNos.map((n) => (
                <span key={n} style={S.chip}>Q{n}</span>
              ))
            ) : (
              <span style={{ color: COLORS.sub }}>'있다'로 고른 문항이 없습니다</span>
            )}
          </div>
          <p style={S.verifyNote}>
            이 중 틀린 1문항당 20문항의 추가 과제가 부과됩니다.
          </p>
        </div>

        <p style={{ ...S.hint, marginTop: 14 }}>
          잠시 후 처음 화면으로 돌아갑니다...
        </p>
        <button onClick={resetAll} style={S.secondaryBtn}>
          지금 다시 시작
        </button>
      </div>
    );
  }

  function renderAlready() {
    if (!student) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={S.badge}>이미 응시 완료</div>
        <h1 style={S.h1}>오늘 회차는 제출됨</h1>
        <div style={S.infoBox}>
          <div style={S.infoRow}>
            <span style={{ color: COLORS.sub }}>이름</span>
            <b style={{ color: COLORS.text }}>{student.student_name}</b>
          </div>
          <div style={S.infoRow}>
            <span style={{ color: COLORS.sub }}>반</span>
            <b style={{ color: COLORS.text }}>{student.class_name || '-'}</b>
          </div>
        </div>
        <div style={S.warnBox}>
          오늘 회차는 이미 제출되었습니다.<br />
          선생님께 확인해주세요.
        </div>
        <button onClick={resetAll} style={S.startBtn}>
          처음으로
        </button>
      </div>
    );
  }
}

// ============================================================
// 스타일 (프로토타입 이식)
// ============================================================
const S = {
  outer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `radial-gradient(circle at 30% 20%, #2a2018, ${COLORS.bg})`,
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', 'Noto Sans KR', sans-serif",
    padding: 20,
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    background: COLORS.panel,
    borderRadius: 24,
    padding: '36px 32px',
    border: `1px solid ${COLORS.brown}`,
    boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
  },
  badge: {
    display: 'inline-block',
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
    borderBottom: `2px solid ${COLORS.gold}`,
    paddingBottom: 4,
    alignSelf: 'flex-start',
  },
  h1: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1.35,
    margin: '0 0 18px',
  },
  lead: {
    color: COLORS.sub,
    fontSize: 15,
    lineHeight: 1.6,
    margin: '0 0 20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: 600,
  },
  input: {
    padding: '12px 14px',
    fontSize: 16,
    color: COLORS.text,
    background: 'rgba(0,0,0,0.3)',
    border: `1px solid ${COLORS.brown}`,
    borderRadius: 10,
    outline: 'none',
  },
  errorBox: {
    padding: '10px 12px',
    background: 'rgba(217,83,79,0.15)',
    border: `1px solid ${COLORS.danger}`,
    color: '#ffb8b5',
    borderRadius: 10,
    fontSize: 13,
  },
  warnBox: {
    padding: 14,
    background: 'rgba(201,163,94,0.10)',
    border: `1px solid ${COLORS.brown}`,
    color: COLORS.goldBright,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  hint: {
    color: COLORS.sub,
    fontSize: 12,
    textAlign: 'center',
    margin: 0,
  },
  infoBox: {
    background: 'rgba(0,0,0,0.25)',
    border: `1px solid ${COLORS.brown}`,
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
  },
  sessionBox: {
    background: 'rgba(201,163,94,0.08)',
    border: `1px solid ${COLORS.brown}`,
    borderRadius: 12,
    padding: '12px 16px',
  },
  ruleBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: 'rgba(0,0,0,0.2)',
    padding: '18px 16px',
    borderRadius: 14,
  },
  rule: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  ruleNum: {
    color: COLORS.goldBright,
    fontWeight: 800,
    fontSize: 15,
    flexShrink: 0,
    width: 18,
  },
  ruleTxt: {
    color: COLORS.text,
    fontSize: 13.5,
    lineHeight: 1.5,
  },
  startBtn: {
    marginTop: 8,
    width: '100%',
    padding: '16px',
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.bg,
    background: `linear-gradient(135deg, ${COLORS.goldBright}, ${COLORS.gold})`,
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    boxShadow: `0 8px 24px rgba(201,163,94,0.3)`,
  },
  secondaryBtn: {
    padding: '14px',
    background: 'transparent',
    color: COLORS.sub,
    border: `1px solid ${COLORS.brown}`,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  linkBtn: {
    background: 'transparent',
    color: COLORS.sub,
    border: 'none',
    padding: '8px',
    fontSize: 12.5,
    cursor: 'pointer',
    textDecoration: 'underline',
    width: '100%',
  },
  judgeTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  prog: {
    color: COLORS.sub,
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  timerWrap: {
    flex: 1,
    height: 10,
    background: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    borderRadius: 6,
  },
  sec: {
    fontSize: 15,
    fontWeight: 800,
    flexShrink: 0,
    minWidth: 64,
    textAlign: 'right',
  },
  qcard: {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    padding: 24,
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    border: `1px dashed ${COLORS.brown}`,
  },
  qnum: {
    color: COLORS.goldBright,
    fontSize: 38,
    fontWeight: 800,
  },
  placeholder: {
    color: COLORS.sub,
    fontSize: 14,
    textAlign: 'center',
    whiteSpace: 'pre-line',
    lineHeight: 1.6,
  },
  sampleText: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: 700,
    textAlign: 'center',
    padding: '20px 10px',
  },
  warn: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    margin: '16px 0 0',
  },
  choiceRow: {
    display: 'flex',
    gap: 14,
    marginTop: 22,
  },
  choiceBtn: {
    flex: 1,
    padding: '20px 12px',
    border: 'none',
    borderRadius: 16,
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
  },
  choiceIcon: {
    fontSize: 28,
    fontWeight: 800,
  },
  choiceLabel: {
    fontSize: 18,
    fontWeight: 800,
  },
  choiceSub: {
    fontSize: 12,
    opacity: 0.85,
  },
  statRow: {
    display: 'flex',
    gap: 12,
    margin: '20px 0',
  },
  stat: {
    flex: 1,
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    padding: '18px 8px',
    textAlign: 'center',
  },
  statNum: {
    fontSize: 34,
    fontWeight: 800,
  },
  statLabel: {
    color: COLORS.sub,
    fontSize: 12.5,
    marginTop: 4,
  },
  forcedNote: {
    color: COLORS.sub,
    fontSize: 13,
    textAlign: 'center',
    margin: '0 0 8px',
  },
  verifyBox: {
    background: 'rgba(201,163,94,0.08)',
    border: `1px solid ${COLORS.brown}`,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  verifyTitle: {
    color: COLORS.goldBright,
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
  },
  verifyList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    background: COLORS.brown,
    color: COLORS.text,
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 700,
  },
  verifyNote: {
    color: COLORS.sub,
    fontSize: 13,
    lineHeight: 1.5,
    margin: '14px 0 0',
  },
};
