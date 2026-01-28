/**
 * CT(개념구조화 테스트) 설정 데이터
 * 대상: 초5-1 약수와 배수 개념 이상 이수, 중등 미진행 초등학생
 * 문항 수: 10문항, 총점: 100점
 * 채점 방식: 수동 채점 전용 (서술형 문항, 부분 점수 가능)
 */

export const CT_TEST_CONFIG = {
  testType: "CT",
  testName: "개념구조화 테스트",
  targetStudents: "초5-1 약수/배수 개념 이수 초등학생",
  totalQuestions: 10,
  totalScore: 100,
  scoringMethod: "manual", // 수동 채점만 가능
  scoreUnit: 0.5, // 0.5점 단위 입력

  questions: [
    { num: 1, area: "소인수분해", difficulty: 2, maxScore: 8.0, type: "essay", topic: "약수를 표로 소인수분해 형태 나타내기 (소인수 2개)", answer: null },
    { num: 2, area: "소인수분해", difficulty: 3, maxScore: 10.0, type: "essay", topic: "약수를 표로 소인수분해 형태 나타내기 (소인수 3개)", answer: null },
    { num: 3, area: "약수의 개수", difficulty: 2, maxScore: 8.0, type: "short", topic: "약수 개수 공식 활용", answer: "48" },
    { num: 4, area: "제곱수", difficulty: 1, maxScore: 6.0, type: "short", topic: "제곱수 나열", answer: "1,4,9,16,25" },
    { num: 5, area: "약수의 개수", difficulty: 3, maxScore: 10.0, type: "short", topic: "약수 3개인 최소 세자리수", answer: "121" },
    { num: 6, area: "개념 서술", difficulty: 4, maxScore: 14.0, type: "essay", topic: "제곱수와 약수 3개 수 구하는 방법 서술", answer: null },
    { num: 7, area: "소수", difficulty: 3, maxScore: 10.0, type: "essay", topic: "a×b=소수 순서쌍 찾기", answer: "12개" },
    { num: 8, area: "소수", difficulty: 4, maxScore: 12.0, type: "essay", topic: "a×b×c=소수 순서쌍 찾기", answer: "36개" },
    { num: 9, area: "약수의 개수", difficulty: 3, maxScore: 10.0, type: "essay", topic: "a×b 약수 3개 순서쌍 찾기", answer: "10개" },
    { num: 10, area: "약수의 개수", difficulty: 4, maxScore: 12.0, type: "essay", topic: "a×b×c 약수 3개 순서쌍 찾기", answer: "33개" }
  ],

  areas: {
    "소인수분해": { questions: [1, 2], totalScore: 18.0, weight: 0.18 },
    "약수의 개수": { questions: [3, 5, 9, 10], totalScore: 40.0, weight: 0.40 },
    "제곱수": { questions: [4], totalScore: 6.0, weight: 0.06 },
    "개념 서술": { questions: [6], totalScore: 14.0, weight: 0.14 },
    "소수": { questions: [7, 8], totalScore: 22.0, weight: 0.22 }
  },

  // 난이도 그룹
  difficultyGroups: {
    low: { questions: [4], label: "하난도", maxScore: 6.0, stars: 1 },
    midLow: { questions: [1, 3], label: "중하난도", maxScore: 16.0, stars: 2 },
    midHigh: { questions: [2, 5, 7, 9], label: "중상난도", maxScore: 40.0, stars: 3 },
    high: { questions: [6, 8, 10], label: "고난도", maxScore: 38.0, stars: 4 }
  }
};

// CT 통계 기준값 (실제 응시 데이터 기반: 평균 76~78점)
export const CT_STATISTICS = {
  mean: 78.0,      // 초등생 실제 평균
  stdDev: 12.0,    // 표준편차

  // 등급 컷 (9등급제) - 평균 78, 표준편차 12 기준
  gradeCuts: {
    1: 96,  // 상위 4%
    2: 92,  // 상위 11%
    3: 86,  // 상위 23%
    4: 80,  // 상위 40%
    5: 74,  // 상위 60%
    6: 68,  // 상위 77%
    7: 62,  // 상위 89%
    8: 54,  // 상위 96%
    9: 0    // 상위 100%
  },

  // 5등급제 컷 (2028 수능 기준)
  gradeCuts5: {
    1: 94,  // 상위 10%
    2: 84,  // 상위 35%
    3: 72,  // 상위 65%
    4: 58,  // 상위 90%
    5: 0    // 상위 100%
  }
};

// CT 전용 경쟁력 분석 (중등 수학 준비도) - 평균 78점 기준 조정
export const CT_COMPETITIVENESS = {
  title: "중등 수학 준비도 분석",
  categories: [
    {
      name: "영재교육원/경시대회",
      description: "영재교육원, 수학 경시대회 준비",
      mean: 92,
      stdDev: 6,
      targetGrade: "상위 5% 이내"
    },
    {
      name: "중등 심화반",
      description: "중등 심화 과정 준비",
      mean: 85,
      stdDev: 8,
      targetGrade: "상위 20% 이내"
    },
    {
      name: "중등 일반반",
      description: "중등 정규 과정 준비",
      mean: 78,
      stdDev: 10,
      targetGrade: "상위 50% 이내"
    },
    {
      name: "기초 보완반",
      description: "초등 개념 보완 후 중등 진입",
      mean: 68,
      stdDev: 12,
      targetGrade: "상위 70% 이내"
    }
  ]
};

// 득점률 → 레벨 변환
export const getScoreLevel = (scoreRate) => {
  if (scoreRate >= 90) return { level: "excellent", label: "최상", color: "#27AE60" };
  if (scoreRate >= 70) return { level: "good", label: "우수", color: "#3498DB" };
  if (scoreRate >= 50) return { level: "average", label: "보통", color: "#F39C12" };
  if (scoreRate >= 30) return { level: "weak", label: "주의", color: "#E74C3C" };
  return { level: "critical", label: "위험", color: "#C0392B" };
};

// T-Score 계산
export const calculateTScore = (rawScore, mean = CT_STATISTICS.mean, stdDev = CT_STATISTICS.stdDev) => {
  return 50 + 10 * (rawScore - mean) / stdDev;
};

// 백분위 계산 (정규분포 근사)
export const calculatePercentile = (tScore) => {
  // 정규분포 CDF 근사
  const z = (tScore - 50) / 10;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  return ((1 + sign * y) / 2) * 100;
};

// 9등급 계산 (점수 기반 - deprecated, 호환성 유지용)
export const getGrade9 = (rawScore) => {
  const cuts = CT_STATISTICS.gradeCuts;
  for (let grade = 1; grade <= 9; grade++) {
    if (rawScore >= cuts[grade]) return grade;
  }
  return 9;
};

// 백분위 기반 9등급 계산 (수능/모의고사 기준)
// 1등급: 상위 4%, 2등급: 상위 11%, 3등급: 상위 23%, 4등급: 상위 40%
// 5등급: 상위 60%, 6등급: 상위 77%, 7등급: 상위 89%, 8등급: 상위 96%, 9등급: 100%
export const getGrade9FromPercentile = (percentile) => {
  const topPercent = 100 - percentile;

  if (topPercent <= 4) return 1;
  if (topPercent <= 11) return 2;
  if (topPercent <= 23) return 3;
  if (topPercent <= 40) return 4;
  if (topPercent <= 60) return 5;
  if (topPercent <= 77) return 6;
  if (topPercent <= 89) return 7;
  if (topPercent <= 96) return 8;
  return 9;
};

// 5등급 계산 (점수 기반 - deprecated, 호환성 유지용)
export const getGrade5 = (rawScore) => {
  const cuts = CT_STATISTICS.gradeCuts5;
  for (let grade = 1; grade <= 5; grade++) {
    if (rawScore >= cuts[grade]) return grade;
  }
  return 5;
};

// 백분위 기반 5등급 계산 (2028 대입제도 개편안)
// 1등급: 상위 10%, 2등급: 상위 34%, 3등급: 상위 66%, 4등급: 상위 90%, 5등급: 100%
export const getGrade5FromPercentile = (percentile) => {
  const topPercent = 100 - percentile;

  if (topPercent <= 10) return 1;
  if (topPercent <= 34) return 2;
  if (topPercent <= 66) return 3;
  if (topPercent <= 90) return 4;
  return 5;
};

// 영역별 득점률 계산
export const calculateAreaStats = (studentScores) => {
  const areaStats = {};

  Object.entries(CT_TEST_CONFIG.areas).forEach(([areaName, areaInfo]) => {
    let earnedScore = 0;

    areaInfo.questions.forEach(qNum => {
      earnedScore += studentScores[qNum] || 0;
    });

    const scoreRate = (earnedScore / areaInfo.totalScore) * 100;
    const levelInfo = getScoreLevel(scoreRate);

    areaStats[areaName] = {
      earned: earnedScore,
      max: areaInfo.totalScore,
      rate: scoreRate,
      ...levelInfo
    };
  });

  return areaStats;
};

// 난이도별 득점률 계산
export const calculateDifficultyStats = (studentScores) => {
  const stats = {};

  Object.entries(CT_TEST_CONFIG.difficultyGroups).forEach(([key, group]) => {
    let earned = 0;
    let fullScoreCount = 0;

    group.questions.forEach(qNum => {
      const score = studentScores[qNum] || 0;
      earned += score;
      const question = CT_TEST_CONFIG.questions.find(q => q.num === qNum);
      if (score === question.maxScore) {
        fullScoreCount++;
      }
    });

    stats[key] = {
      label: group.label,
      stars: group.stars,
      earned: earned,
      max: group.maxScore,
      rate: (earned / group.maxScore) * 100,
      questionCount: group.questions.length,
      fullScoreCount: fullScoreCount
    };
  });

  return stats;
};

// 점수 입력 검증
export const validateScoreInput = (questionNum, inputScore) => {
  const question = CT_TEST_CONFIG.questions.find(q => q.num === questionNum);
  if (!question) return { valid: false, error: "존재하지 않는 문항입니다." };

  const maxScore = question.maxScore;

  if (inputScore < 0) return { valid: false, error: "0점 미만 입력 불가" };
  if (inputScore > maxScore) return { valid: false, error: `${maxScore}점 초과 입력 불가` };
  if (inputScore % 0.5 !== 0) return { valid: false, error: "0.5점 단위로 입력해주세요" };

  return { valid: true };
};

// CT 전체 성적 계산
export const calculateCTResults = (studentScores) => {
  // 총점 계산
  const totalScore = Object.values(studentScores).reduce((sum, score) => sum + (score || 0), 0);

  // T-Score, 백분위, 등급 계산 (백분위 기반으로 통일)
  const tScore = calculateTScore(totalScore);
  const percentile = calculatePercentile(tScore);
  const grade9 = getGrade9FromPercentile(percentile); // 백분위 기반 9등급
  const grade5 = getGrade5FromPercentile(percentile); // 백분위 기반 5등급

  // 영역별 통계
  const areaStats = calculateAreaStats(studentScores);

  // 난이도별 통계
  const difficultyStats = calculateDifficultyStats(studentScores);

  return {
    totalScore,
    tScore: Math.round(tScore * 10) / 10,
    percentile: Math.round(percentile * 10) / 10,
    grade9,
    grade5,
    areaStats,
    difficultyStats
  };
};

export default CT_TEST_CONFIG;
