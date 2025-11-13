/**
 * 진단검사 시스템 TypeScript 타입 정의
 * Supabase 데이터베이스 스키마와 매칭
 */

// ========================================
// 기본 타입 정의
// ========================================

export type TestType = 'MONO' | 'DI' | 'TRI';
export type SubmissionType = 'auto' | 'manual';
export type Difficulty = 'LOW' | 'MID' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

// MONO 영역
export type MonoArea = '수와 연산' | '식의 계산' | '방정식' | '함수';

// DI 영역
export type DiArea = '실수와 연산' | '식의 계산' | '일차부등식' | '연립방정식';

// TRI 영역
export type TriArea = '다항식' | '이차방정식' | '이차함수';

export type AreaType = MonoArea | DiArea | TriArea;

// ========================================
// 데이터베이스 테이블 타입
// ========================================

/**
 * diagnostic_tests 테이블
 */
export interface DiagnosticTest {
  id: string;
  test_type: TestType;
  test_name: string;
  description?: string;
  total_questions: number;
  total_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * diagnostic_submissions 테이블
 */
export interface DiagnosticSubmission {
  id: string;
  submission_id: string;

  // 학생 정보
  reservation_id?: string;
  student_name: string;
  parent_phone: string;
  school?: string;
  grade: string;
  math_level?: string;

  // 시험 정보
  test_id: string;
  test_type: TestType;

  // 답안 정보
  answers: string[]; // ["1", "2", "3", ...]

  // 제출 방식
  submission_type: SubmissionType;

  // 시간
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 영역별 결과
 */
export interface AreaResult {
  areaName: AreaType;
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalCount: number;
  correctRate: number;
  tscore: number;
  percentile: number;
}

/**
 * 난이도별 결과
 */
export interface DifficultyResult {
  difficulty: Difficulty;
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalCount: number;
  correctRate: number;
}

/**
 * 문항별 결과
 */
export interface QuestionResult {
  questionNumber: number;
  isCorrect: boolean;
  studentAnswer: string;
  correctAnswer: string;
  score: number;
  area: AreaType;
  difficulty: Difficulty;
}

/**
 * diagnostic_results 테이블
 */
export interface DiagnosticResult {
  id: string;
  submission_id: string;

  // 전체 성적
  total_score: number;
  max_score: number;
  percentile: number;
  grade9: number;
  grade5: number;

  // 영역별/난이도별/문항별 결과
  area_results: AreaResult[];
  difficulty_results: DifficultyResult[];
  question_results: QuestionResult[];

  // 시간
  graded_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 영역별 코멘트
 */
export interface AreaComment {
  level: 'Excellent' | 'Good' | 'Average' | 'Weak' | 'Critical';
  comment: string;
  wrongPatterns?: string;
}

/**
 * 동적 코멘트
 */
export interface DynamicComments {
  area_comments: {
    [areaName: string]: AreaComment;
  };
  learning_strategy: {
    '선행VS심화'?: string;
    '수능VS내신'?: string;
    '문과VS이과'?: string;
    '학원VS과외'?: string;
    '일반VS몰입'?: string;
    '일반VS특구'?: string;
  };
  roadmap: {
    step1: string;
    step2: string;
    step3: string;
  };
}

/**
 * diagnostic_reports 테이블
 */
export interface DiagnosticReport {
  id: string;
  result_id: string;

  // HTML/PDF
  html_content?: string;
  pdf_url?: string;
  pdf_file_name?: string;

  // 동적 코멘트
  dynamic_comments?: DynamicComments;

  // 시간
  generated_at: string;
  created_at: string;
  updated_at: string;
}

// ========================================
// API 요청/응답 타입
// ========================================

/**
 * 학생 답안 제출 요청
 */
export interface SubmitAnswersRequest {
  // 학생 정보
  reservation_id?: string;
  student_name: string;
  parent_phone: string;
  school?: string;
  grade: string;
  math_level?: string;

  // 시험 정보
  test_type: TestType;

  // 답안 (25개 문항)
  answers: string[];
}

/**
 * 선생님 수동 채점 요청
 */
export interface ManualGradingRequest {
  // 학생 정보
  student_name: string;
  parent_phone: string;
  school?: string;
  grade: string;
  math_level?: string;

  // 시험 정보
  test_type: TestType;

  // 문항별 정오 (25개 문항)
  question_results: Array<{
    questionNumber: number;
    isCorrect: boolean;
  }>;
}

/**
 * 채점 결과 응답
 */
export interface GradingResponse {
  success: boolean;
  submission: DiagnosticSubmission;
  result: DiagnosticResult;
  report?: DiagnosticReport;
  error?: string;
}

/**
 * 결과 조회 요청
 */
export interface GetResultsRequest {
  parent_phone: string;
  password: string; // 비밀번호 검증용
}

/**
 * 결과 조회 응답
 */
export interface GetResultsResponse {
  success: boolean;
  submissions: Array<DiagnosticSubmission & {
    result?: DiagnosticResult;
    report?: DiagnosticReport;
  }>;
  error?: string;
}

// ========================================
// 프론트엔드 UI 상태 타입
// ========================================

/**
 * 학생 답안 입력 폼 상태
 */
export interface AnswerFormState {
  // 학생 정보
  studentName: string;
  parentPhone: string;
  school: string;
  grade: string;
  mathLevel: string;

  // 선택한 시험
  selectedTestType?: TestType;

  // 25개 답안 (초기값: 모두 빈 문자열)
  answers: string[];

  // UI 상태
  currentPage: number; // 페이지네이션용
  isSubmitting: boolean;
}

/**
 * 선생님 수동 채점 폼 상태
 */
export interface ManualGradingFormState {
  // 학생 검색
  searchPhone: string;
  searchResults: DiagnosticSubmission[];
  selectedSubmission?: DiagnosticSubmission;

  // 학생 정보 입력 (새로운 학생)
  studentName: string;
  parentPhone: string;
  school: string;
  grade: string;
  mathLevel: string;

  // 선택한 시험
  selectedTestType?: TestType;

  // 25개 문항별 O/X 체크 (초기값: 모두 null)
  questionCorrectness: Array<boolean | null>;

  // UI 상태
  isSubmitting: boolean;
}

/**
 * 결과 보기 상태
 */
export interface ResultViewState {
  // 인증
  parentPhone: string;
  password: string;
  isAuthenticated: boolean;

  // 결과 목록
  results: Array<DiagnosticSubmission & {
    result?: DiagnosticResult;
    report?: DiagnosticReport;
  }>;

  // 선택한 결과
  selectedResult?: DiagnosticResult;
  selectedReport?: DiagnosticReport;

  // UI 상태
  isLoading: boolean;
}
