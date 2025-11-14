/**
 * 진단검사 Supabase 서비스 레이어
 * 데이터베이스와의 모든 상호작용을 처리
 */

import { supabase } from './supabase';
import type {
  DiagnosticTest,
  DiagnosticSubmission,
  DiagnosticResult,
  DiagnosticReport,
  SubmitAnswersRequest,
  ManualGradingRequest,
  GradingResponse,
  TestType,
  QuestionResult,
  AreaResult as DiagnosticAreaResult,
  DifficultyResult as DiagnosticDifficultyResult,
} from '../types/diagnostic';
import { AutoGrader } from '../lib/grading-engine';
import type {
  StudentSubmission,
  StudentAnswer,
  AreaResult as GradingAreaResult,
  DifficultyResult as GradingDifficultyResult,
} from '../lib/grading-engine';
import { getCorrectAnswers } from './correctAnswers';

// ========================================
// 진단검사 조회
// ========================================

/**
 * 모든 활성화된 진단검사 목록 조회
 */
export async function getActiveDiagnosticTests(): Promise<DiagnosticTest[]> {
  const { data, error } = await supabase
    .from('diagnostic_tests')
    .select('*')
    .eq('is_active', true)
    .order('test_type');

  if (error) {
    console.error('진단검사 조회 실패:', error);
    throw new Error('진단검사 목록을 불러올 수 없습니다.');
  }

  return data || [];
}

/**
 * 특정 타입의 진단검사 조회
 */
export async function getDiagnosticTestByType(
  testType: TestType
): Promise<DiagnosticTest | null> {
  const { data, error } = await supabase
    .from('diagnostic_tests')
    .select('*')
    .eq('test_type', testType)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('진단검사 조회 실패:', error);
    return null;
  }

  return data;
}

// ========================================
// 답안 제출 (학생용 자동 채점)
// ========================================

/**
 * 학생이 직접 답안을 입력하여 자동 채점 제출
 */
export async function submitStudentAnswers(
  request: SubmitAnswersRequest
): Promise<GradingResponse> {
  try {
    // 1. 시험 정보 조회
    const test = await getDiagnosticTestByType(request.test_type);
    if (!test) {
      throw new Error('존재하지 않는 시험입니다.');
    }

    // 2. 답안 개수 검증
    if (request.answers.length !== test.total_questions) {
      throw new Error(
        `답안 개수가 올바르지 않습니다. (제출: ${request.answers.length}, 필요: ${test.total_questions})`
      );
    }

    // 3. 제출 데이터 생성
    const submissionId = 'S' + Date.now();
    const submissionData: Partial<DiagnosticSubmission> = {
      submission_id: submissionId,
      reservation_id: request.reservation_id,
      student_name: request.student_name,
      parent_phone: request.parent_phone,
      school: request.school,
      grade: request.grade,
      math_level: request.math_level,
      test_id: test.id,
      test_type: request.test_type,
      answers: request.answers,
      submission_type: 'auto',
    };

    // 4. Supabase에 제출 데이터 삽입
    const { data: submission, error: submissionError } = await supabase
      .from('diagnostic_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (submissionError) {
      console.error('제출 실패:', submissionError);
      throw new Error('답안 제출에 실패했습니다.');
    }

    // 5. 자동 채점 실행 (별도 함수 호출)
    const result = await gradeSubmission(submission.id);

    // 6. 결과 보고서 생성 (별도 함수 호출)
    const report = await generateReport(result.id);

    return {
      success: true,
      submission,
      result,
      report,
    };
  } catch (error) {
    console.error('submitStudentAnswers 실패:', error);
    return {
      success: false,
      submission: null as any,
      result: null as any,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

// ========================================
// 수동 채점 (선생님용)
// ========================================

/**
 * 선생님이 수동으로 문항별 O/X를 체크하여 제출
 */
export async function submitManualGrading(
  request: ManualGradingRequest
): Promise<GradingResponse> {
  try {
    // 1. 시험 정보 조회
    const test = await getDiagnosticTestByType(request.test_type);
    if (!test) {
      throw new Error('존재하지 않는 시험입니다.');
    }

    // 2. 문항 개수 검증
    if (request.question_results.length !== test.total_questions) {
      throw new Error(
        `문항 개수가 올바르지 않습니다. (제출: ${request.question_results.length}, 필요: ${test.total_questions})`
      );
    }

    // 3. O/X를 답안으로 변환 (isCorrect가 true면 정답, false면 "X")
    // 실제 채점 시에는 정답표와 비교하여 처리
    const answers = request.question_results.map((qr) =>
      qr.isCorrect ? 'CORRECT' : 'WRONG'
    );

    // 4. 제출 데이터 생성
    const submissionId = 'M' + Date.now();
    const submissionData: Partial<DiagnosticSubmission> = {
      submission_id: submissionId,
      student_name: request.student_name,
      parent_phone: request.parent_phone,
      school: request.school,
      grade: request.grade,
      math_level: request.math_level,
      test_id: test.id,
      test_type: request.test_type,
      answers: answers,
      submission_type: 'manual',
    };

    // 5. Supabase에 제출 데이터 삽입
    const { data: submission, error: submissionError } = await supabase
      .from('diagnostic_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (submissionError) {
      console.error('제출 실패:', submissionError);
      throw new Error('수동 채점 제출에 실패했습니다.');
    }

    // 6. 자동 채점 실행 (수동 채점도 자동으로 점수 계산)
    const result = await gradeSubmissionManual(
      submission.id,
      request.question_results
    );

    // 7. 결과 보고서 생성
    const report = await generateReport(result.id);

    return {
      success: true,
      submission,
      result,
      report,
    };
  } catch (error) {
    console.error('submitManualGrading 실패:', error);
    return {
      success: false,
      submission: null as any,
      result: null as any,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

// ========================================
// 채점 실행 (내부 함수)
// ========================================

/**
 * 자동 채점 실행 (TypeScript 채점 엔진 통합)
 */
async function gradeSubmission(
  submissionId: string
): Promise<DiagnosticResult> {
  // 1. 제출 정보 조회
  const { data: submission, error: submissionError } = await supabase
    .from('diagnostic_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (submissionError || !submission) {
    throw new Error('제출 정보를 찾을 수 없습니다.');
  }

  // 2. 정답표 조회
  const correctAnswers = getCorrectAnswers(submission.test_type);

  // 3. AutoGrader용 데이터 변환
  const studentSubmission: StudentSubmission = {
    studentId: submission.submission_id,
    studentName: submission.student_name,
    grade: submission.grade,
    testType: submission.test_type,
    answers: submission.answers.map((answer: string, index: number) => ({
      questionNumber: index + 1,
      answer: answer,
    })) as StudentAnswer[],
    submittedAt: new Date(submission.submitted_at),
  };

  // 4. 자동 채점 실행
  const gradingResult = AutoGrader.grade(studentSubmission, correctAnswers);

  // 5. 결과 데이터 변환 (GradingResult → DiagnosticResult)
  const resultData = {
    submission_id: submissionId,
    total_score: gradingResult.overallScore.earnedScore,
    max_score: gradingResult.overallScore.totalScore,
    percentile: gradingResult.overallScore.percentile,
    grade9: gradingResult.overallScore.grade9,
    grade5: gradingResult.overallScore.grade5,
    area_results: convertAreaResults(gradingResult.areaResults),
    difficulty_results: convertDifficultyResults(gradingResult.difficultyResults),
    question_results: convertQuestionResults(
      gradingResult.questionResults,
      submission.answers
    ),
  };

  // 6. Supabase에 결과 저장
  const { data: result, error: resultError } = await supabase
    .from('diagnostic_results')
    .insert([resultData])
    .select()
    .single();

  if (resultError) {
    console.error('결과 저장 실패:', resultError);
    throw new Error('채점 결과 저장에 실패했습니다.');
  }

  return result;
}

/**
 * 수동 채점 실행 (문항별 O/X 기반)
 */
async function gradeSubmissionManual(
  submissionId: string,
  questionResults: Array<{ questionNumber: number; isCorrect: boolean }>
): Promise<DiagnosticResult> {
  // 1. 제출 정보 조회
  const { data: submission, error: submissionError } = await supabase
    .from('diagnostic_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (submissionError || !submission) {
    throw new Error('제출 정보를 찾을 수 없습니다.');
  }

  // 2. 정답표 조회
  const correctAnswers = getCorrectAnswers(submission.test_type);

  // 3. O/X 정보를 답안으로 변환
  // isCorrect가 true면 정답, false면 "X"로 표시
  const answers: StudentAnswer[] = questionResults.map((qr) => ({
    questionNumber: qr.questionNumber,
    answer: qr.isCorrect ? correctAnswers[qr.questionNumber] : 'X',
  }));

  // 4. AutoGrader용 데이터 변환
  const studentSubmission: StudentSubmission = {
    studentId: submission.submission_id,
    studentName: submission.student_name,
    grade: submission.grade,
    testType: submission.test_type,
    answers: answers,
    submittedAt: new Date(submission.submitted_at),
  };

  // 5. 자동 채점 실행
  const gradingResult = AutoGrader.grade(studentSubmission, correctAnswers);

  // 6. 결과 데이터 변환
  const resultData = {
    submission_id: submissionId,
    total_score: gradingResult.overallScore.earnedScore,
    max_score: gradingResult.overallScore.totalScore,
    percentile: gradingResult.overallScore.percentile,
    grade9: gradingResult.overallScore.grade9,
    grade5: gradingResult.overallScore.grade5,
    area_results: convertAreaResults(gradingResult.areaResults),
    difficulty_results: convertDifficultyResults(gradingResult.difficultyResults),
    question_results: convertQuestionResults(
      gradingResult.questionResults,
      answers.map((a) => a.answer.toString())
    ),
  };

  // 7. Supabase에 결과 저장
  const { data: result, error: resultError } = await supabase
    .from('diagnostic_results')
    .insert([resultData])
    .select()
    .single();

  if (resultError) {
    console.error('결과 저장 실패:', resultError);
    throw new Error('채점 결과 저장에 실패했습니다.');
  }

  return result;
}

/**
 * 보고서 생성 (HTML/PDF)
 * TODO: 다음 단계에서 구현 (HTML 템플릿 바인딩 + PDF 변환)
 */
async function generateReport(resultId: string): Promise<DiagnosticReport> {
  // Placeholder: 보고서 레코드만 생성
  const reportData = {
    result_id: resultId,
    html_content: null,
    pdf_url: null,
    dynamic_comments: null,
  };

  const { data: report, error: reportError } = await supabase
    .from('diagnostic_reports')
    .insert([reportData])
    .select()
    .single();

  if (reportError) {
    console.error('보고서 생성 실패:', reportError);
    throw new Error('보고서 생성에 실패했습니다.');
  }

  return report;
}

// ========================================
// 데이터 변환 헬퍼 함수
// ========================================

/**
 * GradingEngine의 AreaResult → Database AreaResult 변환
 */
function convertAreaResults(
  areaResults: GradingAreaResult[]
): DiagnosticAreaResult[] {
  return areaResults.map((ar) => ({
    areaName: ar.area,
    totalScore: ar.totalScore,
    earnedScore: ar.earnedScore,
    correctCount: ar.correctCount,
    totalCount: ar.totalCount,
    correctRate: ar.accuracy,
    tscore: ar.tScore,
    percentile: ar.percentile,
  }));
}

/**
 * GradingEngine의 DifficultyResult → Database DifficultyResult 변환
 */
function convertDifficultyResults(
  difficultyResults: GradingDifficultyResult[]
): DiagnosticDifficultyResult[] {
  return difficultyResults.map((dr) => ({
    difficulty: dr.difficulty as any,
    totalScore: dr.totalScore,
    earnedScore: dr.earnedScore,
    correctCount: dr.correctCount,
    totalCount: dr.totalCount,
    correctRate: dr.accuracy,
  }));
}

/**
 * GradingEngine의 QuestionResult → Database QuestionResult 변환
 */
function convertQuestionResults(
  questionResults: any[],
  studentAnswers: string[]
): QuestionResult[] {
  return questionResults.map((qr, index) => ({
    questionNumber: qr.questionNumber,
    isCorrect: qr.isCorrect,
    studentAnswer: studentAnswers[index] || '',
    correctAnswer: '', // TODO: 정답표에서 가져오기
    score: qr.earnedScore,
    area: qr.area,
    difficulty: qr.difficulty,
  }));
}

// ========================================
// 결과 조회
// ========================================

/**
 * 전화번호로 제출 이력 조회
 */
export async function getSubmissionsByPhone(
  parentPhone: string
): Promise<DiagnosticSubmission[]> {
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('*')
    .eq('parent_phone', parentPhone)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('제출 이력 조회 실패:', error);
    throw new Error('제출 이력을 불러올 수 없습니다.');
  }

  return data || [];
}

/**
 * 제출 ID로 결과 조회
 */
export async function getResultBySubmissionId(
  submissionId: string
): Promise<DiagnosticResult | null> {
  const { data, error } = await supabase
    .from('diagnostic_results')
    .select('*')
    .eq('submission_id', submissionId)
    .single();

  if (error) {
    console.error('결과 조회 실패:', error);
    return null;
  }

  return data;
}

/**
 * 결과 ID로 결과 조회
 */
export async function getResultById(
  resultId: string
): Promise<DiagnosticResult | null> {
  const { data, error } = await supabase
    .from('diagnostic_results')
    .select('*')
    .eq('id', resultId)
    .single();

  if (error) {
    console.error('결과 조회 실패:', error);
    return null;
  }

  return data;
}

/**
 * 결과 ID로 전체 정보 조회 (제출 + 결과)
 */
export async function getFullResultById(
  resultId: string
): Promise<(DiagnosticResult & { submission?: DiagnosticSubmission }) | null> {
  const result = await getResultById(resultId);
  if (!result) return null;

  const { data: submission, error: submissionError } = await supabase
    .from('diagnostic_submissions')
    .select('*')
    .eq('id', result.submission_id)
    .single();

  if (submissionError) {
    console.error('제출 정보 조회 실패:', submissionError);
    return { ...result, submission: undefined };
  }

  return {
    ...result,
    submission,
  };
}

/**
 * 결과 ID로 보고서 조회
 */
export async function getReportByResultId(
  resultId: string
): Promise<DiagnosticReport | null> {
  const { data, error } = await supabase
    .from('diagnostic_reports')
    .select('*')
    .eq('result_id', resultId)
    .single();

  if (error) {
    console.error('보고서 조회 실패:', error);
    return null;
  }

  return data;
}

/**
 * 전화번호로 모든 결과 조회 (제출 + 결과 + 보고서)
 */
export async function getAllResultsByPhone(parentPhone: string): Promise<
  Array<
    DiagnosticSubmission & {
      result?: DiagnosticResult;
      report?: DiagnosticReport;
    }
  >
> {
  const submissions = await getSubmissionsByPhone(parentPhone);

  const results = await Promise.all(
    submissions.map(async (submission) => {
      const result = await getResultBySubmissionId(submission.id);
      const report = result ? await getReportByResultId(result.id) : null;

      return {
        ...submission,
        result: result || undefined,
        report: report || undefined,
      };
    })
  );

  return results;
}

// ========================================
// 예약 연동
// ========================================

/**
 * 예약 ID로 진단검사 제출 이력 조회
 */
export async function getSubmissionsByReservationId(
  reservationId: string
): Promise<DiagnosticSubmission[]> {
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('예약별 제출 이력 조회 실패:', error);
    throw new Error('제출 이력을 불러올 수 없습니다.');
  }

  return data || [];
}

/**
 * 예약 정보로부터 학생 정보 자동 입력용 데이터 추출
 */
export async function getStudentInfoFromReservation(reservationId: string): Promise<{
  student_name: string;
  parent_phone: string;
  school?: string;
  grade: string;
  math_level?: string;
} | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select('student_name, parent_phone, school, grade, math_level')
    .eq('reservation_id', reservationId)
    .single();

  if (error) {
    console.error('예약 정보 조회 실패:', error);
    return null;
  }

  return data;
}
