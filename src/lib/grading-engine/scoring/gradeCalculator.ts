/**
 * 등급 계산 모듈
 * 점수 → 9등급/5등급 환산, T-Score, 백분위 계산
 */

import { TestType, GradeCutoffs, AreaStatistics } from '../types/index';

export class GradeCalculator {
  /**
   * 등급컷 데이터 (진단검사 평균 표준편차.txt 기반)
   */
  private static readonly GRADE_CUTOFFS: { [key in TestType]: GradeCutoffs } = {
    MONO: {
      testType: 'MONO',
      mean: 45.5, // 예상 평균 (43-48점의 중간값)
      stdDev: 22, // 예상 표준편차 (20-24점의 중간값)
      grade1Cut: 87,
      grade2Cut: 75,
      grade3Cut: 63,
      grade4Cut: 51,
      grade5Cut: 39,
      grade6Cut: 27,
      grade7Cut: 15,
      grade8Cut: 3,
      grade9Cut: 0,
    },
    DI: {
      testType: 'DI',
      mean: 47, // 예상 평균 (45-50점)
      stdDev: 20, // 예상 표준편차 (18-22점)
      grade1Cut: 89,
      grade2Cut: 77,
      grade3Cut: 65,
      grade4Cut: 53,
      grade5Cut: 41,
      grade6Cut: 29,
      grade7Cut: 17,
      grade8Cut: 5,
      grade9Cut: 0,
    },
    TRI: {
      testType: 'TRI',
      mean: 42.5, // 예상 평균 (40-45점)
      stdDev: 24, // 예상 표준편차 (22-26점)
      grade1Cut: 84,
      grade2Cut: 72,
      grade3Cut: 60,
      grade4Cut: 48,
      grade5Cut: 36,
      grade6Cut: 24,
      grade7Cut: 12,
      grade8Cut: 0,
      grade9Cut: 0,
    },
  };

  /**
   * 영역별 통계 (T-Score 계산용)
   * 실제로는 실제 수험생 데이터 축적 후 업데이트 필요
   */
  private static readonly AREA_STATISTICS: { [key in TestType]: AreaStatistics[] } = {
    MONO: [
      { testType: 'MONO', area: '수와 연산', mean: 15.75, stdDev: 8 }, // 31.5점의 50%
      { testType: 'MONO', area: '식의 계산', mean: 7.75, stdDev: 4 }, // 15.5점의 50%
      { testType: 'MONO', area: '방정식', mean: 16.25, stdDev: 8 }, // 32.5점의 50%
      { testType: 'MONO', area: '함수', mean: 10.25, stdDev: 6 }, // 20.5점의 50%
    ],
    DI: [
      { testType: 'DI', area: '수와 연산', mean: 15.25, stdDev: 7.5 }, // 30.5점의 50%
      { testType: 'DI', area: '식의 계산', mean: 7.75, stdDev: 4 }, // 15.5점의 50%
      { testType: 'DI', area: '방정식', mean: 8.75, stdDev: 5 }, // 17.5점의 50%
      { testType: 'DI', area: '함수', mean: 18.25, stdDev: 10 }, // 36.5점의 50%
    ],
    TRI: [
      { testType: 'TRI', area: '실수와 연산', mean: 15.5, stdDev: 7.5 },
      { testType: 'TRI', area: '다항식', mean: 8.5, stdDev: 5 },
      { testType: 'TRI', area: '이차방정식', mean: 8.25, stdDev: 5 },
      { testType: 'TRI', area: '이차함수', mean: 17.75, stdDev: 10 },
    ],
  };

  /**
   * 점수 → 9등급 계산
   */
  static calculate9Grade(testType: TestType, score: number): number {
    const cutoffs = this.GRADE_CUTOFFS[testType];

    if (score >= cutoffs.grade1Cut) return 1;
    if (score >= cutoffs.grade2Cut) return 2;
    if (score >= cutoffs.grade3Cut) return 3;
    if (score >= cutoffs.grade4Cut) return 4;
    if (score >= cutoffs.grade5Cut) return 5;
    if (score >= cutoffs.grade6Cut) return 6;
    if (score >= cutoffs.grade7Cut) return 7;
    if (score >= cutoffs.grade8Cut) return 8;
    return 9;
  }

  /**
   * 백분위 → 5등급 계산 (2028 대입제도 개편안)
   * 1등급: 상위 10% (0-10%)
   * 2등급: 상위 11~34% (누적 34%)
   * 3등급: 상위 35~66% (누적 66%)
   * 4등급: 상위 67~90% (누적 90%)
   * 5등급: 상위 91~100% (누적 100%)
   */
  static calculate5Grade(percentile: number): number {
    // percentile은 누적 백분위 (0-100)
    // 상위 몇 %인지 계산
    const topPercent = 100 - percentile;

    if (topPercent <= 10) return 1;      // 상위 10%
    if (topPercent <= 34) return 2;      // 상위 11~34%
    if (topPercent <= 66) return 3;      // 상위 35~66%
    if (topPercent <= 90) return 4;      // 상위 67~90%
    return 5;                             // 상위 91~100%
  }

  /**
   * 백분위 계산 (정규분포 기반)
   */
  static calculatePercentile(testType: TestType, score: number): number {
    const cutoffs = this.GRADE_CUTOFFS[testType];
    const mean = cutoffs.mean;
    const stdDev = cutoffs.stdDev;

    // Z-Score 계산
    const zScore = (score - mean) / stdDev;

    // 표준정규분포 누적확률 근사 계산 (Abramowitz and Stegun 근사식)
    const percentile = this.normalCDF(zScore) * 100;

    return Math.max(0, Math.min(100, percentile));
  }

  /**
   * 표준정규분포 누적확률 함수 (CDF)
   */
  private static normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - prob : prob;
  }

  /**
   * T-Score 계산
   * T = 50 + 10 * (X - μ) / σ
   */
  static calculateTScore(testType: TestType, area: string, earnedScore: number): number {
    const areaStats = this.AREA_STATISTICS[testType].find(s => s.area === area);
    if (!areaStats) {
      return 50; // 기본값
    }

    const { mean, stdDev } = areaStats;
    const tScore = 50 + 10 * ((earnedScore - mean) / stdDev);

    return Math.max(0, Math.min(100, tScore));
  }

  /**
   * 고1 예상 등급 계산
   */
  static calculateExpectedHighSchoolGrade(testType: TestType, grade9: number): string {
    const mapping: { [key in TestType]: { [grade: number]: string } } = {
      MONO: {
        1: '1~2등급',
        2: '2~3등급',
        3: '3~4등급',
        4: '4~5등급',
        5: '5~6등급',
        6: '6~7등급',
        7: '7~8등급',
        8: '8~9등급',
        9: '9등급',
      },
      DI: {
        1: '1등급',
        2: '1~2등급',
        3: '2~3등급',
        4: '3~4등급',
        5: '4~5등급',
        6: '5~6등급',
        7: '6~7등급',
        8: '7~8등급',
        9: '8~9등급',
      },
      TRI: {
        1: '1등급',
        2: '1~2등급',
        3: '2~3등급',
        4: '3~4등급',
        5: '4~5등급',
        6: '5~6등급',
        7: '6~7등급',
        8: '7~8등급',
        9: '8~9등급',
      },
    };

    return mapping[testType][grade9] || '정보 없음';
  }

  /**
   * 등급컷 정보 가져오기
   */
  static getGradeCutoffs(testType: TestType): GradeCutoffs {
    return this.GRADE_CUTOFFS[testType];
  }
}
