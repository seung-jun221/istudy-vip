/**
 * T-Score 기반 성적 레벨 매핑
 *
 * T-Score는 평균 50, 표준편차 10인 표준화 점수입니다.
 * 백분위와 연동하여 5단계 레벨로 분류합니다.
 */

export type PerformanceLevel = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'CRITICAL';

export interface LevelInfo {
  level: PerformanceLevel;
  label: string;
  description: string;
  color: string;
}

/**
 * T-Score를 성적 레벨로 변환
 *
 * @param tScore - T-Score (평균 50, 표준편차 10)
 * @returns 성적 레벨
 *
 * 기준 (진단검사 공식 문서 기준):
 * - EXCELLENT: T-Score 70 이상
 * - GOOD: T-Score 60~69
 * - AVERAGE: T-Score 40~59
 * - WEAK: T-Score 30~39
 * - CRITICAL: T-Score 30 미만
 */
export function getTScoreLevel(tScore: number): PerformanceLevel {
  if (tScore >= 70) return 'EXCELLENT';
  if (tScore >= 60) return 'GOOD';
  if (tScore >= 40) return 'AVERAGE';
  if (tScore >= 30) return 'WEAK';
  return 'CRITICAL';
}

/**
 * 백분위를 성적 레벨로 변환
 *
 * @param percentile - 백분위 (0-100)
 * @returns 성적 레벨
 */
export function getPercentileLevel(percentile: number): PerformanceLevel {
  if (percentile >= 84) return 'EXCELLENT'; // 상위 16%
  if (percentile >= 69) return 'GOOD';      // 상위 31%
  if (percentile >= 31) return 'AVERAGE';   // 중간 38%
  if (percentile >= 16) return 'WEAK';      // 하위 31%
  return 'CRITICAL';                        // 하위 16%
}

/**
 * 정답률(%) 기반 레벨 변환
 *
 * @param accuracy - 정답률 (0-100)
 * @returns 성적 레벨
 */
export function getAccuracyLevel(accuracy: number): PerformanceLevel {
  if (accuracy >= 80) return 'EXCELLENT';
  if (accuracy >= 60) return 'GOOD';
  if (accuracy >= 40) return 'AVERAGE';
  if (accuracy >= 20) return 'WEAK';
  return 'CRITICAL';
}

/**
 * 레벨 정보 반환
 *
 * @param level - 성적 레벨
 * @returns 레벨 상세 정보
 */
export function getLevelInfo(level: PerformanceLevel): LevelInfo {
  const levelInfoMap: Record<PerformanceLevel, LevelInfo> = {
    EXCELLENT: {
      level: 'EXCELLENT',
      label: '최상',
      description: '매우 우수한 실력을 보이고 있습니다.',
      color: '#27AE60', // 초록색 (문서 기준)
    },
    GOOD: {
      level: 'GOOD',
      label: '우수',
      description: '우수한 실력을 보이고 있습니다.',
      color: '#3498DB', // 파란색 (문서 기준)
    },
    AVERAGE: {
      level: 'AVERAGE',
      label: '보통',
      description: '평균적인 실력을 보이고 있습니다.',
      color: '#F39C12', // 주황색 (문서 기준)
    },
    WEAK: {
      level: 'WEAK',
      label: '주의',
      description: '집중 보완이 필요합니다.',
      color: '#E74C3C', // 빨간색 (문서 기준)
    },
    CRITICAL: {
      level: 'CRITICAL',
      label: '위험',
      description: '즉각 개선이 필요합니다.',
      color: '#C0392B', // 진한 빨간색 (문서 기준)
    },
  };

  return levelInfoMap[level];
}

/**
 * 난이도별 정답률을 분석하여 학습 진단 메시지 생성
 *
 * @param difficultyResults - 난이도별 결과 { LOW, MID, HIGH }
 * @returns 진단 메시지
 */
export function analyzeDifficultyPattern(difficultyResults: {
  difficulty: 'LOW' | 'MID' | 'HIGH';
  accuracy: number;
}[]): string {
  const low = difficultyResults.find(d => d.difficulty === 'LOW')?.accuracy || 0;
  const mid = difficultyResults.find(d => d.difficulty === 'MID')?.accuracy || 0;
  const high = difficultyResults.find(d => d.difficulty === 'HIGH')?.accuracy || 0;

  // 패턴 분석
  if (low >= 80 && mid >= 70 && high >= 60) {
    return '모든 난이도에서 고른 실력을 보이고 있습니다. 심화 학습을 권장합니다.';
  }

  if (low >= 70 && mid < 50) {
    return '기본 개념은 잘 이해하고 있으나, 응용력이 부족합니다. 다양한 유형의 문제 풀이가 필요합니다.';
  }

  if (low < 60 && mid < 50 && high < 40) {
    return '기본 개념부터 다시 학습이 필요합니다. 개념 정리 후 기본 문제부터 차근차근 풀어보세요.';
  }

  if (low >= 70 && high < 40) {
    return '기본 문제는 잘 풀지만 고난도 문제에서 어려움을 겪고 있습니다. 사고력을 요하는 문제 풀이 훈련이 필요합니다.';
  }

  if (low < 70 && mid >= 60) {
    return '응용 문제는 풀 수 있으나 실수가 많습니다. 기본 계산 연습과 꼼꼼한 검토가 필요합니다.';
  }

  return '고른 학습이 필요합니다. 부족한 영역을 집중적으로 보완하세요.';
}
