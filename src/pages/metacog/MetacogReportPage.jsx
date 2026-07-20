// v2 학부모 메타인지 리포트 — 최종 시안 반영
// - 확정 리포트: 7d45f228-*.html (SVG 도넛 + 계산 분해 + 두 축 게이지 + 유형 카드)
// - 유보 리포트: 736401d7-*.html (🌱 히어로 + 왜 점수 안 냈나 설명)
// - 채점 대기: 간단 안내

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import './MetacogReportPage.css';

function formatKoreanDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 응시`;
}

// 점수(0~100) → 등급 라벨/색상
function scoreGrade(v) {
  if (v >= 85) return { label: '매우우수', color: '#1a7a4a' };
  if (v >= 75) return { label: '우수', color: '#1a7a4a' };
  if (v >= 60) return { label: '보통', color: '#c0692e' };
  if (v >= 50) return { label: '미흡', color: '#c0692e' };
  return { label: '매우미흡', color: '#a8543f' };
}

// 정확도(0~1) → 등급 (실제로 같은 컷을 %로)
function accuracyGrade(v) {
  return scoreGrade(v * 100);
}

// 자기인식 유형(정확도 기준)
function selfAwarenessType(accuracy) {
  if (accuracy >= 0.75) {
    return {
      title: '자기 실력을 잘 아는 유형입니다',
      color: '#2b8a86',
      bg: '#e8f3ec',
      desc: '"안다"고 한 것을 실제로 맞히는 비율이 높습니다. 자기 실력을 정확히 파악하고 있어, 모르는 영역만 채우면 점수가 빠르게 오를 수 있는 상태입니다.',
    };
  }
  if (accuracy >= 0.60) {
    return {
      title: '자기 실력을 대체로 파악하는 유형입니다',
      color: '#c89216',
      bg: '#fdf4e3',
      desc: '"안다"고 한 것 중 상당수를 실제로 맞혔습니다. 판단이 맞을 때가 많으나, 확신이 부족한 문항도 있어 개념 정리가 더해지면 도움이 됩니다.',
    };
  }
  if (accuracy >= 0.5) {
    return {
      title: '자기 판단이 절반쯤 맞는 유형입니다',
      color: '#b5541f',
      bg: '#fbece8',
      desc: '"안다"고 한 것과 실제로 아는 것 사이에 차이가 있습니다. 아는 것을 확실히 구별하는 훈련이 필요합니다.',
    };
  }
  return {
    title: '자기 판단이 실제와 자주 어긋나는 유형입니다',
    color: '#a8543f',
    bg: '#fbe4dd',
    desc: '"안다"고 판단한 문항의 상당수를 실제로 틀렸습니다. 기초 개념을 다시 짚고, "확실할 때만 안다"고 말하는 훈련이 필요합니다.',
  };
}

// 한 줄 해석 4분기 — finalScore 기준 정렬
// (학부모가 보는 종합 점수와 해석 문구가 항상 같은 방향)
//  1분기: final ≥ 75             → 우수
//  2분기: 60 ≤ final < 75 + 정확도 우세 → 자기 실력 파악은 정확
//  3분기: 60 ≤ final < 75 + 실력 우세   → 많이 알지만 판단 정확도
//  4분기: final < 60             → 기초부터
function oneLineText({ studentName, baseScore, accuracy, finalScore }) {
  const accPct = accuracy * 100;

  // 1분기 — 우수
  if (finalScore >= 75) {
    return (
      <>
        {studentName} 학생은 <b>많은 문항을 알고, "안다"고 한 것을 실제로도 잘 맞혔습니다.</b>{' '}
        실력과 자기인식 모두 <span className="mr-hl">우수한 수준</span>입니다.
      </>
    );
  }

  // 60 ≤ final < 75 — 보통 구간에서 정확도 vs 실력 상대 우열로 분기
  if (finalScore >= 60) {
    if (accPct >= baseScore) {
      // 2분기 — 정확도 우세
      return (
        <>
          {studentName} 학생은 <b>"안다"고 한 문항을 실제로 대부분 맞혀</b>{' '}
          <span className="mr-hl">자기 실력 파악은 정확</span>한 편입니다.
          다만 아직 <b>모르는 문항이 남아 있어</b> 종합 점수는 {finalScore}점으로 나타났습니다.
        </>
      );
    }
    // 3분기 — 실력 우세(실력은 있으나 판단 정확도 낮음)
    return (
      <>
        {studentName} 학생은 <b>배운 문항 대부분을 알고 있지만,</b>{' '}
        "안다"고 한 것 중 <span className="mr-hl">틀린 문항이 있어</span>{' '}
        종합 점수는 {finalScore}점으로 나타났습니다.
        자기 판단의 정확도를 높이는 연습이 필요합니다.
      </>
    );
  }

  // 4분기 — 미흡(final < 60)
  return (
    <>
      {studentName} 학생은 <b>아직 모르는 문항이 많고,</b>{' '}
      "안다"고 한 것도 <span className="mr-hl">실제와 어긋난 경우가 있어</span>{' '}
      종합 점수는 {finalScore}점으로 나타났습니다. 기초부터 함께 다져가겠습니다.
    </>
  );
}

// SVG 도넛 게이지 (원둘레 452 기반)
const RING_CIRC = 452;
function ScoreRing({ score, color = '#0D3B2E' }) {
  const clamped = Math.max(0, Math.min(100, score));
  const offset = RING_CIRC * (1 - clamped / 100);
  return (
    <div className="mr-score-ring">
      <svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r="72" fill="none" stroke="#e5ddcb" strokeWidth="14" />
        <circle
          cx="85"
          cy="85"
          r="72"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={offset}
          transform="rotate(-90 85 85)"
        />
      </svg>
      <div className="mr-score-num">
        <span className="mr-score-n">{score}</span>
        <span className="mr-score-u">점</span>
      </div>
    </div>
  );
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

  const grade = useMemo(() => (data ? scoreGrade(data.score?.final_score || 0) : null), [data]);
  const skillGrade = useMemo(() => (data ? scoreGrade(data.score?.base_score || 0) : null), [data]);
  const accGrade = useMemo(
    () => (data && data.score?.accuracy != null ? accuracyGrade(data.score.accuracy) : null),
    [data]
  );
  const type = useMemo(
    () => (data && data.score?.accuracy != null ? selfAwarenessType(data.score.accuracy) : null),
    [data]
  );

  if (loading) {
    return <div className="mr-loading"><div>리포트 준비 중...</div></div>;
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

  const { student, session, stats, score, submitted_at } = data;
  const isReserved = score?.is_reserved === true;
  const isScored = score?.is_scored === true;

  // ============================================================
  // 공통 헤더
  // ============================================================
  const Header = (
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
  );

  const Closing = (
    <div className="mr-closing">
      <div className="mr-ct">
        {isReserved ? '지금이 중요한 시점입니다' : '점수보다 중요한 것'}
      </div>
      <p>
        {isReserved ? (
          <>
            점수가 나오지 않은 것은 실패가 아닙니다.
            지금 기본기를 탄탄히 채우면, 다음 단계에서 훨씬 빠르게 성장합니다.
            저희는 아이의 현재 단계를 정확히 파악하고, 부족한 부분을 맞춤 자료집으로 다시 학습시킵니다.
          </>
        ) : (
          <>
            이 점수는 단순한 시험 점수가 아닙니다.
            "아는 것과 모르는 것을 스스로 구별하는 힘"을 함께 측정한 결과입니다.
            자기 실력을 정확히 아는 아이가 스스로 공부의 방향을 잡습니다.
            저희는 이 능력을 훈련하고, 부족한 부분을 맞춤 자료집으로 다시 학습시킵니다.
          </>
        )}
      </p>
      <div className="mr-foot">
        i.study 수리탐구학원<br />
        본 진단은 시험 범위 문항 검증을 바탕으로 한 참고 지표입니다.
      </div>
    </div>
  );

  // ============================================================
  // 유보 리포트 (측정유보)
  // ============================================================
  if (isReserved) {
    return (
      <div className="mr-body">
        <div className="mr-sheet">
          {Header}

          <div className="mr-hero">
            <div className="mr-htitle">진단 결과</div>
            <div className="mr-stage-ic">🌱</div>
            <div className="mr-stage-t">기초를 다지는 단계</div>
            <div className="mr-stage-d">
              그동안 배운 전체 범위에서 아직 모르는<br />
              문항이 많아, 지금은 점수를 매기기보다<br />
              기본기를 채우는 것이 우선입니다.
            </div>
          </div>

          <div className="mr-oneline">
            {student.name} 학생은 그동안 배운 전체 범위 중{' '}
            <b>아직 익히지 못한 부분이 많아</b>, 지금은 점수를 매기기보다{' '}
            <b>기본기를 채우는 것이 우선</b>인 단계입니다.
          </div>

          <div className="mr-section">
            <div className="mr-stitle">이번엔 점수를 내지 않았습니다</div>
            <div className="mr-ssub">그 이유를 솔직하게 말씀드립니다.</div>
            <div className="mr-why-box">
              메타인지 점수는 "<b>아는 것과 모르는 것을 정확히 구별하는가</b>"를 봅니다.
              그런데 <span className="mr-em">그동안 배운 내용 자체가 아직 충분히 익혀지지 않으면</span>,
              자기 판단이 맞는지 측정하는 것이 큰 의미가 없습니다.<br /><br />
              먼저 <b>기본 개념을 채운 뒤</b> 측정하는 것이, 아이에게도 더 정확하고 공정합니다.
            </div>
          </div>

          <div className="mr-stats">
            <div className="mr-stat">
              <div className="mr-num">{stats.can_count}</div>
              <div className="mr-lb">풀 수 있다</div>
            </div>
            <div className="mr-stat mr-big">
              <div className="mr-num">{stats.cannot_count}</div>
              <div className="mr-lb">모르겠다</div>
            </div>
            <div className="mr-stat mr-warn">
              <div className="mr-num">{stats.forced_count}</div>
              <div className="mr-lb">시간초과<br />(판단 못함)</div>
            </div>
          </div>

          <div className="mr-section">
            <div className="mr-stitle">이렇게 지도합니다</div>
            <div className="mr-ssub">지금 단계에 꼭 맞는 과정으로 기본기를 채웁니다.</div>
            <PrescriptionSteps cannotCount={stats.cannot_count} studentName={student.name} tone="reserved" />
          </div>

          {Closing}
        </div>
      </div>
    );
  }

  // ============================================================
  // 채점 대기 (누테 채점 미완료, 유보 아님)
  // ============================================================
  if (!isScored) {
    return (
      <div className="mr-body">
        <div className="mr-sheet">
          {Header}
          <div className="mr-hero">
            <div className="mr-htitle">진단 결과</div>
            <div className="mr-stage-ic">⏳</div>
            <div className="mr-stage-t">채점 대기 중</div>
            <div className="mr-stage-d">
              누테 시험 채점이 완료되면<br />
              점수와 등급이 함께 표시됩니다.
            </div>
          </div>

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

          {Closing}
        </div>
      </div>
    );
  }

  // ============================================================
  // 확정 리포트 (점수 산출됨)
  // ============================================================
  const accuracyPct = Math.round(score.accuracy * 100);
  const wrongInCan = score.nute_can - score.nute_can_correct;

  return (
    <div className="mr-body">
      <div className="mr-sheet">
        {Header}

        {/* 점수 히어로 */}
        <div className="mr-hero mr-hero-score">
          <div className="mr-htitle">메타인지 종합 점수</div>
          <ScoreRing score={score.final_score} color="#0D3B2E" />
          <div className="mr-grade">{grade.label}</div>
          <div className="mr-grade-scale">
            매우우수 85 · 우수 75 · <b>보통 60</b> · 미흡 50
          </div>
        </div>

        {/* 한줄 해석 */}
        <div className="mr-oneline">
          {oneLineText({
            studentName: student.name,
            baseScore: score.base_score,
            accuracy: score.accuracy,
            finalScore: score.final_score,
          })}
        </div>

        {/* 점수 계산 분해 */}
        <div className="mr-section">
          <div className="mr-stitle">점수는 이렇게 계산됩니다</div>
          <div className="mr-ssub">'실력'과 '자기인식 정확도' 두 요소를 함께 반영합니다.</div>
          <div className="mr-calc-row">
            <div className="mr-calc-box">
              <div className="mr-cv">{score.base_score}</div>
              <div className="mr-cl">기본 점수<br />(실력)</div>
            </div>
            <div className="mr-calc-op">×</div>
            <div className="mr-calc-box">
              <div className="mr-cv">{accuracyPct}%</div>
              <div className="mr-cl">자기인식<br />정확도</div>
            </div>
            <div className="mr-calc-op">=</div>
            <div className="mr-calc-box mr-result">
              <div className="mr-cv">{score.final_score}</div>
              <div className="mr-cl">종합 점수</div>
            </div>
          </div>
          <div className="mr-calc-explain">
            <b>기본 점수 {score.base_score}</b> · 60개 문항 중 {stats.cannot_count}개를 "모르겠다"고 판단해, 100점에서 그만큼 반영됩니다.<br />
            <b>자기인식 정확도 {accuracyPct}%</b> · "안다"고 한 문항({score.nute_can}개)을 실제 시험에서 풀어보니, 그중 {score.nute_can_correct}개를 맞혔습니다.
          </div>
        </div>

        {/* 두 축 게이지 */}
        <div className="mr-section">
          <div className="mr-stitle">두 가지 관점에서 본 우리 아이</div>
          <div className="mr-ssub">실력(얼마나 아는가)과 자기인식(아는 걸 정확히 아는가)을 나눠 봅니다.</div>

          <div className="mr-axis-item">
            <div className="mr-axis-head">
              <span className="mr-an">📚 실력 — 얼마나 알고 있나</span>
              <span className="mr-av" style={{ color: skillGrade.color }}>{skillGrade.label}</span>
            </div>
            <div className="mr-bar">
              <div
                className="mr-bar-fill"
                style={{
                  width: `${score.base_score}%`,
                  background:
                    score.base_score >= 75
                      ? 'linear-gradient(90deg,#4aa578,#1a7a4a)'
                      : 'linear-gradient(90deg,#e0a04a,#c0692e)',
                }}
              />
            </div>
            <div className="mr-axis-desc">
              60문항 중 {stats.can_count}문항을 "풀 수 있다"고 판단.
              {stats.cannot_count > 0
                ? ' 아직 모르는 영역이 남아 있습니다.'
                : ' 배운 범위 전체를 알고 있습니다.'}
            </div>
          </div>

          <div className="mr-axis-item">
            <div className="mr-axis-head">
              <span className="mr-an">🎯 자기인식 — 아는 걸 정확히 아나</span>
              <span className="mr-av" style={{ color: accGrade.color }}>{accGrade.label}</span>
            </div>
            <div className="mr-bar">
              <div
                className="mr-bar-fill"
                style={{
                  width: `${accuracyPct}%`,
                  background:
                    accuracyPct >= 75
                      ? 'linear-gradient(90deg,#4aa578,#1a7a4a)'
                      : 'linear-gradient(90deg,#e0a04a,#c0692e)',
                }}
              />
            </div>
            <div className="mr-axis-desc">
              "안다"고 한 {score.nute_can}문항을 실제 시험에서 {score.nute_can_correct}문항 맞힘.
              {accuracyPct >= 75
                ? ' 자기 실력을 정확히 파악하고 있습니다.'
                : ' 판단과 실제 사이에 차이가 있습니다.'}
            </div>
          </div>
        </div>

        {/* 통계 */}
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

        {/* 유형 카드 */}
        {type && (
          <div className="mr-section">
            <div
              className="mr-type-card"
              style={{ background: type.bg, borderLeftColor: type.color }}
            >
              <div className="mr-t" style={{ color: type.color }}>{type.title}</div>
              <div className="mr-d">{type.desc}</div>
            </div>
          </div>
        )}

        {/* 처방 */}
        <div className="mr-section">
          <div className="mr-stitle">이렇게 지도합니다</div>
          <div className="mr-ssub">진단으로 끝나지 않습니다. 아래 과정으로 약한 부분을 채웁니다.</div>
          <PrescriptionSteps
            cannotCount={stats.cannot_count}
            studentName={student.name}
            wrongInCan={wrongInCan}
            tone="scored"
          />
        </div>

        {Closing}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// 처방 3단계 (자료집 → 복습 → 채점)
// tone: 'scored' (일반) or 'reserved' (유보)
// ------------------------------------------------------------
function PrescriptionSteps({ cannotCount, studentName, wrongInCan, tone }) {
  return (
    <>
      <div className="mr-rx-item">
        <div className="mr-rx-ic">1</div>
        <div className="mr-rx-tx">
          <div className="mr-rt">맞춤 복습 자료집 제공</div>
          <div className="mr-rd">
            "모르겠다"고 판단한 {cannotCount}문항만 모아, {studentName} 학생만의 자료집을 만들어 드립니다.
          </div>
        </div>
      </div>
      <div className="mr-rx-item">
        <div className="mr-rx-ic">2</div>
        <div className="mr-rx-tx">
          <div className="mr-rt">1주간 복습</div>
          <div className="mr-rd">
            {tone === 'reserved'
              ? '한 주 동안 자료집을 풀며, 그동안 배운 전체 범위의 약한 부분을 다집니다.'
              : '한 주 동안 자료집을 풀며, 약했던 문항을 스스로 다시 익힙니다.'}
          </div>
        </div>
      </div>
      <div className="mr-rx-item">
        <div className="mr-rx-ic">3</div>
        <div className="mr-rx-tx">
          <div className="mr-rt">학원 채점 &amp; 풀이집 제공</div>
          <div className="mr-rd">
            일주일 후 학원에서 직접 채점하고, 풀이집을 제공해{' '}
            {tone === 'reserved' ? '약한 부분' : '틀린 부분'}을 확실히 짚어드립니다.
          </div>
        </div>
      </div>
    </>
  );
}
