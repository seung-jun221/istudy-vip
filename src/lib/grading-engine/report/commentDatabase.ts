/**
 * 진단검사 보고서용 코멘트 데이터베이스
 *
 * 영역별, 레벨별로 맞춤형 학습 코멘트를 제공합니다.
 */

import { AreaType, TestType } from '../types';
import { PerformanceLevel } from './levelMapper';

export interface AreaComment {
  area: AreaType;
  level: PerformanceLevel;
  comment: string;
  learningTips: string[];
  recommendedResources?: string[];
}

/**
 * MONO 진단검사 (중1-1) 코멘트
 */
const MONO_COMMENTS: Record<string, Record<PerformanceLevel, AreaComment>> = {
  '수와 연산': {
    EXCELLENT: {
      area: '수와 연산',
      level: 'EXCELLENT',
      comment: '소인수분해와 최대공약수/최소공배수 개념을 매우 잘 이해하고 있습니다. 정수와 유리수의 사칙연산도 정확하게 수행할 수 있습니다.',
      learningTips: [
        '심화 문제로 실력을 더욱 발전시키세요',
        '수학 경시대회 기출 문제에 도전해보세요',
        '중2 과정의 유리수와 순환소수를 선행하면 좋습니다',
      ],
    },
    GOOD: {
      area: '수와 연산',
      level: 'GOOD',
      comment: '수와 연산의 기본 개념을 잘 이해하고 있습니다. 약간의 실수만 줄이면 더 좋은 성적을 받을 수 있습니다.',
      learningTips: [
        '계산 과정을 꼼꼼히 검토하는 습관을 기르세요',
        '약수와 배수의 응용 문제를 많이 풀어보세요',
        '음수의 곱셈과 나눗셈에서 부호 실수를 조심하세요',
      ],
    },
    AVERAGE: {
      area: '수와 연산',
      level: 'AVERAGE',
      comment: '기본 개념은 이해하고 있으나, 응용력이 부족합니다. 다양한 유형의 문제를 풀어보며 실력을 향상시켜야 합니다.',
      learningTips: [
        '소인수분해를 이용한 문제 유형을 집중 학습하세요',
        '최대공약수와 최소공배수의 활용 문제를 연습하세요',
        '분수의 사칙연산을 반복 연습하세요',
      ],
    },
    WEAK: {
      area: '수와 연산',
      level: 'WEAK',
      comment: '기본 개념이 부족합니다. 소인수분해와 정수의 사칙연산부터 다시 학습해야 합니다.',
      learningTips: [
        '소인수분해의 개념과 방법을 다시 학습하세요',
        '음수의 사칙연산 규칙을 확실히 익히세요',
        '기본 문제를 반복해서 풀며 자신감을 키우세요',
      ],
    },
    CRITICAL: {
      area: '수와 연산',
      level: 'CRITICAL',
      comment: '기초부터 체계적인 학습이 필요합니다. 초등학교 과정의 약수와 배수, 분수 개념부터 복습이 필요할 수 있습니다.',
      learningTips: [
        '초등 수학의 약수, 배수 개념을 다시 확인하세요',
        '정수의 덧셈과 뺄셈부터 천천히 학습하세요',
        '1:1 맞춤 학습이 효과적일 수 있습니다',
      ],
    },
  },

  '식의 계산': {
    EXCELLENT: {
      area: '식의 계산',
      level: 'EXCELLENT',
      comment: '문자와 식, 일차식의 계산을 완벽하게 이해하고 있습니다. 복잡한 식도 정확하게 정리할 수 있습니다.',
      learningTips: [
        '중2의 다항식 계산으로 선행하면 좋습니다',
        '복잡한 식을 간단히 하는 연습을 하세요',
        '경시대회 유형의 심화 문제에 도전하세요',
      ],
    },
    GOOD: {
      area: '식의 계산',
      level: 'GOOD',
      comment: '일차식의 덧셈, 뺄셈, 곱셈을 잘 수행할 수 있습니다. 분배법칙 적용이 조금 더 정확해지면 좋겠습니다.',
      learningTips: [
        '분배법칙을 활용한 복잡한 식 계산 연습',
        '동류항 정리 시 부호 실수를 조심하세요',
        '괄호가 여러 개 있는 식 계산을 연습하세요',
      ],
    },
    AVERAGE: {
      area: '식의 계산',
      level: 'AVERAGE',
      comment: '기본적인 일차식 계산은 가능하나, 복잡한 식에서 실수가 많습니다. 계산 과정을 차근차근 정리하는 연습이 필요합니다.',
      learningTips: [
        '동류항의 개념을 다시 한 번 정리하세요',
        '계산 과정을 생략하지 말고 단계별로 쓰세요',
        '분배법칙 문제를 집중 연습하세요',
      ],
    },
    WEAK: {
      area: '식의 계산',
      level: 'WEAK',
      comment: '문자를 사용한 식의 계산에 어려움을 겪고 있습니다. 동류항의 개념부터 다시 학습이 필요합니다.',
      learningTips: [
        '문자와 식의 기본 개념을 복습하세요',
        '간단한 일차식부터 차근차근 연습하세요',
        '동류항 찾기 연습을 충분히 하세요',
      ],
    },
    CRITICAL: {
      area: '식의 계산',
      level: 'CRITICAL',
      comment: '문자식 계산의 기초 개념이 부족합니다. 문자의 의미와 항의 개념부터 차근차근 학습해야 합니다.',
      learningTips: [
        '문자를 사용하는 이유부터 이해하세요',
        '가장 간단한 일차식 문제부터 시작하세요',
        '개별 맞춤 지도가 필요합니다',
      ],
    },
  },

  '방정식': {
    EXCELLENT: {
      area: '방정식',
      level: 'EXCELLENT',
      comment: '일차방정식의 풀이와 활용 문제를 완벽하게 해결할 수 있습니다. 미지수가 양변에 있는 복잡한 방정식도 정확하게 풉니다.',
      learningTips: [
        '중2의 연립방정식으로 선행하세요',
        '고난도 활용 문제에 도전하세요',
        '방정식을 이용한 실생활 문제를 많이 풀어보세요',
      ],
    },
    GOOD: {
      area: '방정식',
      level: 'GOOD',
      comment: '일차방정식의 풀이 방법을 잘 알고 있습니다. 활용 문제에서 식을 세우는 능력을 더 키우면 좋겠습니다.',
      learningTips: [
        '다양한 활용 문제 유형을 접해보세요',
        '문제에서 미지수 설정 연습을 하세요',
        '복잡한 방정식 정리 연습을 하세요',
      ],
    },
    AVERAGE: {
      area: '방정식',
      level: 'AVERAGE',
      comment: '기본적인 일차방정식은 풀 수 있으나, 활용 문제에서 어려움을 겪고 있습니다. 문제를 식으로 나타내는 연습이 필요합니다.',
      learningTips: [
        '방정식의 풀이 과정을 단계별로 정리하세요',
        '활용 문제의 기본 유형을 익히세요',
        '등식의 성질을 확실히 이해하세요',
      ],
    },
    WEAK: {
      area: '방정식',
      level: 'WEAK',
      comment: '일차방정식의 기본 풀이법이 부족합니다. 등식의 성질과 이항의 개념부터 다시 학습해야 합니다.',
      learningTips: [
        '등식의 성질을 확실히 익히세요',
        '이항의 원리를 이해하세요',
        '가장 기본적인 방정식부터 연습하세요',
      ],
    },
    CRITICAL: {
      area: '방정식',
      level: 'CRITICAL',
      comment: '방정식의 기본 개념이 부족합니다. 등식과 방정식의 차이부터 이해하고, 기초적인 풀이법을 학습해야 합니다.',
      learningTips: [
        '등식과 방정식의 차이를 이해하세요',
        '방정식의 해가 무엇인지 알아보세요',
        '기초부터 차근차근 개별 지도가 필요합니다',
      ],
    },
  },

  '함수': {
    EXCELLENT: {
      area: '함수',
      level: 'EXCELLENT',
      comment: '좌표와 그래프, 정비례와 반비례 관계를 완벽하게 이해하고 있습니다. 함수의 개념을 정확히 알고 있습니다.',
      learningTips: [
        '중2의 일차함수로 선행하면 좋습니다',
        '실생활에서 함수 관계를 찾아보세요',
        '그래프 해석 심화 문제를 풀어보세요',
      ],
    },
    GOOD: {
      area: '함수',
      level: 'GOOD',
      comment: '좌표평면과 정비례 관계를 잘 이해하고 있습니다. 반비례 그래프의 특징을 조금 더 학습하면 좋겠습니다.',
      learningTips: [
        '반비례 그래프 그리기 연습을 하세요',
        '함수값 구하기 문제를 많이 풀어보세요',
        '그래프를 보고 식 세우기 연습을 하세요',
      ],
    },
    AVERAGE: {
      area: '함수',
      level: 'AVERAGE',
      comment: '좌표의 개념은 이해하고 있으나, 함수 관계 파악에 어려움이 있습니다. 정비례와 반비례의 특징을 더 학습해야 합니다.',
      learningTips: [
        '정비례와 반비례의 정의를 확실히 하세요',
        '그래프 그리기 연습을 많이 하세요',
        'x와 y의 관계를 식으로 나타내는 연습을 하세요',
      ],
    },
    WEAK: {
      area: '함수',
      level: 'WEAK',
      comment: '함수의 기본 개념이 부족합니다. 좌표평면 위의 점 표현부터 다시 학습이 필요합니다.',
      learningTips: [
        '좌표평면의 개념을 다시 학습하세요',
        '순서쌍으로 점을 나타내는 연습을 하세요',
        '가장 간단한 정비례 문제부터 시작하세요',
      ],
    },
    CRITICAL: {
      area: '함수',
      level: 'CRITICAL',
      comment: '함수의 기초 개념이 매우 부족합니다. 좌표와 순서쌍의 개념부터 차근차근 학습해야 합니다.',
      learningTips: [
        '좌표의 개념을 처음부터 배워보세요',
        '점을 좌표평면에 찍는 연습을 충분히 하세요',
        '1:1 맞춤 지도가 필요합니다',
      ],
    },
  },
};

/**
 * DI 진단검사 (중2-1) 코멘트
 */
const DI_COMMENTS: Record<string, Record<PerformanceLevel, AreaComment>> = {
  '실수와 연산': {
    EXCELLENT: {
      area: '실수와 연산',
      level: 'EXCELLENT',
      comment: '유리수와 무리수의 개념을 완벽하게 이해하고 있으며, 실수의 사칙연산을 정확하게 수행합니다.',
      learningTips: [
        '중3의 제곱근과 무리수 심화로 선행하세요',
        '근호를 포함한 복잡한 식 계산에 도전하세요',
        '실수의 대소 비교 고난도 문제를 풀어보세요',
      ],
    },
    GOOD: {
      area: '실수와 연산',
      level: 'GOOD',
      comment: '순환소수와 유리수, 무리수의 분류를 잘 이해하고 있습니다. 근호가 포함된 계산에서 실수만 줄이면 완벽합니다.',
      learningTips: [
        '근호의 곱셈과 나눗셈 규칙을 확실히 하세요',
        '분모의 유리화를 완벽하게 익히세요',
        '제곱근의 성질을 정확히 알아두세요',
      ],
    },
    AVERAGE: {
      area: '실수와 연산',
      level: 'AVERAGE',
      comment: '기본 개념은 이해하고 있으나, 무리수 계산에서 실수가 많습니다. 근호를 포함한 식의 계산 연습이 필요합니다.',
      learningTips: [
        '순환소수를 분수로 나타내는 연습을 하세요',
        '제곱근의 덧셈과 뺄셈 규칙을 익히세요',
        '분모의 유리화 연습을 충분히 하세요',
      ],
    },
    WEAK: {
      area: '실수와 연산',
      level: 'WEAK',
      comment: '유리수와 무리수의 구분이 명확하지 않습니다. 제곱근의 기본 개념부터 다시 학습이 필요합니다.',
      learningTips: [
        '유리수와 무리수의 정의를 확실히 하세요',
        '제곱근의 의미를 이해하세요',
        '근호의 기본 계산부터 차근차근 연습하세요',
      ],
    },
    CRITICAL: {
      area: '실수와 연산',
      level: 'CRITICAL',
      comment: '실수의 기본 개념이 부족합니다. 중1의 정수와 유리수 개념부터 복습이 필요할 수 있습니다.',
      learningTips: [
        '중1의 유리수 개념을 다시 복습하세요',
        '제곱과 제곱근의 관계를 이해하세요',
        '기초부터 체계적인 개별 지도가 필요합니다',
      ],
    },
  },

  '식의 계산': {
    EXCELLENT: {
      area: '식의 계산',
      level: 'EXCELLENT',
      comment: '단항식과 다항식의 계산을 완벽하게 수행합니다. 지수법칙과 곱셈공식을 정확하게 활용할 수 있습니다.',
      learningTips: [
        '중3의 인수분해로 선행하세요',
        '복잡한 곱셈공식 문제에 도전하세요',
        '경시대회 유형의 식 계산 문제를 풀어보세요',
      ],
    },
    GOOD: {
      area: '식의 계산',
      level: 'GOOD',
      comment: '다항식의 사칙연산과 곱셈공식을 잘 이해하고 있습니다. 복잡한 식에서 실수만 줄이면 완벽합니다.',
      learningTips: [
        '곱셈공식의 변형 문제를 연습하세요',
        '복잡한 다항식 계산에서 부호 확인을 철저히 하세요',
        '지수법칙 응용 문제를 풀어보세요',
      ],
    },
    AVERAGE: {
      area: '식의 계산',
      level: 'AVERAGE',
      comment: '기본적인 다항식 계산은 가능하나, 곱셈공식 적용에 어려움이 있습니다. 공식을 정확히 외우고 활용하는 연습이 필요합니다.',
      learningTips: [
        '곱셈공식 3개를 확실히 외우세요',
        '전개 문제를 많이 풀어보세요',
        '지수법칙을 정확히 익히세요',
      ],
    },
    WEAK: {
      area: '식의 계산',
      level: 'WEAK',
      comment: '다항식 계산의 기본이 부족합니다. 동류항 정리와 지수법칙부터 다시 학습해야 합니다.',
      learningTips: [
        '단항식의 곱셈과 나눗셈을 복습하세요',
        '지수법칙을 확실히 익히세요',
        '간단한 다항식 계산부터 연습하세요',
      ],
    },
    CRITICAL: {
      area: '식의 계산',
      level: 'CRITICAL',
      comment: '식의 계산 기초가 매우 부족합니다. 중1의 일차식 계산부터 복습이 필요합니다.',
      learningTips: [
        '중1 일차식 계산을 다시 복습하세요',
        '지수의 의미를 정확히 이해하세요',
        '기초부터 체계적인 학습이 필요합니다',
      ],
    },
  },

  '일차부등식': {
    EXCELLENT: {
      area: '일차부등식',
      level: 'EXCELLENT',
      comment: '부등식의 성질을 완벽하게 이해하고, 일차부등식과 연립부등식을 정확하게 풀 수 있습니다.',
      learningTips: [
        '고난도 활용 문제에 도전하세요',
        '절댓값이 포함된 부등식을 공부하세요',
        '부등식을 이용한 최댓값, 최솟값 문제를 풀어보세요',
      ],
    },
    GOOD: {
      area: '일차부등식',
      level: 'GOOD',
      comment: '일차부등식의 풀이를 잘 수행합니다. 음수를 곱하거나 나눌 때 부등호 방향만 주의하면 완벽합니다.',
      learningTips: [
        '부등식의 성질을 확실히 기억하세요',
        '연립부등식 문제를 많이 풀어보세요',
        '활용 문제의 다양한 유형을 접해보세요',
      ],
    },
    AVERAGE: {
      area: '일차부등식',
      level: 'AVERAGE',
      comment: '기본적인 일차부등식은 풀 수 있으나, 부등호 방향 바꾸기에서 실수가 많습니다. 부등식의 성질을 확실히 익혀야 합니다.',
      learningTips: [
        '부등식의 성질 4가지를 확실히 외우세요',
        '음수를 곱하거나 나눌 때 부등호 방향 확인하세요',
        '수직선에 해를 나타내는 연습을 하세요',
      ],
    },
    WEAK: {
      area: '일차부등식',
      level: 'WEAK',
      comment: '부등식의 기본 개념이 부족합니다. 부등식의 성질부터 다시 학습이 필요합니다.',
      learningTips: [
        '등식과 부등식의 차이를 이해하세요',
        '부등식의 해가 무엇인지 알아보세요',
        '가장 간단한 부등식부터 연습하세요',
      ],
    },
    CRITICAL: {
      area: '일차부등식',
      level: 'CRITICAL',
      comment: '부등식의 기초 개념이 매우 부족합니다. 중1의 일차방정식부터 복습이 필요할 수 있습니다.',
      learningTips: [
        '중1의 일차방정식을 다시 복습하세요',
        '부등호의 의미를 확실히 이해하세요',
        '기초부터 체계적인 학습이 필요합니다',
      ],
    },
  },

  '연립방정식': {
    EXCELLENT: {
      area: '연립방정식',
      level: 'EXCELLENT',
      comment: '가감법과 대입법을 자유자재로 사용하여 연립방정식을 완벽하게 풀 수 있습니다. 활용 문제도 정확하게 해결합니다.',
      learningTips: [
        '고난도 활용 문제에 도전하세요',
        '미지수가 3개인 연립방정식을 공부하세요',
        '연립방정식의 해의 개수 문제를 풀어보세요',
      ],
    },
    GOOD: {
      area: '연립방정식',
      level: 'GOOD',
      comment: '연립방정식의 풀이 방법을 잘 알고 있습니다. 활용 문제에서 식을 세우는 능력을 더 키우면 좋겠습니다.',
      learningTips: [
        '다양한 활용 문제 유형을 접해보세요',
        '가감법과 대입법 중 효율적인 방법을 선택하세요',
        '복잡한 연립방정식 정리 연습을 하세요',
      ],
    },
    AVERAGE: {
      area: '연립방정식',
      level: 'AVERAGE',
      comment: '기본적인 연립방정식은 풀 수 있으나, 계산 과정에서 실수가 많습니다. 체계적인 풀이 연습이 필요합니다.',
      learningTips: [
        '가감법의 원리를 확실히 이해하세요',
        '대입법 연습을 충분히 하세요',
        '풀이 과정을 단계별로 정리하세요',
      ],
    },
    WEAK: {
      area: '연립방정식',
      level: 'WEAK',
      comment: '연립방정식의 기본 풀이법이 부족합니다. 가감법과 대입법의 원리부터 다시 학습해야 합니다.',
      learningTips: [
        '가감법의 원리를 이해하세요',
        '가장 간단한 연립방정식부터 연습하세요',
        '중1의 일차방정식 풀이를 복습하세요',
      ],
    },
    CRITICAL: {
      area: '연립방정식',
      level: 'CRITICAL',
      comment: '연립방정식의 기초 개념이 매우 부족합니다. 중1의 일차방정식부터 복습이 필요합니다.',
      learningTips: [
        '중1의 일차방정식을 다시 복습하세요',
        '미지수가 2개인 방정식의 의미를 이해하세요',
        '기초부터 체계적인 학습이 필요합니다',
      ],
    },
  },
};

/**
 * TRI 진단검사 (중3-1 + 공통수학1) 코멘트
 */
const TRI_COMMENTS: Record<string, Record<PerformanceLevel, AreaComment>> = {
  '다항식': {
    EXCELLENT: {
      area: '다항식',
      level: 'EXCELLENT',
      comment: '인수분해와 다항식의 나눗셈을 완벽하게 수행합니다. 복잡한 식도 정확하게 인수분해할 수 있습니다.',
      learningTips: [
        '고난도 인수분해 문제에 도전하세요',
        '조립제법을 활용한 문제를 풀어보세요',
        '인수정리와 나머지정리 심화 문제를 연습하세요',
      ],
    },
    GOOD: {
      area: '다항식',
      level: 'GOOD',
      comment: '인수분해 공식을 잘 활용하고 있습니다. 복잡한 인수분해에서 실수만 줄이면 완벽합니다.',
      learningTips: [
        '인수분해 공식을 완벽하게 외우세요',
        '치환을 이용한 인수분해를 연습하세요',
        '다항식의 나눗셈 연습을 더 하세요',
      ],
    },
    AVERAGE: {
      area: '다항식',
      level: 'AVERAGE',
      comment: '기본적인 인수분해는 가능하나, 복잡한 식에서 어려움이 있습니다. 다양한 유형의 인수분해 연습이 필요합니다.',
      learningTips: [
        '인수분해 공식을 확실히 익히세요',
        '공통인수로 묶는 연습을 하세요',
        '여러 공식을 조합하여 사용하는 연습을 하세요',
      ],
    },
    WEAK: {
      area: '다항식',
      level: 'WEAK',
      comment: '인수분해의 기본이 부족합니다. 곱셈공식과 인수분해의 관계부터 다시 학습해야 합니다.',
      learningTips: [
        '중2의 곱셈공식을 다시 복습하세요',
        '인수분해가 곱셈공식의 역과정임을 이해하세요',
        '가장 간단한 인수분해부터 연습하세요',
      ],
    },
    CRITICAL: {
      area: '다항식',
      level: 'CRITICAL',
      comment: '다항식의 기초 개념이 매우 부족합니다. 중2의 식의 계산부터 복습이 필요합니다.',
      learningTips: [
        '중2의 다항식 계산을 다시 복습하세요',
        '곱셈공식을 완벽하게 익히세요',
        '기초부터 체계적인 학습이 필요합니다',
      ],
    },
  },

  '이차방정식': {
    EXCELLENT: {
      area: '이차방정식',
      level: 'EXCELLENT',
      comment: '이차방정식의 다양한 풀이 방법을 완벽하게 구사합니다. 근의 공식과 판별식을 정확하게 활용할 수 있습니다.',
      learningTips: [
        '이차방정식의 근과 계수의 관계를 공부하세요',
        '고난도 활용 문제에 도전하세요',
        '이차방정식의 해의 개수 문제를 풀어보세요',
      ],
    },
    GOOD: {
      area: '이차방정식',
      level: 'GOOD',
      comment: '인수분해와 근의 공식을 이용한 풀이를 잘 수행합니다. 판별식의 활용을 조금 더 연습하면 좋겠습니다.',
      learningTips: [
        '판별식의 의미를 확실히 이해하세요',
        '완전제곱식을 이용한 풀이를 연습하세요',
        '다양한 활용 문제를 풀어보세요',
      ],
    },
    AVERAGE: {
      area: '이차방정식',
      level: 'AVERAGE',
      comment: '기본적인 이차방정식은 풀 수 있으나, 근의 공식 사용에서 실수가 많습니다. 체계적인 연습이 필요합니다.',
      learningTips: [
        '근의 공식을 정확히 외우세요',
        '판별식 계산을 꼼꼼히 하세요',
        '인수분해 가능 여부를 먼저 판단하세요',
      ],
    },
    WEAK: {
      area: '이차방정식',
      level: 'WEAK',
      comment: '이차방정식의 기본 풀이법이 부족합니다. 인수분해를 이용한 풀이부터 다시 학습해야 합니다.',
      learningTips: [
        '인수분해를 이용한 풀이를 확실히 익히세요',
        '이차방정식의 해가 무엇인지 이해하세요',
        '간단한 이차방정식부터 연습하세요',
      ],
    },
    CRITICAL: {
      area: '이차방정식',
      level: 'CRITICAL',
      comment: '이차방정식의 기초 개념이 매우 부족합니다. 중1의 일차방정식과 인수분해부터 복습이 필요합니다.',
      learningTips: [
        '중1의 일차방정식을 다시 복습하세요',
        '인수분해를 먼저 완벽하게 익히세요',
        '기초부터 체계적인 학습이 필요합니다',
      ],
    },
  },

  '이차함수': {
    EXCELLENT: {
      area: '이차함수',
      level: 'EXCELLENT',
      comment: '이차함수의 그래프와 성질을 완벽하게 이해하고 있습니다. 최댓값과 최솟값 문제도 정확하게 해결합니다.',
      learningTips: [
        '고1의 이차함수 심화 내용을 선행하세요',
        '이차함수의 평행이동과 대칭이동을 공부하세요',
        '이차함수와 이차방정식의 관계를 깊이 이해하세요',
      ],
    },
    GOOD: {
      area: '이차함수',
      level: 'GOOD',
      comment: '이차함수의 그래프를 잘 그리고, 꼭짓점과 축을 정확하게 구할 수 있습니다. 활용 문제를 더 연습하면 좋겠습니다.',
      learningTips: [
        '이차함수의 최댓값, 최솟값 문제를 많이 풀어보세요',
        '그래프의 이동과 변환을 연습하세요',
        '이차함수의 식 구하기 연습을 하세요',
      ],
    },
    AVERAGE: {
      area: '이차함수',
      level: 'AVERAGE',
      comment: '기본적인 이차함수 그래프는 그릴 수 있으나, 식의 형태 변환에 어려움이 있습니다. 표준형과 일반형의 변환을 연습해야 합니다.',
      learningTips: [
        '이차함수의 표준형을 확실히 익히세요',
        '완전제곱식으로 변형하는 연습을 하세요',
        '꼭짓점 구하는 방법을 확실히 하세요',
      ],
    },
    WEAK: {
      area: '이차함수',
      level: 'WEAK',
      comment: '이차함수의 기본 개념이 부족합니다. 그래프의 성질과 식의 의미부터 다시 학습해야 합니다.',
      learningTips: [
        '이차함수의 그래프 모양을 이해하세요',
        '중1의 정비례, 반비례 그래프를 복습하세요',
        '가장 간단한 이차함수부터 연습하세요',
      ],
    },
    CRITICAL: {
      area: '이차함수',
      level: 'CRITICAL',
      comment: '이차함수의 기초 개념이 매우 부족합니다. 중1의 함수 개념과 좌표평면부터 복습이 필요합니다.',
      learningTips: [
        '중1의 함수 개념을 다시 복습하세요',
        '좌표평면과 그래프의 기초를 이해하세요',
        '기초부터 체계적인 학습이 필요합니다',
      ],
    },
  },
};

/**
 * 시험 타입과 영역에 맞는 코멘트 가져오기
 *
 * @param testType - 시험 타입 (MONO, DI, TRI)
 * @param area - 영역명
 * @param level - 성적 레벨
 * @returns 해당 영역/레벨에 맞는 코멘트
 */
export function getAreaComment(
  testType: TestType,
  area: AreaType,
  level: PerformanceLevel
): AreaComment | null {
  let database: Record<string, Record<PerformanceLevel, AreaComment>>;

  switch (testType) {
    case 'MONO':
      database = MONO_COMMENTS;
      break;
    case 'DI':
      database = DI_COMMENTS;
      break;
    case 'TRI':
      database = TRI_COMMENTS;
      break;
    default:
      return null;
  }

  return database[area]?.[level] || null;
}

/**
 * 모든 영역에 대한 코멘트 생성
 *
 * @param testType - 시험 타입
 * @param areaResults - 영역별 결과 (T-Score 포함)
 * @returns 영역별 코멘트 맵
 */
export function generateAllAreaComments(
  testType: TestType,
  areaResults: Array<{
    area: AreaType;
    tScore: number;
    percentile: number;
    accuracy: number;
  }>
): Record<string, string> {
  const comments: Record<string, string> = {};

  // CT 시험은 별도의 코멘트 시스템을 사용하므로 빈 결과 반환
  if (testType === 'CT') {
    return comments;
  }

  for (const result of areaResults) {
    // T-Score 우선 사용, 없으면 백분위, 없으면 정답률 사용
    let level: PerformanceLevel;
    if (result.tScore && result.tScore > 0) {
      level = getTScoreLevel(result.tScore);
    } else if (result.percentile && result.percentile > 0) {
      level = getPercentileLevel(result.percentile);
    } else {
      level = getAccuracyLevel(result.accuracy);
    }

    const comment = getAreaComment(testType, result.area, level);
    if (comment) {
      comments[result.area] = comment.comment;
    }
  }

  return comments;
}

// levelMapper에서 함수 import
import { getTScoreLevel, getPercentileLevel, getAccuracyLevel } from './levelMapper';
