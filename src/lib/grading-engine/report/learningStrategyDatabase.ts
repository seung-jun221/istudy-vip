/**
 * 6개 카테고리 학습 전략 코멘트 데이터베이스
 *
 * 학생의 학년, 진도, 등급에 따라 맞춤형 학습 전략 멘트를 제공합니다.
 *
 * 6개 카테고리:
 * 1. 선행 VS 심화 (Advance vs Depth)
 * 2. 수능 VS 내신 (CSAT vs School grades)
 * 3. 문과 VS 이과 (Liberal Arts vs Science)
 * 4. 학원 VS 과외 (Academy vs Private tutoring)
 * 5. 일반 VS 몰입 (Regular vs Intensive)
 * 6. 일반 VS 특구 (Regular vs Education Special Zone)
 */

import { TestType } from '../types';

// ============== 타입 정의 ==============

export type GradeLevel = '중1' | '중2' | '중3';
export type ProgressLevel = '느림' | '보통' | '빠름';
export type ScoreGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface StudentProfile {
  gradeLevel: GradeLevel;    // 학년
  progressLevel: ProgressLevel; // 진도 (느림/보통/빠름)
  scoreGrade: ScoreGrade;    // 9등급제 성적
}

export interface StrategyComment {
  categoryId: number;
  categoryName: string;
  leftOption: string;       // 왼쪽 옵션 (예: 선행)
  rightOption: string;      // 오른쪽 옵션 (예: 심화)
  recommendation: 'left' | 'right' | 'balanced';
  commentNumber: string;    // 멘트번호 (예: "1-1", "2-3")
  title: string;           // 제목
  comment: string;         // 상세 멘트
}

export interface LearningStrategyResult {
  strategies: StrategyComment[];
  overallSummary: string;
}

// ============== 카테고리 1: 선행 VS 심화 ==============

const ADVANCE_VS_DEPTH_COMMENTS: Record<string, StrategyComment> = {
  '1-1': {
    categoryId: 1,
    categoryName: '선행 VS 심화',
    leftOption: '선행',
    rightOption: '심화',
    recommendation: 'left',
    commentNumber: '1-1',
    title: '선행 학습 권장',
    comment: '현재 학습 진도가 느린 편입니다. 기본 개념을 빠르게 습득하고 다음 단원으로 넘어가는 선행 학습이 필요합니다. 개념 이해에 집중하되, 심화 문제는 나중으로 미루세요.',
  },
  '1-2': {
    categoryId: 1,
    categoryName: '선행 VS 심화',
    leftOption: '선행',
    rightOption: '심화',
    recommendation: 'balanced',
    commentNumber: '1-2',
    title: '균형 학습 권장',
    comment: '현재 진도와 이해도가 적절합니다. 선행 학습과 심화 학습을 7:3 비율로 병행하세요. 새로운 개념 학습 후 기본 문제로 정리하고, 주말에 심화 문제를 풀어보세요.',
  },
  '1-3': {
    categoryId: 1,
    categoryName: '선행 VS 심화',
    leftOption: '선행',
    rightOption: '심화',
    recommendation: 'right',
    commentNumber: '1-3',
    title: '심화 학습 권장',
    comment: '기본기가 탄탄하고 진도도 빠릅니다. 무리한 선행보다 현재 범위의 심화 문제를 통해 실력을 다지세요. 경시대회 기출이나 서술형 문제에 도전해 보세요.',
  },
  '1-4': {
    categoryId: 1,
    categoryName: '선행 VS 심화',
    leftOption: '선행',
    rightOption: '심화',
    recommendation: 'left',
    commentNumber: '1-4',
    title: '기초 선행 필수',
    comment: '기초 개념이 부족한 상태입니다. 심화보다는 기본 개념의 선행 학습이 시급합니다. 이전 학년 내용도 빠르게 복습하면서 현 학년 진도를 따라가세요.',
  },
  '1-5': {
    categoryId: 1,
    categoryName: '선행 VS 심화',
    leftOption: '선행',
    rightOption: '심화',
    recommendation: 'right',
    commentNumber: '1-5',
    title: '심화 집중 권장',
    comment: '상위권 학생입니다. 빠른 선행보다 현재 단원의 어려운 문제를 정복하세요. 고난도 문제 해결력이 고등학교에서 더 큰 차이를 만듭니다.',
  },
};

// ============== 카테고리 2: 수능 VS 내신 ==============

const CSAT_VS_SCHOOL_COMMENTS: Record<string, StrategyComment> = {
  '2-1': {
    categoryId: 2,
    categoryName: '수능 VS 내신',
    leftOption: '수능형',
    rightOption: '내신형',
    recommendation: 'right',
    commentNumber: '2-1',
    title: '내신 집중 권장',
    comment: '중학교 시기에는 내신이 우선입니다. 학교 수업과 교과서 중심으로 학습하고, 수행평가와 서술형 대비에 신경 쓰세요. 수능형 사고력은 고등학교에서 본격적으로 키워도 됩니다.',
  },
  '2-2': {
    categoryId: 2,
    categoryName: '수능 VS 내신',
    leftOption: '수능형',
    rightOption: '내신형',
    recommendation: 'balanced',
    commentNumber: '2-2',
    title: '균형 대비 권장',
    comment: '내신 준비를 기본으로 하되, 수능형 문제 풀이도 시작하세요. 주중에는 내신, 주말에는 수능형 사고력 문제를 풀어보며 두 가지를 균형 있게 준비하세요.',
  },
  '2-3': {
    categoryId: 2,
    categoryName: '수능 VS 내신',
    leftOption: '수능형',
    rightOption: '내신형',
    recommendation: 'left',
    commentNumber: '2-3',
    title: '수능형 사고력 강화',
    comment: '내신은 이미 안정권입니다. 고등학교 수능을 대비한 사고력 문제에 도전하세요. 수능 기출의 중학교 버전이나 창의사고력 문제집을 활용해 보세요.',
  },
  '2-4': {
    categoryId: 2,
    categoryName: '수능 VS 내신',
    leftOption: '수능형',
    rightOption: '내신형',
    recommendation: 'right',
    commentNumber: '2-4',
    title: '내신 우선 전략',
    comment: '현재 성적으로는 내신에 집중해야 합니다. 학교 진도에 맞춰 개념을 확실히 익히고, 학교 기출문제를 반복 풀이하세요. 내신 안정 후 수능 대비로 넘어가세요.',
  },
  '2-5': {
    categoryId: 2,
    categoryName: '수능 VS 내신',
    leftOption: '수능형',
    rightOption: '내신형',
    recommendation: 'left',
    commentNumber: '2-5',
    title: '수능형 문제 집중',
    comment: '상위권을 유지하고 있습니다. 내신은 현 수준 유지하며 수능형 고난도 문제 해결력을 키우세요. 이 시기에 쌓은 사고력이 고등학교 상위권 유지의 열쇠입니다.',
  },
};

// ============== 카테고리 3: 문과 VS 이과 ==============

const LIBERAL_VS_SCIENCE_COMMENTS: Record<string, StrategyComment> = {
  '3-1': {
    categoryId: 3,
    categoryName: '문과 VS 이과',
    leftOption: '문과형',
    rightOption: '이과형',
    recommendation: 'left',
    commentNumber: '3-1',
    title: '문과 적합형',
    comment: '수학에 다소 어려움을 느끼고 있다면, 문과 계열도 좋은 선택입니다. 하지만 문과도 수학이 필요합니다. 기본 개념 위주로 꾸준히 학습하며 수학 기피증을 극복하세요.',
  },
  '3-2': {
    categoryId: 3,
    categoryName: '문과 VS 이과',
    leftOption: '문과형',
    rightOption: '이과형',
    recommendation: 'balanced',
    commentNumber: '3-2',
    title: '진로 탐색 시기',
    comment: '아직 문/이과 결정을 서두르지 않아도 됩니다. 중학교 수학을 충실히 학습하면서 자신의 적성과 흥미를 파악하세요. 수학 실력이 오르면 선택의 폭이 넓어집니다.',
  },
  '3-3': {
    categoryId: 3,
    categoryName: '문과 VS 이과',
    leftOption: '문과형',
    rightOption: '이과형',
    recommendation: 'right',
    commentNumber: '3-3',
    title: '이과 적합형',
    comment: '수학적 사고력이 우수합니다. 이과 계열 진학을 고려해 보세요. 중학교 때부터 수학 I, 수학 II 선행을 시작하고 과학 과목도 함께 준비하면 좋겠습니다.',
  },
  '3-4': {
    categoryId: 3,
    categoryName: '문과 VS 이과',
    leftOption: '문과형',
    rightOption: '이과형',
    recommendation: 'left',
    commentNumber: '3-4',
    title: '문과 수학 전략',
    comment: '문과를 선택해도 수학은 중요합니다. 기본 개념을 탄탄히 하고 수학적 사고력을 꾸준히 키워가세요. 문과에서 수학을 잘하면 큰 경쟁력이 됩니다.',
  },
  '3-5': {
    categoryId: 3,
    categoryName: '문과 VS 이과',
    leftOption: '문과형',
    rightOption: '이과형',
    recommendation: 'right',
    commentNumber: '3-5',
    title: '이과 심화 권장',
    comment: '수학 영재성이 보입니다. 이과 최상위권을 목표로 심화 학습을 진행하세요. 경시대회 준비나 과학고/영재고 진학도 고려해 볼 만합니다.',
  },
};

// ============== 카테고리 4: 학원 VS 과외 ==============

const ACADEMY_VS_TUTORING_COMMENTS: Record<string, StrategyComment> = {
  '4-1': {
    categoryId: 4,
    categoryName: '학원 VS 과외',
    leftOption: '학원',
    rightOption: '과외',
    recommendation: 'left',
    commentNumber: '4-1',
    title: '학원 수업 권장',
    comment: '기초가 부족한 상태입니다. 체계적인 커리큘럼의 학원에서 기본기를 다지세요. 학원의 정규 수업과 보충 수업을 활용하면 빠른 시간 내에 기초를 잡을 수 있습니다.',
  },
  '4-2': {
    categoryId: 4,
    categoryName: '학원 VS 과외',
    leftOption: '학원',
    rightOption: '과외',
    recommendation: 'balanced',
    commentNumber: '4-2',
    title: '상황에 맞는 선택',
    comment: '학원과 과외 모두 장단점이 있습니다. 학원은 경쟁 분위기와 체계적 관리가 강점이고, 과외는 맞춤형 수업이 장점입니다. 학생의 성향에 맞게 선택하세요.',
  },
  '4-3': {
    categoryId: 4,
    categoryName: '학원 VS 과외',
    leftOption: '학원',
    rightOption: '과외',
    recommendation: 'right',
    commentNumber: '4-3',
    title: '과외 수업 권장',
    comment: '상위권 학생입니다. 학원 진도보다 빠르게 나가거나 심화 학습이 필요하다면 과외가 효율적입니다. 1:1 맞춤 수업으로 약점 보완과 강점 극대화를 하세요.',
  },
  '4-4': {
    categoryId: 4,
    categoryName: '학원 VS 과외',
    leftOption: '학원',
    rightOption: '과외',
    recommendation: 'left',
    commentNumber: '4-4',
    title: '학원 + 자습 병행',
    comment: '학원에서 개념을 배우고, 집에서 충분한 자습 시간을 확보하세요. 학원 숙제를 꼼꼼히 하고 오답 노트를 작성하면 학원 수업의 효과가 배가 됩니다.',
  },
  '4-5': {
    categoryId: 4,
    categoryName: '학원 VS 과외',
    leftOption: '학원',
    rightOption: '과외',
    recommendation: 'right',
    commentNumber: '4-5',
    title: '심화 과외 권장',
    comment: '최상위권을 목표로 한다면 심화 전문 과외를 추천합니다. 경시대회 출신 선생님이나 명문대 수학과 출신 선생님께 고난도 문제 풀이법을 배워보세요.',
  },
};

// ============== 카테고리 5: 일반 VS 몰입 ==============

const REGULAR_VS_INTENSIVE_COMMENTS: Record<string, StrategyComment> = {
  '5-1': {
    categoryId: 5,
    categoryName: '일반 VS 몰입',
    leftOption: '일반 학습',
    rightOption: '몰입 학습',
    recommendation: 'left',
    commentNumber: '5-1',
    title: '일반 학습 권장',
    comment: '현재는 무리한 몰입 학습보다 꾸준한 일반 학습이 좋습니다. 매일 일정한 시간 수학 공부를 하고, 기본 개념을 차근차근 쌓아가세요. 급하게 하면 오히려 역효과입니다.',
  },
  '5-2': {
    categoryId: 5,
    categoryName: '일반 VS 몰입',
    leftOption: '일반 학습',
    rightOption: '몰입 학습',
    recommendation: 'balanced',
    commentNumber: '5-2',
    title: '주기적 몰입 권장',
    comment: '평소에는 일반 학습을 하되, 방학 때는 몰입 학습을 해보세요. 방학 중 2~3주간 수학에 집중하면 한 학기 선행이 가능합니다. 학기 중에는 복습 위주로 가세요.',
  },
  '5-3': {
    categoryId: 5,
    categoryName: '일반 VS 몰입',
    leftOption: '일반 학습',
    rightOption: '몰입 학습',
    recommendation: 'right',
    commentNumber: '5-3',
    title: '몰입 학습 권장',
    comment: '집중력이 좋고 기본기가 탄탄합니다. 방학을 이용한 몰입 학습으로 한 단계 도약하세요. 하루 4~5시간 수학에 집중하면 큰 성과를 얻을 수 있습니다.',
  },
  '5-4': {
    categoryId: 5,
    categoryName: '일반 VS 몰입',
    leftOption: '일반 학습',
    rightOption: '몰입 학습',
    recommendation: 'left',
    commentNumber: '5-4',
    title: '기초부터 천천히',
    comment: '아직은 몰입 학습의 시기가 아닙니다. 기초 개념을 천천히, 확실하게 익히는 것이 우선입니다. 급하게 많은 양을 하기보다 매일 조금씩 꾸준히 하세요.',
  },
  '5-5': {
    categoryId: 5,
    categoryName: '일반 VS 몰입',
    leftOption: '일반 학습',
    rightOption: '몰입 학습',
    recommendation: 'right',
    commentNumber: '5-5',
    title: '고강도 몰입 추천',
    comment: '최상위권 도전이 가능합니다. 방학마다 고강도 몰입 학습 캠프나 프로그램에 참여해 보세요. 단기간에 실력을 크게 끌어올릴 수 있습니다.',
  },
};

// ============== 카테고리 6: 일반 VS 특구 ==============

const REGULAR_VS_SPECIAL_ZONE_COMMENTS: Record<string, StrategyComment> = {
  '6-1': {
    categoryId: 6,
    categoryName: '일반 VS 특구',
    leftOption: '일반 지역',
    rightOption: '교육 특구',
    recommendation: 'left',
    commentNumber: '6-1',
    title: '일반 지역 전략',
    comment: '일반 지역에서도 충분히 상위권이 될 수 있습니다. 온라인 강의와 인강을 적극 활용하고, 자기주도학습 능력을 키우세요. 꾸준함이 가장 중요합니다.',
  },
  '6-2': {
    categoryId: 6,
    categoryName: '일반 VS 특구',
    leftOption: '일반 지역',
    rightOption: '교육 특구',
    recommendation: 'balanced',
    commentNumber: '6-2',
    title: '환경보다 노력',
    comment: '교육 환경보다 학생의 의지가 더 중요합니다. 어디서 공부하든 본인의 노력이 결과를 결정합니다. 주어진 환경에서 최선을 다하세요.',
  },
  '6-3': {
    categoryId: 6,
    categoryName: '일반 VS 특구',
    leftOption: '일반 지역',
    rightOption: '교육 특구',
    recommendation: 'right',
    commentNumber: '6-3',
    title: '특구 환경 활용',
    comment: '교육 특구의 경쟁적 환경이 도움이 될 수 있습니다. 좋은 학원과 스터디 그룹을 활용하고, 경쟁 속에서 동기 부여를 받으세요. 단, 과도한 사교육은 피하세요.',
  },
  '6-4': {
    categoryId: 6,
    categoryName: '일반 VS 특구',
    leftOption: '일반 지역',
    rightOption: '교육 특구',
    recommendation: 'left',
    commentNumber: '6-4',
    title: '자기주도학습 강화',
    comment: '지역에 관계없이 자기주도학습 능력이 핵심입니다. EBS와 무료 온라인 강의를 활용하고, 스스로 계획을 세워 실천하는 습관을 기르세요.',
  },
  '6-5': {
    categoryId: 6,
    categoryName: '일반 VS 특구',
    leftOption: '일반 지역',
    rightOption: '교육 특구',
    recommendation: 'right',
    commentNumber: '6-5',
    title: '최상위권 경쟁 환경',
    comment: '최상위권을 목표로 한다면 경쟁이 치열한 환경도 도움이 됩니다. 우수한 학생들과 함께 공부하며 자극을 받고, 높은 목표를 설정하세요.',
  },
};

// ============== 매칭 로직 ==============

/**
 * 학생 프로필에 맞는 선행/심화 전략 결정
 */
function getAdvanceVsDepthStrategy(profile: StudentProfile): StrategyComment {
  const { gradeLevel, progressLevel, scoreGrade } = profile;

  // 기초 부족 (7-9등급)
  if (scoreGrade >= 7) {
    return ADVANCE_VS_DEPTH_COMMENTS['1-4'];
  }

  // 상위권 (1-2등급)
  if (scoreGrade <= 2) {
    if (progressLevel === '빠름') {
      return ADVANCE_VS_DEPTH_COMMENTS['1-5'];
    }
    return ADVANCE_VS_DEPTH_COMMENTS['1-3'];
  }

  // 중위권 (3-6등급)
  if (progressLevel === '느림') {
    return ADVANCE_VS_DEPTH_COMMENTS['1-1'];
  }
  if (progressLevel === '빠름' && scoreGrade <= 4) {
    return ADVANCE_VS_DEPTH_COMMENTS['1-3'];
  }
  return ADVANCE_VS_DEPTH_COMMENTS['1-2'];
}

/**
 * 학생 프로필에 맞는 수능/내신 전략 결정
 */
function getCSATvsSchoolStrategy(profile: StudentProfile): StrategyComment {
  const { gradeLevel, scoreGrade } = profile;

  // 하위권 (6-9등급)
  if (scoreGrade >= 6) {
    return CSAT_VS_SCHOOL_COMMENTS['2-4'];
  }

  // 상위권 (1-2등급)
  if (scoreGrade <= 2) {
    if (gradeLevel === '중3') {
      return CSAT_VS_SCHOOL_COMMENTS['2-5'];
    }
    return CSAT_VS_SCHOOL_COMMENTS['2-3'];
  }

  // 중위권 (3-5등급)
  if (gradeLevel === '중1') {
    return CSAT_VS_SCHOOL_COMMENTS['2-1'];
  }
  return CSAT_VS_SCHOOL_COMMENTS['2-2'];
}

/**
 * 학생 프로필에 맞는 문과/이과 전략 결정
 */
function getLiberalVsScienceStrategy(profile: StudentProfile): StrategyComment {
  const { scoreGrade } = profile;

  // 하위권 (7-9등급)
  if (scoreGrade >= 7) {
    return LIBERAL_VS_SCIENCE_COMMENTS['3-1'];
  }

  // 최상위권 (1등급)
  if (scoreGrade === 1) {
    return LIBERAL_VS_SCIENCE_COMMENTS['3-5'];
  }

  // 상위권 (2-3등급)
  if (scoreGrade <= 3) {
    return LIBERAL_VS_SCIENCE_COMMENTS['3-3'];
  }

  // 중위권 (4-6등급)
  if (scoreGrade <= 5) {
    return LIBERAL_VS_SCIENCE_COMMENTS['3-2'];
  }
  return LIBERAL_VS_SCIENCE_COMMENTS['3-4'];
}

/**
 * 학생 프로필에 맞는 학원/과외 전략 결정
 */
function getAcademyVsTutoringStrategy(profile: StudentProfile): StrategyComment {
  const { scoreGrade } = profile;

  // 하위권 (7-9등급)
  if (scoreGrade >= 7) {
    return ACADEMY_VS_TUTORING_COMMENTS['4-1'];
  }

  // 최상위권 (1등급)
  if (scoreGrade === 1) {
    return ACADEMY_VS_TUTORING_COMMENTS['4-5'];
  }

  // 상위권 (2-3등급)
  if (scoreGrade <= 3) {
    return ACADEMY_VS_TUTORING_COMMENTS['4-3'];
  }

  // 중위권 (4-6등급)
  if (scoreGrade <= 5) {
    return ACADEMY_VS_TUTORING_COMMENTS['4-2'];
  }
  return ACADEMY_VS_TUTORING_COMMENTS['4-4'];
}

/**
 * 학생 프로필에 맞는 일반/몰입 학습 전략 결정
 */
function getRegularVsIntensiveStrategy(profile: StudentProfile): StrategyComment {
  const { scoreGrade, progressLevel } = profile;

  // 하위권 (7-9등급)
  if (scoreGrade >= 7) {
    return REGULAR_VS_INTENSIVE_COMMENTS['5-4'];
  }

  // 최상위권 (1등급)
  if (scoreGrade === 1) {
    return REGULAR_VS_INTENSIVE_COMMENTS['5-5'];
  }

  // 상위권 (2-3등급)
  if (scoreGrade <= 3) {
    return REGULAR_VS_INTENSIVE_COMMENTS['5-3'];
  }

  // 중위권 (4-6등급)
  if (progressLevel === '느림') {
    return REGULAR_VS_INTENSIVE_COMMENTS['5-1'];
  }
  return REGULAR_VS_INTENSIVE_COMMENTS['5-2'];
}

/**
 * 학생 프로필에 맞는 일반/특구 전략 결정
 */
function getRegularVsSpecialZoneStrategy(profile: StudentProfile): StrategyComment {
  const { scoreGrade } = profile;

  // 하위권 (6-9등급)
  if (scoreGrade >= 6) {
    return REGULAR_VS_SPECIAL_ZONE_COMMENTS['6-4'];
  }

  // 최상위권 (1등급)
  if (scoreGrade === 1) {
    return REGULAR_VS_SPECIAL_ZONE_COMMENTS['6-5'];
  }

  // 상위권 (2-3등급)
  if (scoreGrade <= 3) {
    return REGULAR_VS_SPECIAL_ZONE_COMMENTS['6-3'];
  }

  // 중위권 (4-5등급)
  return REGULAR_VS_SPECIAL_ZONE_COMMENTS['6-2'];
}

// ============== 메인 함수 ==============

/**
 * 학생 프로필에 맞는 6개 카테고리 학습 전략 생성
 *
 * @param profile - 학생 프로필 (학년, 진도, 등급)
 * @returns 6개 카테고리별 학습 전략 멘트
 */
export function generateLearningStrategies(profile: StudentProfile): LearningStrategyResult {
  const strategies: StrategyComment[] = [
    getAdvanceVsDepthStrategy(profile),
    getCSATvsSchoolStrategy(profile),
    getLiberalVsScienceStrategy(profile),
    getAcademyVsTutoringStrategy(profile),
    getRegularVsIntensiveStrategy(profile),
    getRegularVsSpecialZoneStrategy(profile),
  ];

  // 종합 요약 생성
  const leftCount = strategies.filter(s => s.recommendation === 'left').length;
  const rightCount = strategies.filter(s => s.recommendation === 'right').length;

  let overallSummary: string;
  if (profile.scoreGrade <= 2) {
    overallSummary = '상위권 학생으로서 심화 학습과 고난도 문제 해결에 집중하며, 수능형 사고력을 미리 키워가는 것이 좋습니다.';
  } else if (profile.scoreGrade <= 4) {
    overallSummary = '중상위권 학생으로서 기본기를 다지면서 점진적으로 심화 학습 비중을 늘려가세요.';
  } else if (profile.scoreGrade <= 6) {
    overallSummary = '중위권 학생으로서 기본 개념 학습에 집중하고, 꾸준한 복습을 통해 실력을 쌓아가세요.';
  } else {
    overallSummary = '기초 실력 향상이 우선입니다. 개념 이해에 집중하고, 쉬운 문제부터 차근차근 풀어나가세요.';
  }

  return {
    strategies,
    overallSummary,
  };
}

/**
 * 시험 결과에서 학생 프로필 추출
 *
 * @param testType - 시험 종류 (MONO/DI/TRI)
 * @param grade9 - 9등급제 등급
 * @param progressLevel - 진도 수준 (선택, 기본값: 보통)
 * @returns 학생 프로필
 */
export function createStudentProfile(
  testType: TestType,
  grade9: number,
  progressLevel: ProgressLevel = '보통'
): StudentProfile {
  // 시험 종류에서 학년 추출
  const gradeLevelMap: Record<TestType, GradeLevel> = {
    MONO: '중1',
    DI: '중2',
    TRI: '중3',
  };

  return {
    gradeLevel: gradeLevelMap[testType],
    progressLevel,
    scoreGrade: Math.min(9, Math.max(1, grade9)) as ScoreGrade,
  };
}

/**
 * 특정 카테고리의 모든 코멘트 조회
 */
export function getAllCommentsForCategory(categoryId: number): StrategyComment[] {
  const categoryMap: Record<number, Record<string, StrategyComment>> = {
    1: ADVANCE_VS_DEPTH_COMMENTS,
    2: CSAT_VS_SCHOOL_COMMENTS,
    3: LIBERAL_VS_SCIENCE_COMMENTS,
    4: ACADEMY_VS_TUTORING_COMMENTS,
    5: REGULAR_VS_INTENSIVE_COMMENTS,
    6: REGULAR_VS_SPECIAL_ZONE_COMMENTS,
  };

  const comments = categoryMap[categoryId];
  return comments ? Object.values(comments) : [];
}

/**
 * 카테고리 이름 목록 조회
 */
export function getCategoryNames(): string[] {
  return [
    '선행 VS 심화',
    '수능 VS 내신',
    '문과 VS 이과',
    '학원 VS 과외',
    '일반 VS 몰입',
    '일반 VS 특구',
  ];
}
