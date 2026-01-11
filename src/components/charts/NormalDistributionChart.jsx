/**
 * 정규분포 그래프 컴포넌트
 * 백분위 위치를 시각적으로 표시합니다.
 */
import './NormalDistributionChart.css';

export default function NormalDistributionChart({ percentile, score, maxScore }) {
  // 정규분포 곡선 포인트 생성 (SVG path)
  const generateNormalCurve = () => {
    const points = [];
    const width = 400;
    const height = 150;
    const padding = 20;

    for (let i = 0; i <= 100; i++) {
      const x = padding + (i / 100) * (width - 2 * padding);
      // 정규분포 공식 (평균 50, 표준편차 약 16.67로 0-100 범위)
      const z = (i - 50) / 16.67;
      const y = height - padding - (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)) * (height - 2 * padding) * 4;
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return points.join(' ');
  };

  // 백분위에 해당하는 X 좌표 계산
  const getPercentileX = () => {
    const width = 400;
    const padding = 20;
    return padding + (percentile / 100) * (width - 2 * padding);
  };

  // 백분위에 해당하는 Y 좌표 계산
  const getPercentileY = () => {
    const height = 150;
    const padding = 20;
    const z = (percentile - 50) / 16.67;
    return height - padding - (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)) * (height - 2 * padding) * 4;
  };

  // 등급 구간 색상
  const getGradeZones = () => {
    return [
      { start: 0, end: 4, color: '#1565c0', label: '1등급' },
      { start: 4, end: 11, color: '#1976d2', label: '2등급' },
      { start: 11, end: 23, color: '#1e88e5', label: '3등급' },
      { start: 23, end: 40, color: '#42a5f5', label: '4등급' },
      { start: 40, end: 60, color: '#90caf9', label: '5등급' },
      { start: 60, end: 77, color: '#ffb74d', label: '6등급' },
      { start: 77, end: 89, color: '#ffa726', label: '7등급' },
      { start: 89, end: 96, color: '#ff9800', label: '8등급' },
      { start: 96, end: 100, color: '#f57c00', label: '9등급' },
    ];
  };

  const percentileX = getPercentileX();
  const percentileY = getPercentileY();

  return (
    <div className="normal-dist-chart">
      <div className="chart-title">성적 분포 및 백분위 위치</div>
      <svg viewBox="0 0 400 180" className="chart-svg">
        {/* 배경 그라데이션 영역 */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1565c0" />
            <stop offset="11%" stopColor="#1976d2" />
            <stop offset="23%" stopColor="#42a5f5" />
            <stop offset="50%" stopColor="#90caf9" />
            <stop offset="77%" stopColor="#ffb74d" />
            <stop offset="89%" stopColor="#ff9800" />
            <stop offset="100%" stopColor="#f57c00" />
          </linearGradient>
          <clipPath id="curveClip">
            <path d={`${generateNormalCurve()} L 380 150 L 20 150 Z`} />
          </clipPath>
        </defs>

        {/* 곡선 아래 채우기 */}
        <rect
          x="20"
          y="0"
          width="360"
          height="150"
          fill="url(#curveGradient)"
          clipPath="url(#curveClip)"
          opacity="0.3"
        />

        {/* 정규분포 곡선 */}
        <path
          d={generateNormalCurve()}
          fill="none"
          stroke="#2c3e50"
          strokeWidth="2"
        />

        {/* X축 */}
        <line x1="20" y1="150" x2="380" y2="150" stroke="#ccc" strokeWidth="1" />

        {/* 백분위 마커 - 세로선 */}
        <line
          x1={percentileX}
          y1={percentileY}
          x2={percentileX}
          y2="150"
          stroke="#e53935"
          strokeWidth="2"
          strokeDasharray="4,2"
        />

        {/* 백분위 마커 - 점 */}
        <circle
          cx={percentileX}
          cy={percentileY}
          r="6"
          fill="#e53935"
          stroke="white"
          strokeWidth="2"
        />

        {/* 백분위 라벨 */}
        <text
          x={percentileX}
          y={percentileY - 15}
          textAnchor="middle"
          className="percentile-label"
        >
          {percentile.toFixed(1)}%
        </text>

        {/* X축 라벨 */}
        <text x="20" y="168" textAnchor="start" className="axis-label">하위</text>
        <text x="200" y="168" textAnchor="middle" className="axis-label">평균</text>
        <text x="380" y="168" textAnchor="end" className="axis-label">상위</text>
      </svg>

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-marker" style={{ background: '#e53935' }}></span>
          <span>내 위치: 상위 {(100 - percentile).toFixed(1)}%</span>
        </div>
        {score !== undefined && maxScore !== undefined && (
          <div className="legend-item">
            <span className="legend-score">{score.toFixed(1)} / {maxScore}점</span>
          </div>
        )}
      </div>
    </div>
  );
}
