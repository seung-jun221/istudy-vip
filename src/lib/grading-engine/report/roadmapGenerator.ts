/**
 * 3개월 학습 로드맵 생성기
 *
 * 학생의 성적 레벨과 영역별 결과에 따라
 * 맞춤형 3단계 학습 로드맵을 제공합니다.
 */

import { TestType, AreaType } from '../types';
import { PerformanceLevel, getTScoreLevel } from './levelMapper';

export interface Roadmap {
  step1: string; // 1단계 (1~2개월)
  step2: string; // 2단계 (2~3개월)
  step3: string; // 3단계 (3개월 이후)
}

/**
 * 종합 성적 레벨에 따른 기본 로드맵
 */
const BASE_ROADMAPS: Record<PerformanceLevel, Roadmap> = {
  EXCELLENT: {
    step1: '현재 학년 심화 문제를 풀며 사고력을 키웁니다. 수학 경시대회 기출 문제에 도전해보세요.',
    step2: '다음 학기 또는 다음 학년 수학을 선행하며 개념을 확장합니다. 심화 문제집을 병행하세요.',
    step3: '고등 수학을 준비하거나, 수학 경시대회 및 영재교육원 과정에 도전합니다.',
  },
  GOOD: {
    step1: '틀린 문제를 복습하고, 유사 문제를 풀어 완벽하게 이해합니다. 약한 영역을 집중 보완하세요.',
    step2: '현재 학년의 심화 문제에 도전하며 실력을 향상시킵니다. 다양한 유형의 문제를 접해보세요.',
    step3: '다음 학기 내용을 선행하거나, 현재 과정의 고난도 문제를 마스터합니다.',
  },
  AVERAGE: {
    step1: '기본 개념을 다시 정리하고, 교과서 기본 문제를 완벽하게 풀 수 있도록 연습합니다.',
    step2: '약한 영역을 집중적으로 학습하고, 다양한 유형의 문제를 풀어봅니다.',
    step3: '전체 과정을 복습한 후, 중급 난이도의 문제집으로 실력을 키웁니다.',
  },
  WEAK: {
    step1: '기초 개념부터 차근차근 다시 학습합니다. 이전 학년 내용도 함께 복습이 필요할 수 있습니다.',
    step2: '기본 문제를 반복해서 풀며 자신감을 키웁니다. 1:1 맞춤 학습이 효과적입니다.',
    step3: '현재 학년의 기본 과정을 완전히 이해한 후, 다음 단계로 나아갑니다.',
  },
  CRITICAL: {
    step1: '기초 개념부터 체계적으로 학습합니다. 전문가의 도움을 받아 1:1 맞춤 교육이 필요합니다.',
    step2: '이전 학년 내용을 복습하며 기본기를 탄탄히 다집니다. 천천히 진도를 나가세요.',
    step3: '현재 학년의 필수 개념을 완전히 이해하는 것을 목표로 합니다.',
  },
};

/**
 * 시험별 특화 로드맵 (선행/심화 방향)
 */
const TEST_SPECIFIC_ROADMAPS: Record<TestType, Record<PerformanceLevel, Roadmap>> = {
  MONO: {
    EXCELLENT: {
      step1: '중1-1 과정을 완벽히 마스터하고, 중1-2 (기하) 과정을 선행합니다.',
      step2: '중2 수학 (식의 계산, 부등식, 연립방정식)을 선행하며 대수 능력을 강화합니다.',
      step3: '중3 과정까지 선행하거나, 중등 수학 경시대회에 도전합니다.',
    },
    GOOD: {
      step1: '틀린 영역(방정식, 함수 등)을 집중 복습하고, 중1-2 과정을 준비합니다.',
      step2: '중1-2 (기하) 과정을 학습하며 도형 감각을 키웁니다.',
      step3: '중1 전 과정을 복습한 후, 중2 수학 선행을 시작합니다.',
    },
    AVERAGE: {
      step1: '방정식과 함수의 기본 개념을 확실히 다집니다. 문제 풀이 연습을 충분히 하세요.',
      step2: '중1-1 전 과정을 복습하고, 중1-2 (기하)를 학습합니다.',
      step3: '중1 전체 과정을 마스터한 후, 중2 예습을 시작합니다.',
    },
    WEAK: {
      step1: '소인수분해, 정수의 사칙연산, 일차방정식을 집중 학습합니다.',
      step2: '중1-1의 기본 문제를 반복 연습하며 자신감을 키웁니다.',
      step3: '중1-1 과정을 완전히 이해한 후 중1-2로 넘어갑니다.',
    },
    CRITICAL: {
      step1: '초등 수학(약수, 배수, 분수)을 복습하고 중1 기초 개념을 학습합니다.',
      step2: '1:1 맞춤 수업으로 기본 개념을 천천히 학습합니다.',
      step3: '중1-1 필수 개념(정수, 방정식)을 완전히 이해하는 것이 목표입니다.',
    },
  },

  DI: {
    EXCELLENT: {
      step1: '중2-1 과정을 완벽히 마스터하고, 중2-2 (기하) 과정을 선행합니다.',
      step2: '중3 수학 (인수분해, 이차방정식, 이차함수)를 선행합니다.',
      step3: '고1 수학(다항식, 방정식과 부등식)까지 선행하거나 경시대회에 도전합니다.',
    },
    GOOD: {
      step1: '틀린 영역(식의 계산, 연립방정식 등)을 복습하고 중2-2 과정을 준비합니다.',
      step2: '중2-2 (기하) 과정을 학습하며 도형 추론 능력을 키웁니다.',
      step3: '중2 전 과정 복습 후 중3 수학 선행을 시작합니다.',
    },
    AVERAGE: {
      step1: '곱셈공식과 연립방정식의 기본 개념을 확실히 합니다.',
      step2: '중2-1 전 과정을 복습하고 중2-2 (기하)를 학습합니다.',
      step3: '중2 전체 과정을 마스터한 후 중3 예습을 시작합니다.',
    },
    WEAK: {
      step1: '지수법칙, 곱셈공식, 연립방정식 풀이를 집중 학습합니다.',
      step2: '중1 내용(일차방정식, 일차식)을 복습하며 기본기를 다집니다.',
      step3: '중2-1 기본 과정을 완전히 이해한 후 다음 단계로 나아갑니다.',
    },
    CRITICAL: {
      step1: '중1 내용(문자와 식, 일차방정식)을 복습하고 중2 기초를 학습합니다.',
      step2: '1:1 맞춤 수업으로 다항식 계산과 방정식 풀이를 천천히 학습합니다.',
      step3: '중2-1 필수 개념을 완전히 이해하는 것이 목표입니다.',
    },
  },

  TRI: {
    EXCELLENT: {
      step1: '중3 전 과정을 완벽히 마스터하고, 고1 수학을 본격적으로 선행합니다.',
      step2: '고1 수학(방정식과 부등식, 도형의 방정식)을 학습합니다.',
      step3: '고2 수학(수열, 지수와 로그)까지 선행하거나 수능 대비를 시작합니다.',
    },
    GOOD: {
      step1: '틀린 영역(이차방정식, 이차함수 등)을 복습하고 고1 수학을 준비합니다.',
      step2: '고1 수학의 기초 과정(다항식, 방정식)을 선행합니다.',
      step3: '중3과 고1 과정을 완벽히 한 후, 고2 수학을 준비합니다.',
    },
    AVERAGE: {
      step1: '인수분해와 이차방정식의 기본 개념을 확실히 합니다.',
      step2: '중3 전 과정을 복습하고, 고1 수학 예습을 시작합니다.',
      step3: '중3 전체를 마스터한 후 고1 본격 학습을 시작합니다.',
    },
    WEAK: {
      step1: '인수분해, 이차방정식 풀이를 집중 학습합니다.',
      step2: '중2 내용(곱셈공식, 식의 계산)을 복습하며 기본기를 다집니다.',
      step3: '중3 기본 과정을 완전히 이해한 후 다음 단계로 나아갑니다.',
    },
    CRITICAL: {
      step1: '중2 내용(다항식 계산, 인수분해)을 복습하고 중3 기초를 학습합니다.',
      step2: '1:1 맞춤 수업으로 이차방정식과 이차함수를 천천히 학습합니다.',
      step3: '중3 필수 개념을 완전히 이해하는 것이 목표입니다.',
    },
  },
};

/**
 * 약한 영역 기반 로드맵 보완
 *
 * @param baseRoadmap - 기본 로드맵
 * @param weakAreas - 약한 영역 리스트
 * @param testType - 시험 타입
 * @returns 보완된 로드맵
 */
function addWeakAreaGuidance(
  baseRoadmap: Roadmap,
  weakAreas: AreaType[],
  testType: TestType
): Roadmap {
  if (weakAreas.length === 0) {
    return baseRoadmap;
  }

  const weakAreaText = weakAreas.join(', ');

  return {
    step1: `${baseRoadmap.step1} 특히 "${weakAreaText}" 영역을 집중적으로 보완하세요.`,
    step2: baseRoadmap.step2,
    step3: baseRoadmap.step3,
  };
}

/**
 * 학습 로드맵 생성
 *
 * @param testType - 시험 타입
 * @param overallTScore - 종합 T-Score
 * @param areaResults - 영역별 결과
 * @returns 3단계 학습 로드맵
 */
export function generateRoadmap(
  testType: TestType,
  overallTScore: number,
  areaResults: Array<{
    area: AreaType;
    tScore: number;
    accuracy: number;
  }>
): Roadmap {
  // 1. 종합 성적 레벨 결정
  const overallLevel = getTScoreLevel(overallTScore);

  // 2. 시험별 특화 로드맵 선택
  const baseRoadmap = TEST_SPECIFIC_ROADMAPS[testType][overallLevel];

  // 3. 약한 영역 찾기 (T-Score 45 미만 또는 정답률 40% 미만)
  const weakAreas = areaResults
    .filter(result => result.tScore < 45 || result.accuracy < 40)
    .map(result => result.area);

  // 4. 약한 영역 기반 로드맵 보완
  const finalRoadmap = addWeakAreaGuidance(baseRoadmap, weakAreas, testType);

  return finalRoadmap;
}

/**
 * 간단한 로드맵 생성 (레벨만 사용)
 *
 * @param level - 성적 레벨
 * @returns 기본 로드맵
 */
export function generateSimpleRoadmap(level: PerformanceLevel): Roadmap {
  return BASE_ROADMAPS[level];
}
