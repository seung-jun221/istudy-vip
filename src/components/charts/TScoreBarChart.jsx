/**
 * 영역별 T-Score 막대 차트 컴포넌트
 * 각 영역의 T-Score를 시각적으로 비교합니다.
 */
import './TScoreBarChart.css';

export default function TScoreBarChart({ areaResults }) {
  if (!areaResults || areaResults.length === 0) {
    return null;
  }

  // T-Score에 따른 색상 결정
  const getTScoreColor = (tScore) => {
    if (tScore >= 65) return '#4caf50'; // Excellent - 녹색
    if (tScore >= 55) return '#8bc34a'; // Good - 연녹색
    if (tScore >= 45) return '#ff9800'; // Average - 주황
    if (tScore >= 35) return '#ff5722'; // Weak - 주황빨강
    return '#f44336'; // Critical - 빨강
  };

  // T-Score에 따른 레벨 텍스트
  const getTScoreLevel = (tScore) => {
    if (tScore >= 65) return '우수';
    if (tScore >= 55) return '양호';
    if (tScore >= 45) return '보통';
    if (tScore >= 35) return '미흡';
    return '취약';
  };

  // 막대 너비 계산 (T-Score 20~80 범위를 0~100%로 변환)
  const getBarWidth = (tScore) => {
    const minT = 20;
    const maxT = 80;
    const normalized = Math.max(0, Math.min(100, ((tScore - minT) / (maxT - minT)) * 100));
    return normalized;
  };

  // 평균선 위치 (T-Score 50 = 50%)
  const averageLinePosition = getBarWidth(50);

  return (
    <div className="tscore-chart">
      <div className="chart-title">영역별 T-Score 프로필</div>

      <div className="chart-container">
        {/* 기준선 */}
        <div className="reference-lines">
          <div className="ref-line" style={{ left: `${getBarWidth(35)}%` }}>
            <span className="ref-label">35</span>
          </div>
          <div className="ref-line average" style={{ left: `${getBarWidth(50)}%` }}>
            <span className="ref-label">평균(50)</span>
          </div>
          <div className="ref-line" style={{ left: `${getBarWidth(65)}%` }}>
            <span className="ref-label">65</span>
          </div>
        </div>

        {/* 막대 그래프 */}
        <div className="bars-container">
          {areaResults.map((area, index) => {
            const tScore = area.tscore || area.tScore || 50;
            const barWidth = getBarWidth(tScore);
            const color = getTScoreColor(tScore);
            const level = getTScoreLevel(tScore);

            return (
              <div key={index} className="bar-row">
                <div className="bar-label">{area.areaName || area.area}</div>
                <div className="bar-wrapper">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    }}
                  >
                    <span className="bar-value">{tScore.toFixed(1)}</span>
                  </div>
                  <span className="bar-level" style={{ color }}>
                    {level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#4caf50' }}></span>
          <span>우수 (65+)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#8bc34a' }}></span>
          <span>양호 (55-64)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ff9800' }}></span>
          <span>보통 (45-54)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ff5722' }}></span>
          <span>미흡 (35-44)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#f44336' }}></span>
          <span>취약 (35-)</span>
        </div>
      </div>
    </div>
  );
}
