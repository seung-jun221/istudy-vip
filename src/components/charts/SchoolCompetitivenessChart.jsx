/**
 * 고교 유형별 내신 경쟁력 분석 컴포넌트
 * 학생의 점수를 다양한 고교 유형별로 비교 분석합니다.
 */
import './SchoolCompetitivenessChart.css';

// 고교 유형별 통계 데이터
const SCHOOL_TYPES = [
  {
    id: 'special',
    name: '전국 자사고/특목고',
    average: 62,
    stdDev: 10,
    description: '전국 단위 자사고, 외고, 과고 등'
  },
  {
    id: 'daechi',
    name: '대치동 일반고',
    average: 56,
    stdDev: 13,
    description: '강남 8학군 일반고'
  },
  {
    id: 'metro',
    name: '수도권 학군지',
    average: 50,
    stdDev: 15,
    description: '수도권 주요 학군 일반고'
  },
  {
    id: 'general',
    name: '비학군지 일반고',
    average: 42,
    stdDev: 22,
    description: '일반 지역 일반고'
  }
];

export default function SchoolCompetitivenessChart({ score, maxScore = 100 }) {
  // 정규분포 기반 백분위 계산
  const calculatePercentile = (score, mean, std) => {
    const z = (score - mean) / std;
    // 표준정규분포 CDF 근사값
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? (1 - p) * 100 : p * 100;
  };

  // 백분위를 9등급으로 변환
  const percentileToGrade = (percentile) => {
    const topPercentile = 100 - percentile;
    if (topPercentile <= 4) return { grade: 1, text: '1등급' };
    if (topPercentile <= 11) return { grade: 2, text: '1~2등급' };
    if (topPercentile <= 23) return { grade: 3, text: '2~3등급' };
    if (topPercentile <= 40) return { grade: 4, text: '3~4등급' };
    if (topPercentile <= 60) return { grade: 5, text: '4등급 초반' };
    if (topPercentile <= 77) return { grade: 6, text: '5등급' };
    if (topPercentile <= 89) return { grade: 7, text: '6등급' };
    if (topPercentile <= 96) return { grade: 8, text: '7등급' };
    return { grade: 9, text: '8~9등급' };
  };

  // 등급에 따른 색상
  const getGradeColor = (grade) => {
    if (grade <= 2) return '#1976d2';
    if (grade <= 4) return '#42a5f5';
    if (grade <= 6) return '#ff9800';
    return '#f44336';
  };

  // 각 학교 유형별 분석 결과 계산
  const results = SCHOOL_TYPES.map(school => {
    const percentile = calculatePercentile(score, school.average, school.stdDev);
    const topPercentile = Math.max(1, Math.min(99, 100 - percentile));
    const gradeInfo = percentileToGrade(percentile);
    const pointDiff = score - school.average;
    const barWidth = Math.min(100, Math.max(5, percentile));

    return {
      ...school,
      percentile,
      topPercentile: Math.round(topPercentile),
      gradeInfo,
      pointDiff: pointDiff >= 0 ? `+${Math.round(pointDiff)}` : Math.round(pointDiff).toString(),
      barWidth,
      gradeColor: getGradeColor(gradeInfo.grade)
    };
  });

  return (
    <div className="school-competitiveness">
      <div className="competitiveness-grid">
        {results.map((result) => (
          <div key={result.id} className="competitiveness-card">
            <div className="card-header">
              <span className="school-name">{result.name}</span>
            </div>
            <div className="card-body">
              <div className="stats-row">
                <span className="stat-badge percentile">
                  상위 {result.topPercentile}%
                </span>
                <span
                  className="stat-badge grade"
                  style={{
                    backgroundColor: result.gradeColor,
                    color: 'white'
                  }}
                >
                  {result.gradeInfo.text}
                </span>
                <span className="stat-badge points">
                  {result.pointDiff}점
                </span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{ width: `${result.barWidth}%` }}
                />
              </div>
              <div className="card-footer">
                평균 {result.average}점 (표준편차 {result.stdDev})
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
