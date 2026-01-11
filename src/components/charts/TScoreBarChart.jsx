/**
 * 영역별 T-Score 프로필 차트 컴포넌트
 * 자기주도 학습역량 주요 요인을 시각적으로 표시합니다.
 */
import './TScoreBarChart.css';

export default function TScoreBarChart({ areaResults }) {
  if (!areaResults || areaResults.length === 0) {
    return null;
  }

  // T-Score 범위 설정
  const minT = 10;
  const maxT = 90;
  const range = maxT - minT;

  // T-Score에 따른 색상 결정 (샘플 기준)
  const getTScoreColor = (tScore) => {
    if (tScore >= 70) return '#4caf50'; // 최상 - 진한 녹색
    if (tScore >= 60) return '#8bc34a'; // 우수 - 연녹색
    if (tScore >= 40) return '#2196f3'; // 보통 - 파랑
    if (tScore >= 30) return '#ff9800'; // 주의 - 주황
    return '#f44336'; // 위험 - 빨강
  };

  // 막대 너비 계산 (T-Score 10~90 범위를 0~100%로 변환)
  const getBarWidth = (tScore) => {
    const clampedScore = Math.max(minT, Math.min(maxT, tScore));
    return ((clampedScore - minT) / range) * 100;
  };

  // X축 눈금 값
  const xAxisTicks = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  return (
    <div className="tscore-profile-chart">
      {/* 범례 (오른쪽 정렬) */}
      <div className="compact-legend">
        <span className="legend-prefix">T Score</span>
        <span className="legend-text">
          위험 (30 이하)주의 (30-40)보통 (40-60)우수 (60-70)최상 (70 이상)
        </span>
      </div>

      {/* X축 눈금 */}
      <div className="x-axis">
        <div className="axis-spacer"></div>
        <div className="axis-ticks">
          {xAxisTicks.map((tick) => (
            <div
              key={tick}
              className="tick-mark"
              style={{ left: `${((tick - minT) / range) * 100}%` }}
            >
              {tick}
            </div>
          ))}
        </div>
      </div>

      {/* 막대 그래프 */}
      <div className="bars-container">
        {areaResults.map((area, index) => {
          const tScore = area.tscore || area.tScore || 50;
          const barWidth = getBarWidth(tScore);
          const color = getTScoreColor(tScore);

          return (
            <div key={index} className="bar-row">
              <div className="bar-label">{area.areaName || area.area}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                  }}
                >
                  <span className="bar-value">{tScore.toFixed(1)}</span>
                </div>
                <div
                  className="bar-empty"
                  style={{ width: `${100 - barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
