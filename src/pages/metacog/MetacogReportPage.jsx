// v2 학부모용 메타인지 결과 리포트 (점수제)
// - 라우트: /metacog-report/:attemptId
// - UUID = 인증 (진단검사 리포트와 동일 정책, anon 접근 허용)
// - 4분면 시각화 제거 → 점수·등급 중심
// - 채점 미완료/측정유보 케이스 각각 안내

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import './MetacogReportPage.css';

function formatKoreanDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 응시`;
}

// 등급별 색상/설명 (SQL의 grade cut과 매칭)
function gradeInfo(grade) {
  switch (grade) {
    case '매우우수':
      return { color: '#1a7a4a', bg: '#dbeee2', label: '매우 우수' };
    case '우수':
      return { color: '#2b8a86', bg: '#e8f3ec', label: '우수' };
    case '보통':
      return { color: '#c89216', bg: '#fdf4e3', label: '보통' };
    case '미흡':
      return { color: '#c0692e', bg: '#fbece8', label: '미흡' };
    case '매우미흡':
      return { color: '#a8543f', bg: '#fbe4dd', label: '매우 미흡' };
    default:
      return { color: '#666', bg: '#f0f0f0', label: grade || '-' };
  }
}

export default function MetacogReportPage() {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: result, error: err } = await supabase.rpc(
        'get_metacog_report',
        { p_attempt_id: attemptId }
      );
      if (err || !result) {
        if (!cancelled) {
          setError(err?.message || '리포트를 불러올 수 없습니다.');
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="mr-loading">
        <div>리포트 준비 중...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mr-loading">
        <div>
          ❌ {error || '리포트를 찾을 수 없습니다.'}<br />
          <span style={{ fontSize: 12, color: '#999', marginTop: 8, display: 'block' }}>
            링크를 다시 확인해주세요.
          </span>
        </div>
      </div>
    );
  }

  const { student, session, stats, score, cannot_qnos, submitted_at } = data;
  const isScored = score?.is_scored === true;
  const isReserved = score?.is_reserved === true;
  const gInfo = gradeInfo(score?.grade);

  return (
    <div className="mr-body">
      <div className="mr-sheet">
        {/* 헤더 */}
        <div className="mr-head">
          <span className="mr-badge">수리탐구 메타인지 트레이닝</span>
          <h1>
            <span className="mr-l1">메타인지 트레이닝</span>
            <br />
            <span className="mr-l2">결과 분석 보고서</span>
          </h1>
          <div className="mr-desc">
            우리 아이가 자기 실력을 얼마나 정확히<br />
            파악하고 있는지 진단한 결과입니다.
          </div>
          <div className="mr-who">
            <span>
              학생 <b>{student.name}</b>
              {student.class_name ? ` · ${student.class_name}` : ''}
            </span>
            <span>{formatKoreanDate(submitted_at)}</span>
          </div>
        </div>

        {/* 핵심 한 문장 */}
        <div className="mr-summary">
          <div className="mr-summary-label">한눈에 보기</div>
          {isReserved ? (
            <p>
              <b>{student.name} 학생</b>은<br />
              이번 회차는 <span className="mr-hl"><b>기초 학습이 더 필요한 단계</b></span>로 판단되어<br />
              점수 산출은 유보합니다. 복습 과제를 통해 다져나가겠습니다.
            </p>
          ) : isScored ? (
            <p>
              <b>{student.name} 학생</b>의<br />
              이번 메타인지 결과는{' '}
              <span className="mr-hl"><b>{score.final_score}점 ({gInfo.label})</b></span>입니다.
            </p>
          ) : (
            <p>
              <b>{student.name} 학생</b>은<br />
              {stats.total_count}문항 중 <b>{stats.can_count}문항</b>을 "풀 수 있다"고 판단했습니다.<br />
              누테 시험 채점이 완료되면 <span className="mr-hl">점수와 등급</span>이 표시됩니다.
            </p>
          )}
        </div>

        {/* 점수 카드 (측정유보/채점대기 상태별 분기) */}
        <div className="mr-section">
          <div className="mr-stitle">이번 회차 결과</div>
          <div className="mr-ssub">
            누테 25문항 채점 결과와 자기 판단을 종합한 점수입니다.
          </div>

          {isScored ? (
            <div className="mr-score-card" style={{ background: gInfo.bg }}>
              <div className="mr-score-num" style={{ color: gInfo.color }}>
                {score.final_score}
                <span className="mr-score-unit">/ 100</span>
              </div>
              <div className="mr-score-grade" style={{ color: gInfo.color }}>
                {gInfo.label}
              </div>
              <div className="mr-score-detail">
                기본 점수 <b>{score.base_score}</b> ×{' '}
                누테 정답률 <b>{score.nute_can_correct}/{score.nute_can}</b>{' '}
                = 최종 <b>{score.final_score}</b>점
              </div>
            </div>
          ) : isReserved ? (
            <div className="mr-score-card mr-score-reserved">
              <div className="mr-score-reserved-title">측정 유보</div>
              <div className="mr-score-reserved-desc">
                {score.reserved_reason === '누테 25문항 중 안다 판정이 없음'
                  ? "이번 회차는 '안다'로 판단한 누테 문항이 없어 점수 산출을 유보합니다."
                  : "이번 회차는 모르는 문항 비중이 높아 점수 산출을 유보합니다."}
                <br />
                복습 과제로 기초를 다진 후 다음 회차에 다시 측정하겠습니다.
              </div>
            </div>
          ) : (
            <div className="mr-pending">
              누테 시험 채점 완료 후 이 곳에 점수와 등급이 표시됩니다.
            </div>
          )}
        </div>

        {/* 통계 3칸 */}
        <div className="mr-stats">
          <div className="mr-stat">
            <div className="mr-num">{stats.can_count}</div>
            <div className="mr-lb">풀 수 있다</div>
          </div>
          <div className="mr-stat">
            <div className="mr-num">{stats.cannot_count}</div>
            <div className="mr-lb">모르겠다</div>
          </div>
          <div className="mr-stat mr-warn">
            <div className="mr-num">{stats.forced_count}</div>
            <div className="mr-lb">시간초과<br />(판단 못함)</div>
          </div>
        </div>

        {/* 처방 */}
        <div className="mr-section">
          <div className="mr-stitle">이렇게 지도합니다</div>
          <div className="mr-ssub">진단으로 끝나지 않습니다. 결과에 맞춰 과제를 처방합니다.</div>

          <div className="mr-rx-item">
            <div className="mr-rx-ic">1</div>
            <div className="mr-rx-tx">
              <div className="mr-rt">복습 과제 · {stats.cannot_count}문항</div>
              <div className="mr-rd">
                "모르겠다"고 답한 문항 전체를 복습 과제로 제공합니다.
              </div>
            </div>
          </div>

          {isScored && score.nute_can_correct < score.nute_can && (
            <div className="mr-rx-item">
              <div className="mr-rx-ic">2</div>
              <div className="mr-rx-tx">
                <div className="mr-rt">
                  확인 학습 · {score.nute_can - score.nute_can_correct}문항
                </div>
                <div className="mr-rd">
                  "안다"고 판단했으나 실제로 틀린 문항(<b>{score.nute_can - score.nute_can_correct}문항</b>)은
                  개념을 다시 짚어드립니다.
                </div>
              </div>
            </div>
          )}

          {isReserved && (
            <div className="mr-rx-item">
              <div className="mr-rx-ic">2</div>
              <div className="mr-rx-tx">
                <div className="mr-rt">기초 다지기</div>
                <div className="mr-rd">
                  이번 회차의 복습 과제를 완료한 후, 다음 회차에서 재측정합니다.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 마무리 */}
        <div className="mr-closing">
          <div className="mr-ct">점수보다 중요한 것</div>
          <p>
            성적표의 점수는 "지금 몇 점인가"를 말합니다.
            메타인지 진단은 "아이가 자기 실력을 정확히 아는가"를 봅니다.
            자기 실력을 아는 아이가 스스로 공부의 방향을 잡습니다.
            저희는 주기적으로 이 능력을 훈련합니다.
          </p>
          <div className="mr-foot">
            i.study 수리탐구학원<br />
            본 진단은 누테 25문항 채점 결과 기반이며, 참고 지표입니다.
          </div>
        </div>

        {cannot_qnos && cannot_qnos.length > 0 && (
          <details className="mr-details">
            <summary>복습 과제 문항번호 보기 ({cannot_qnos.length}개)</summary>
            <div className="mr-qnos">
              {cannot_qnos.map((n) => (
                <span key={n} className="mr-qno-chip">Q{n}</span>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
