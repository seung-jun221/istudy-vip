/**
 * CT(개념구조화 테스트) 중등 수학 준비도 분석 컴포넌트
 * 학생의 점수를 다양한 학습 목표별로 비교 분석합니다.
 * T그래프 시각화 포함
 */
import './SchoolCompetitivenessChart.css';
import { CT_COMPETITIVENESS } from '../../data/ctTestConfig';

// T-Score 시각화 컴포넌트
const TScoreVisual = ({ tScore }) => {
  const minT = 20;
  const maxT = 80;
  const range = maxT - minT;
  const clampedScore = Math.max(minT, Math.min(maxT, tScore));
  const position = ((clampedScore - minT) / range) * 100;

  // T-Score 등급 라벨
  const ticks = [20, 30, 40, 50, 60, 70, 80];

  return (
    <div className="t-score-visual">
      <div className="t-score-track">
        <div className="t-score-gradient" />
        {ticks.map(tick => (
          <div
            key={tick}
            className="t-score-tick"
            style={{ left: `${((tick - minT) / range) * 100}%` }}
          >
            <span className="tick-line" />
            <span className="tick-label">{tick}</span>
          </div>
        ))}
        <div
          className="t-score-marker"
          style={{ left: `${position}%` }}
        >
          <span className="marker-value">{tScore.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
};

export default function CTCompetitivenessChart({ score, maxScore = 100 }) {
  // 정규분포 기반 백분위 계산
  const calculatePercentile = (score, mean, std) => {
    const z = (score - mean) / std;
    // 표준정규분포 CDF 근사값
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? (1 - p) * 100 : p * 100;
  };

  // 점수를 T-Score로 변환
  const calculateTScore = (score, mean, std) => {
    return 50 + 10 * ((score - mean) / std);
  };

  // 준비도 등급 계산
  const getReadinessLevel = (percentile, targetGrade) => {
    const topPercentile = 100 - percentile;

    // 목표 등급에 따른 준비도 판정
    if (targetGrade.includes('5%')) {
      if (topPercentile <= 5) return { level: '적합', text: '목표 도달' };
      if (topPercentile <= 15) return { level: '근접', text: '목표 근접' };
      return { level: '보완필요', text: '보완 필요' };
    }
    if (targetGrade.includes('20%')) {
      if (topPercentile <= 20) return { level: '적합', text: '목표 도달' };
      if (topPercentile <= 35) return { level: '근접', text: '목표 근접' };
      return { level: '보완필요', text: '보완 필요' };
    }
    if (targetGrade.includes('50%')) {
      if (topPercentile <= 50) return { level: '적합', text: '목표 도달' };
      if (topPercentile <= 65) return { level: '근접', text: '목표 근접' };
      return { level: '보완필요', text: '보완 필요' };
    }
    // 기본: 70%
    if (topPercentile <= 70) return { level: '적합', text: '목표 도달' };
    if (topPercentile <= 85) return { level: '근접', text: '목표 근접' };
    return { level: '보완필요', text: '보완 필요' };
  };

  // 레벨에 따른 색상 (프리미엄 테마)
  const getLevelColor = (level) => {
    if (level === '적합') return '#4A7C59'; // 성공 녹색
    if (level === '근접') return '#D4A84B'; // 골드
    return '#A85454'; // 에러 적색
  };

  // 각 카테고리별 분석 결과 계산
  const results = CT_COMPETITIVENESS.categories.map(category => {
    const percentile = calculatePercentile(score, category.mean, category.stdDev);
    const tScore = calculateTScore(score, category.mean, category.stdDev);
    const topPercentile = Math.max(1, Math.min(99, 100 - percentile));
    const readiness = getReadinessLevel(percentile, category.targetGrade);
    const pointDiff = score - category.mean;

    return {
      ...category,
      percentile,
      tScore,
      topPercentile: Math.round(topPercentile),
      readiness,
      pointDiff: pointDiff >= 0 ? `+${Math.round(pointDiff)}` : Math.round(pointDiff).toString(),
      levelColor: getLevelColor(readiness.level)
    };
  });

  return (
    <div className="school-competitiveness premium">
      <div className="competitiveness-grid">
        {results.map((result, index) => (
          <div key={index} className="competitiveness-card">
            <div className="card-header">
              <span className="school-name">{result.name}</span>
              <span className="school-desc">{result.description}</span>
            </div>
            <div className="card-body">
              <TScoreVisual tScore={result.tScore} />
              <div className="stats-row">
                <span className="stat-badge percentile">
                  상위 {result.topPercentile}%
                </span>
                <span
                  className="stat-badge grade"
                  style={{
                    backgroundColor: result.levelColor,
                    color: 'white'
                  }}
                >
                  {result.readiness.text}
                </span>
                <span className="stat-badge points">
                  평균 대비 {result.pointDiff}점
                </span>
              </div>
              <div className="card-footer">
                목표: {result.targetGrade} · 평균 {result.mean}점
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
