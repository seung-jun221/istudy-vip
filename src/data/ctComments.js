/**
 * CT(개념구조화 테스트) 동적 코멘트 데이터
 * 영역별, 문항별, 종합 분석 코멘트
 */

// 영역별 코멘트
export const CT_AREA_COMMENTS = {
  "소인수분해": {
    excellent: {
      tScoreMin: 70,
      comment: "소인수분해의 원리를 완벽하게 이해하고 있습니다. 약수를 체계적으로 정리하는 능력이 뛰어나며, 표를 활용한 분류도 정확합니다. 중등 과정의 소인수분해 심화로 자연스럽게 확장할 수 있는 탄탄한 기초를 갖추었습니다.",
      advice: "중1 소인수분해 심화 문제에 도전해보세요. 특히 최대공약수와 최소공배수 활용 문제로 확장하면 좋습니다."
    },
    good: {
      tScoreMin: 60,
      comment: "소인수분해의 기본 개념은 확실히 이해하고 있습니다. 표를 활용한 약수 정리도 대체로 정확하나, 소인수가 3개 이상일 때 일부 누락이 발생합니다.",
      advice: "소인수 3개짜리 수의 약수 표를 여러 번 연습하여 체계적 분류 능력을 강화하세요."
    },
    average: {
      tScoreMin: 40,
      comment: "소인수분해는 할 수 있으나, 약수를 표로 체계적으로 정리하는 것이 어렵습니다. 일부 약수를 빠뜨리거나 중복 작성하는 경우가 있습니다.",
      advice: "약수 표 작성 연습을 충분히 하세요. 소인수 2개짜리부터 차근차근 연습 후 3개로 확장하세요."
    },
    weak: {
      tScoreMin: 30,
      comment: "소인수분해의 기본 원리가 불완전합니다. 소수와 합성수의 구분이 혼동되고, 거듭제곱 표현도 어려워합니다.",
      advice: "소수 판별부터 다시 학습하세요. 100 이하의 소수를 외우고, 간단한 수의 소인수분해부터 연습하세요."
    },
    critical: {
      tScoreMin: 0,
      comment: "소인수분해 개념이 거의 형성되지 않았습니다. 초등 5학년 약수와 배수 단원부터 다시 학습이 필요합니다.",
      advice: "약수와 배수의 기본 개념부터 시작하세요. 곱셈구구를 활용한 약수 찾기 연습이 필요합니다."
    }
  },

  "약수의 개수": {
    excellent: {
      tScoreMin: 70,
      comment: "약수의 개수 공식 (a+1)(b+1)(c+1)을 완벽하게 이해하고 활용합니다. 특히 '약수가 3개인 수 = 소수의 제곱'이라는 핵심 원리를 정확히 파악하고 있어, 다양한 응용 문제도 해결할 수 있습니다.",
      advice: "약수의 개수가 홀수인 수(제곱수)와 약수의 합 공식까지 확장 학습하면 중등 심화에 도움이 됩니다."
    },
    good: {
      tScoreMin: 60,
      comment: "약수 개수 공식을 알고 있으며, 대부분의 문제에서 정확히 적용합니다. 다만 조건이 복합적인 문제(순서쌍 찾기 등)에서 일부 경우를 놓치는 경우가 있습니다.",
      advice: "경우를 체계적으로 나누는 연습을 하세요. 표나 트리 구조로 모든 경우를 정리하는 습관을 들이세요."
    },
    average: {
      tScoreMin: 40,
      comment: "약수 개수 공식은 알지만, 이를 활용한 문제 해결에 어려움이 있습니다. 특히 '약수가 3개'라는 조건을 '소수의 제곱'으로 연결하는 것이 익숙하지 않습니다.",
      advice: "약수 개수가 1개, 2개, 3개, 4개인 수의 특징을 각각 정리해보세요. 패턴을 찾는 연습이 필요합니다."
    },
    weak: {
      tScoreMin: 30,
      comment: "약수의 개수를 구할 때 공식보다 직접 세는 방법에 의존합니다. 이로 인해 큰 수에서는 오류가 많이 발생합니다.",
      advice: "소인수분해와 약수 개수 공식의 연결고리를 이해하세요. 작은 수로 공식이 왜 성립하는지 직접 확인해보세요."
    },
    critical: {
      tScoreMin: 0,
      comment: "약수의 개수 개념 자체가 불명확합니다. 약수가 무엇인지, 어떻게 찾는지부터 다시 학습이 필요합니다.",
      advice: "12, 18, 24 같은 작은 수의 약수를 직접 나열하는 연습부터 시작하세요."
    }
  },

  "제곱수": {
    excellent: {
      tScoreMin: 70,
      comment: "제곱수의 정의와 특성을 완벽히 이해합니다. 제곱수가 '약수의 개수가 홀수인 수'라는 성질도 알고 있으며, 다양한 문제에 활용할 수 있습니다.",
      advice: "완전제곱식과의 연결, 그리고 제곱근 개념으로 자연스럽게 확장하세요."
    },
    good: {
      tScoreMin: 60,
      comment: "기본 제곱수는 잘 알고 있습니다. 1부터 15까지의 제곱수를 정확히 나열할 수 있습니다.",
      advice: "20까지의 제곱수를 암기하고, 제곱수 판별 연습을 더 해보세요."
    },
    average: {
      tScoreMin: 40,
      comment: "제곱수의 정의는 알지만, 빠르게 떠올리지 못합니다. 작은 제곱수(1,4,9,16,25)는 알지만 그 이후는 계산이 필요합니다.",
      advice: "1²부터 15²까지 반복 학습하여 암기하세요."
    },
    weak: {
      tScoreMin: 30,
      comment: "제곱수의 정의가 불명확합니다. '같은 수를 두 번 곱한 수'라는 개념이 확실하지 않습니다.",
      advice: "거듭제곱 표현부터 다시 학습하세요. 2²=4, 3²=9 등 기본부터 시작하세요."
    },
    critical: {
      tScoreMin: 0,
      comment: "제곱 연산 자체에 대한 이해가 부족합니다.",
      advice: "곱셈의 기본부터 복습하고, 같은 수를 반복해서 곱하는 연습을 하세요."
    }
  },

  "개념 서술": {
    excellent: {
      tScoreMin: 70,
      comment: "수학적 개념을 정확하고 논리적으로 서술할 수 있습니다. '왜 그런지'를 명확하게 설명하며, 예시를 들어 자신의 생각을 뒷받침합니다.",
      advice: "증명 형식의 서술에 도전해보세요. 가정-추론-결론 구조로 글을 써보는 연습을 하세요."
    },
    good: {
      tScoreMin: 60,
      comment: "개념을 대체로 정확하게 서술합니다. 다만 핵심 포인트가 누락되거나, 설명이 다소 장황한 경우가 있습니다.",
      advice: "핵심 키워드 위주로 간결하게 서술하는 연습을 하세요."
    },
    average: {
      tScoreMin: 40,
      comment: "개념을 알고는 있으나, 글로 표현하는 것이 어렵습니다. 생각은 있지만 논리적 순서로 정리하지 못합니다.",
      advice: "문제 해결 과정을 말로 설명하는 연습을 먼저 하고, 그 다음 글로 옮겨보세요."
    },
    weak: {
      tScoreMin: 30,
      comment: "서술 자체에 어려움이 많습니다. 개념 이해도 부족하고, 표현력도 부족합니다.",
      advice: "짧은 문장으로 핵심만 쓰는 연습부터 시작하세요. '~이다. 왜냐하면 ~이기 때문이다.' 형식을 활용하세요."
    },
    critical: {
      tScoreMin: 0,
      comment: "서술형 문제에 답을 작성하지 못했습니다.",
      advice: "정답이 아니어도 생각한 것을 적는 습관부터 들이세요."
    }
  },

  "소수": {
    excellent: {
      tScoreMin: 70,
      comment: "소수의 정의와 성질을 완벽히 이해합니다. '1과 자기 자신만을 약수로 가지는 수'라는 정의를 정확히 알고, 곱셈에서 소수가 나오려면 하나가 1이어야 한다는 것도 이해합니다.",
      advice: "소수 판별법(에라토스테네스의 체)을 학습하고, 암호와 소수의 관계도 탐구해보세요."
    },
    good: {
      tScoreMin: 60,
      comment: "기본적인 소수 개념은 이해하고 있습니다. 20 이하의 소수를 정확히 알고 있습니다.",
      advice: "50까지의 소수를 암기하고, 소수 판별을 빠르게 하는 연습을 하세요."
    },
    average: {
      tScoreMin: 40,
      comment: "소수의 정의는 알지만, 실제 문제에 적용할 때 혼동이 있습니다. 특히 1이 소수가 아닌 이유를 명확히 설명하지 못합니다.",
      advice: "소수의 정의를 다시 정리하고, 1~30 사이의 수를 소수와 합성수로 분류해보세요."
    },
    weak: {
      tScoreMin: 30,
      comment: "소수와 합성수의 구분이 불명확합니다. 4나 6을 소수로 착각하거나, 1을 소수로 생각하는 경우가 있습니다.",
      advice: "소수의 정의부터 다시 학습하세요. 약수가 정확히 2개인 수만 소수입니다."
    },
    critical: {
      tScoreMin: 0,
      comment: "소수 개념이 전혀 형성되지 않았습니다.",
      advice: "약수의 개념부터 다시 시작하고, 작은 수의 약수를 직접 나열해보세요."
    }
  }
};

// 문항별 부분 점수 피드백
export const CT_QUESTION_FEEDBACK = {
  6: { // 14점 만점 - 서술형 (가장 배점 높음)
    maxScore: 14.0,
    topic: "제곱수와 약수 3개인 수 구하는 방법 서술",
    feedback: {
      excellent: {
        range: [12.5, 14.0],
        text: "제곱수와 약수 3개인 수의 특징을 정확하고 논리적으로 서술했습니다. 예시와 함께 핵심 원리를 명확히 설명했습니다."
      },
      good: {
        range: [9.5, 12.0],
        text: "핵심 개념은 이해했으나, 일부 설명이 부족하거나 예시가 불완전합니다. '소수의 제곱 = 약수 3개'라는 연결고리를 좀 더 명확히 해주세요."
      },
      average: {
        range: [7.0, 9.0],
        text: "기본 아이디어는 있으나, 논리적 설명이 부족합니다. 제곱수와 '약수 3개인 수'가 다르다는 것을 구분하여 서술할 필요가 있습니다."
      },
      weak: {
        range: [4.0, 6.5],
        text: "개념 이해가 불완전합니다. 제곱수(약수 홀수개)와 소수의 제곱(약수 3개)을 혼동하고 있을 수 있습니다."
      },
      critical: {
        range: [0, 3.5],
        text: "서술이 거의 없거나, 개념을 잘못 이해하고 있습니다. 제곱수와 약수의 기본 개념부터 다시 학습이 필요합니다."
      }
    }
  },

  8: { // 12점 만점 - a×b×c=소수 순서쌍
    maxScore: 12.0,
    topic: "a×b×c가 소수일 때 순서쌍 찾기",
    feedback: {
      excellent: {
        range: [10.5, 12.0],
        text: "모든 순서쌍을 빠짐없이 찾았습니다. 체계적인 경우 분류 능력이 뛰어납니다."
      },
      good: {
        range: [8.5, 10.0],
        text: "대부분의 순서쌍을 찾았으나 일부 누락이 있습니다. 경우를 나눌 때 빠진 것이 없는지 확인하는 습관을 들이세요."
      },
      average: {
        range: [6.0, 8.0],
        text: "기본적인 경우는 찾았으나, 체계적 분류가 부족합니다. (1,1,소수), (1,소수,1), (소수,1,1) 세 가지 경우를 모두 고려했는지 확인하세요."
      },
      weak: {
        range: [3.5, 5.5],
        text: "일부 경우만 찾았습니다. a×b×c=소수가 되려면 두 개가 1이어야 한다는 핵심 원리를 다시 확인하세요."
      },
      critical: {
        range: [0, 3.0],
        text: "거의 찾지 못했습니다. 소수의 정의와 곱셈의 성질을 다시 학습하세요."
      }
    }
  },

  10: { // 12점 만점 - a×b×c 약수 3개 순서쌍
    maxScore: 12.0,
    topic: "a×b×c 약수 개수가 3개일 때 순서쌍 찾기",
    feedback: {
      excellent: {
        range: [10.5, 12.0],
        text: "모든 경우를 체계적으로 분류하여 정확히 찾았습니다. 약수 개수 공식 활용 능력이 뛰어납니다."
      },
      good: {
        range: [8.5, 10.0],
        text: "대부분 찾았으나 일부 누락이 있습니다. 1×1×(소수)² 형태와 1×(소수)×(소수) 형태를 모두 고려했는지 확인하세요."
      },
      average: {
        range: [6.0, 8.0],
        text: "기본 경우는 찾았으나 복잡한 경우에서 누락이 많습니다. 약수 3개 = (소수)² 라는 핵심을 기억하세요."
      },
      weak: {
        range: [3.5, 5.5],
        text: "문제 이해가 부족합니다. a×b×c의 결과값이 약수 3개를 가지려면 어떤 형태여야 하는지 먼저 파악하세요."
      },
      critical: {
        range: [0, 3.0],
        text: "거의 풀지 못했습니다. 약수의 개수 공식부터 다시 학습이 필요합니다."
      }
    }
  }
};

// 종합 분석 코멘트
export const CT_OVERALL_COMMENTS = {
  excellent: {
    scoreRange: [88, 100],
    summary: "초등 수학 개념이 탄탄하게 형성되어 있습니다. 중등 심화 과정으로 바로 진입해도 무리가 없으며, 영재교육원이나 경시대회 준비도 고려해볼 만합니다.",
    recommendation: "중1 정규 과정을 빠르게 학습하고, 사고력 수학 문제에 도전하세요.",
    nextStep: "MONO 진단검사 응시 권장"
  },
  good: {
    scoreRange: [70, 87],
    summary: "초등 수학의 핵심 개념을 잘 이해하고 있습니다. 일부 심화 영역에서 보완이 필요하지만, 중등 과정 진입에 큰 어려움은 없습니다.",
    recommendation: "취약 영역을 보완한 후 중1 과정을 시작하세요.",
    nextStep: "약점 보완 후 MONO 진단검사 응시"
  },
  average: {
    scoreRange: [50, 69],
    summary: "기본 개념은 이해하고 있으나, 응용력이 부족합니다. 중등 진입 전 현행 완성도를 높이는 것이 중요합니다.",
    recommendation: "현재 약점 영역을 집중 보완하고, 기본 문제 반복 연습 후 중등 과정을 시작하세요.",
    nextStep: "초등 심화 학습 후 재응시 권장"
  },
  weak: {
    scoreRange: [30, 49],
    summary: "초등 수학 핵심 개념의 이해가 불완전합니다. 중등 선행보다 현행 완성이 우선입니다.",
    recommendation: "초5-6 수학 개념을 다시 정리하고, 기초 문제부터 충분히 연습하세요.",
    nextStep: "초등 개념 완성 학습 필요"
  },
  critical: {
    scoreRange: [0, 29],
    summary: "초등 수학 기초 개념이 많이 부족합니다. 체계적인 기초 보완 학습이 필요합니다.",
    recommendation: "초등 저학년 연산부터 다시 점검하고, 개념 학습에 집중하세요.",
    nextStep: "기초 보완반 학습 권장"
  }
};

// CT 전용 학습 전략 가이드 카테고리
export const CT_STRATEGY_CATEGORIES = [
  {
    title: "선행 VS 심화",
    leftLabel: "심화",
    rightLabel: "선행",
    description: "현행 완성도를 우선으로 할지, 선행 진도를 우선으로 할지",
    key: "advanceVsDeepen"
  },
  {
    title: "개념 VS 문제풀이",
    leftLabel: "개념",
    rightLabel: "문제풀이",
    description: "개념 이해 중심 학습 vs 문제 풀이 중심 학습",
    key: "conceptVsPractice"
  },
  {
    title: "학원 VS 과외",
    leftLabel: "학원",
    rightLabel: "과외",
    description: "그룹 학습 vs 개인 맞춤 학습",
    key: "groupVsPrivate"
  },
  {
    title: "일반 VS 영재원",
    leftLabel: "일반",
    rightLabel: "영재원",
    description: "일반 학원 vs 영재교육원/경시대회 준비",
    key: "normalVsGifted"
  }
];

// 코멘트 조회 함수
export const getAreaComment = (areaName, scoreRate) => {
  const areaComments = CT_AREA_COMMENTS[areaName];
  if (!areaComments) return null;

  if (scoreRate >= 90) return areaComments.excellent;
  if (scoreRate >= 70) return areaComments.good;
  if (scoreRate >= 50) return areaComments.average;
  if (scoreRate >= 30) return areaComments.weak;
  return areaComments.critical;
};

export const getOverallComment = (totalScore) => {
  if (totalScore >= 88) return CT_OVERALL_COMMENTS.excellent;
  if (totalScore >= 70) return CT_OVERALL_COMMENTS.good;
  if (totalScore >= 50) return CT_OVERALL_COMMENTS.average;
  if (totalScore >= 30) return CT_OVERALL_COMMENTS.weak;
  return CT_OVERALL_COMMENTS.critical;
};

export const getQuestionFeedback = (questionNum, earnedScore) => {
  const feedbackData = CT_QUESTION_FEEDBACK[questionNum];
  if (!feedbackData) return null;

  for (const [level, data] of Object.entries(feedbackData.feedback)) {
    if (earnedScore >= data.range[0] && earnedScore <= data.range[1]) {
      return {
        level,
        text: data.text
      };
    }
  }
  return null;
};

export default {
  CT_AREA_COMMENTS,
  CT_QUESTION_FEEDBACK,
  CT_OVERALL_COMMENTS,
  CT_STRATEGY_CATEGORIES,
  getAreaComment,
  getOverallComment,
  getQuestionFeedback
};
