/**
 * 정규분포 그래프 컴포넌트
 * 전체 수험생 점수 분포와 내 위치를 시각적으로 표시합니다.
 */
import './NormalDistributionChart.css';

export default function NormalDistributionChart({
  score,
  maxScore = 100,
  average = 47,
  stdDev = 20,
  predictedGrade = '2~3'
}) {
  const width = 500;
  const height = 200;
  const padding = { top: 50, right: 30, bottom: 30, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 점수를 X 좌표로 변환
  const scoreToX = (s) => {
    return padding.left + (s / maxScore) * chartWidth;
  };

  // 정규분포 Y값 계산
  const normalY = (x, mean, std) => {
    const z = (x - mean) / std;
    return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
  };

  // 정규분포 곡선 path 생성
  const generateCurvePath = () => {
    const points = [];
    const maxY = normalY(average, average, stdDev);

    for (let s = 0; s <= maxScore; s += 1) {
      const x = scoreToX(s);
      const yVal = normalY(s, average, stdDev);
      const y = padding.top + chartHeight - (yVal / maxY) * chartHeight * 0.9;
      points.push(`${s === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return points.join(' ');
  };

  // 곡선 아래 영역 path
  const generateFillPath = () => {
    const curvePath = generateCurvePath();
    return `${curvePath} L ${scoreToX(maxScore)} ${padding.top + chartHeight} L ${scoreToX(0)} ${padding.top + chartHeight} Z`;
  };

  // 특정 점수의 Y 좌표
  const getYForScore = (s) => {
    const maxY = normalY(average, average, stdDev);
    const yVal = normalY(s, average, stdDev);
    return padding.top + chartHeight - (yVal / maxY) * chartHeight * 0.9;
  };

  const avgX = scoreToX(average);
  const scoreX = scoreToX(score);
  const avgY = getYForScore(average);
  const scoreY = getYForScore(score);

  // 평균과 내 점수가 가까울 때 라벨 위치 조정
  const labelsClose = Math.abs(score - average) < 15;
  const avgLabelY = padding.top - 10;
  const scoreLabelY = labelsClose ? padding.top + 5 : padding.top - 10;

  return (
    <div className="normal-dist-chart">
      <div className="chart-title">전체 수험생 점수 분포 (정규분포)</div>

      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {/* 곡선 아래 채우기 - 연한 하늘색 단색 */}
        <path
          d={generateFillPath()}
          fill="#b3e5fc"
          fillOpacity="0.5"
        />

        {/* 정규분포 곡선 */}
        <path
          d={generateCurvePath()}
          fill="none"
          stroke="#1976d2"
          strokeWidth="2.5"
        />

        {/* X축 */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="#ccc"
          strokeWidth="1"
        />

        {/* X축 눈금 및 라벨 */}
        {[0, 20, 40, 60, 80, 100].map((val) => (
          <g key={val}>
            <line
              x1={scoreToX(val)}
              y1={padding.top + chartHeight}
              x2={scoreToX(val)}
              y2={padding.top + chartHeight + 5}
              stroke="#999"
              strokeWidth="1"
            />
            <text
              x={scoreToX(val)}
              y={padding.top + chartHeight + 18}
              textAnchor="middle"
              className="axis-label"
            >
              {val}
            </text>
          </g>
        ))}

        {/* 평균 마커 */}
        <line
          x1={avgX}
          y1={avgY}
          x2={avgX}
          y2={padding.top + chartHeight}
          stroke="#66bb6a"
          strokeWidth="2"
          strokeDasharray="6,3"
        />
        <text
          x={avgX}
          y={avgLabelY}
          textAnchor="middle"
          className="marker-label avg-label"
        >
          평균: {average}점
        </text>

        {/* 내 점수 마커 */}
        <line
          x1={scoreX}
          y1={scoreY}
          x2={scoreX}
          y2={padding.top + chartHeight}
          stroke="#e53935"
          strokeWidth="2"
          strokeDasharray="6,3"
        />
        <text
          x={scoreX}
          y={scoreLabelY}
          textAnchor="middle"
          className="marker-label score-label"
        >
          내 점수: {score}점
        </text>
      </svg>

      {/* 통계 테이블 */}
      <div className="stats-table">
        <div className="stats-item">
          <div className="stats-label">전국 평균</div>
          <div className="stats-value">{average.toFixed(1)}점</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">표준편차</div>
          <div className="stats-value">{stdDev.toFixed(1)}</div>
        </div>
        <div className="stats-item">
          <div className="stats-label">고1 예상 등급 (9등급제)</div>
          <div className="stats-value highlight">{predictedGrade}등급</div>
        </div>
      </div>
    </div>
  );
}
