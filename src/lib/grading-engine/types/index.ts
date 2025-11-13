/**
 * 진단검사 자동 채점 시스템 타입 정의
 */

// ============== 시험 종류 ==============
export type TestType = 'MONO' | 'DI' | 'TRI';

// ============== 영역 타입 ==============
export type AreaType = '수와 연산' | '식의 계산' | '방정식' | '함수' | '실수와 연산' | '다항식' | '이차방정식' | '이차함수';

// ============== 난이도 ==============
export type Difficulty = 'LOW' | 'MID' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

// ============== 문항 정보 ==============
export interface QuestionInfo {
  questionNumber: number;
  area: AreaType;
  difficulty: Difficulty;
  score: number;
  content: string;
}

// ============== 시험지 구조 ==============
export interface TestPaper {
  type: TestType;
  totalQuestions: number;
  totalScore: number;
  questions: QuestionInfo[];
  areaScores: {
    [key in AreaType]?: number;
  };
}

// ============== 학생 답안 ==============
export interface StudentAnswer {
  questionNumber: number;
  answer: string | number;
  isCorrect?: boolean;
}

export interface StudentSubmission {
  studentId: string;
  studentName: string;
  grade: string; // 중1, 중2, 중3
  testType: TestType;
  answers: StudentAnswer[];
  submittedAt: Date;
}

// ============== 채점 결과 ==============
export interface QuestionResult {
  questionNumber: number;
  area: AreaType;
  difficulty: Difficulty;
  score: number;
  earnedScore: number;
  isCorrect: boolean;
}

export interface AreaResult {
  area: AreaType;
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalCount: number;
  accuracy: number; // 정답률 (%)
  tScore: number; // T-Score
  percentile: number; // 백분위
}

export interface DifficultyResult {
  difficulty: 'LOW' | 'MID' | 'HIGH'; // 하난도, 중난도, 고난도
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalCount: number;
  accuracy: number;
}

// ============== 종합 채점 결과 ==============
export interface GradingResult {
  studentInfo: {
    studentId: string;
    studentName: string;
    grade: string;
    testType: TestType;
  };
  overallScore: {
    totalScore: number; // 총점 (100점)
    earnedScore: number; // 획득 점수
    percentile: number; // 백분위 (0-100)
    grade9: number; // 9등급제 (1-9)
    grade5: number; // 5등급제 (1-5, 2028 대입제도 개편안)
    expectedHighSchoolGrade: string; // 고1 예상 등급 (예: "2~3등급")
  };
  areaResults: AreaResult[];
  difficultyResults: DifficultyResult[];
  questionResults: QuestionResult[];
  statistics: {
    mean: number; // 평균
    stdDev: number; // 표준편차
    grade1Cut: number; // 1등급 컷
    grade2Cut: number; // 2등급 컷
    grade3Cut: number; // 3등급 컷
    grade4Cut: number; // 4등급 컷
    grade5Cut: number; // 5등급 컷 (평균)
  };
}

// ============== 등급 기준 ==============
export interface GradeCutoffs {
  testType: TestType;
  mean: number; // 평균 (5등급 컷)
  stdDev: number; // 표준편차
  grade1Cut: number; // 87-89점
  grade2Cut: number; // 75-77점
  grade3Cut: number; // 63-65점
  grade4Cut: number; // 51-54점
  grade5Cut: number; // 39-43점
  grade6Cut: number;
  grade7Cut: number;
  grade8Cut: number;
  grade9Cut: number;
}

// ============== T-Score 계산용 영역 통계 ==============
export interface AreaStatistics {
  testType: TestType;
  area: AreaType;
  mean: number;
  stdDev: number;
}

// ============== 보고서 생성용 데이터 ==============
export interface ReportData {
  gradingResult: GradingResult;
  comments: {
    areaComments: { [area: string]: string }; // 영역별 코멘트
    roadmap: {
      step1: string; // 1단계 (1~2개월)
      step2: string; // 2단계 (2~3개월)
      step3: string; // 3단계 (3개월 이후)
    };
  };
  generatedAt: Date;
}
