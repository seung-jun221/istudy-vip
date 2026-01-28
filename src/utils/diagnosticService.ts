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
  CreateRegistrationRequest,
  UpdateRegistrationRequest,
} from '../types/diagnostic';
import { AutoGrader, generateReportData, GradeCalculator } from '../lib/grading-engine';
import type {
  StudentSubmission,
  StudentAnswer,
  AreaResult as GradingAreaResult,
  DifficultyResult as GradingDifficultyResult,
  GradingResult,
  QuestionResult as GradingQuestionResult,
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
    .eq('is_active', true);

  if (error) {
    console.error('진단검사 조회 실패:', error);
    throw new Error('진단검사 목록을 불러올 수 없습니다.');
  }

  // CT, MONO, DI, TRI 순서로 정렬
  const testOrder: Record<string, number> = { CT: 0, MONO: 1, DI: 2, TRI: 3 };
  const sorted = (data || []).sort((a, b) => {
    return (testOrder[a.test_type as TestType] || 99) - (testOrder[b.test_type as TestType] || 99);
  });

  return sorted;
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

/**
 * CT 테스트 수동 채점 제출 (부분 점수 방식)
 */
export async function submitCTManualGrading(
  request: {
    student_name: string;
    parent_phone: string;
    school: string;
    grade: string;
    math_level?: string;
    test_type: 'CT';
    scoring_method: 'partial';
    question_scores: Record<number, number>;
    total_score: number;
    t_score: number;
    percentile: number;
    grade9: number;
    grade5: number;
    area_stats: any;
    difficulty_stats: any;
  }
): Promise<GradingResponse> {
  try {
    // 1. 시험 정보 조회
    const test = await getDiagnosticTestByType('CT');
    if (!test) {
      throw new Error('CT 시험 정보를 찾을 수 없습니다.');
    }

    // 2. 제출 데이터 생성
    const submissionId = 'CT' + Date.now();
    const submissionData: Partial<DiagnosticSubmission> = {
      submission_id: submissionId,
      student_name: request.student_name,
      parent_phone: request.parent_phone,
      school: request.school,
      grade: request.grade,
      math_level: request.math_level || null,
      test_id: test.id,
      test_type: 'CT',
      answers: Object.values(request.question_scores).map(String), // 점수를 문자열 배열로 저장
      submission_type: 'manual',
    };

    // 3. Supabase에 제출 데이터 삽입
    const { data: submission, error: submissionError } = await supabase
      .from('diagnostic_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (submissionError) {
      console.error('CT 제출 실패:', submissionError);
      throw new Error('CT 수동 채점 제출에 실패했습니다.');
    }

    // 4. area_stats를 DB 형식으로 변환 (객체 → 배열)
    const areaResultsArray = Object.entries(request.area_stats).map(([areaName, stats]: [string, any]) => ({
      areaName,
      totalScore: stats.max,
      earnedScore: stats.earned,
      correctCount: Math.round(stats.earned / (stats.max / 2)), // 대략적인 정답 수
      totalCount: 2, // CT는 영역당 평균 2문항
      correctRate: stats.rate,
      tscore: 50 + 10 * (stats.rate - 50) / 25, // 득점률 기반 T-Score
      percentile: stats.rate, // 득점률을 백분위로 사용
    }));

    // 5. difficulty_stats를 DB 형식으로 변환
    const difficultyResultsArray = Object.entries(request.difficulty_stats).map(([difficulty, stats]: [string, any]) => ({
      difficulty: difficulty.toUpperCase(),
      totalScore: stats.max,
      earnedScore: stats.earned,
      correctCount: stats.fullScoreCount || 0,
      totalCount: stats.questions?.length || 0,
      correctRate: stats.rate,
    }));

    // 6. 결과 데이터 생성
    const resultData = {
      submission_id: submission.id,
      total_score: request.total_score,
      max_score: 100,
      percentile: request.percentile,
      grade9: request.grade9,
      grade5: request.grade5,
      area_results: areaResultsArray,
      difficulty_results: difficultyResultsArray,
      question_results: Object.entries(request.question_scores).map(([num, score]) => ({
        questionNumber: parseInt(num),
        isCorrect: score > 0,
        earnedScore: score,
      })),
    };

    // 7. 결과 저장
    const { data: result, error: resultError } = await supabase
      .from('diagnostic_results')
      .insert([resultData])
      .select()
      .single();

    if (resultError) {
      console.error('CT 결과 저장 실패:', resultError);
      throw new Error('CT 결과 저장에 실패했습니다.');
    }

    // 8. 결과 보고서 생성
    const report = await generateReport(result.id);

    return {
      success: true,
      submission,
      result,
      report,
    };
  } catch (error) {
    console.error('submitCTManualGrading 실패:', error);
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
 * 보고서 생성 (동적 코멘트 + 로드맵)
 */
async function generateReport(resultId: string): Promise<DiagnosticReport> {
  try {
    // 1. 결과 데이터 조회 (제출 정보 포함)
    const fullResult = await getFullResultById(resultId);
    if (!fullResult || !fullResult.submission) {
      throw new Error('결과 또는 제출 정보를 찾을 수 없습니다.');
    }

    const { submission } = fullResult;

    // 2. DiagnosticResult를 GradingResult로 변환
    const gradingResult = convertToGradingResult(fullResult, submission);

    // 3. 보고서 데이터 생성 (동적 코멘트 + 로드맵)
    const reportData = generateReportData(gradingResult);

    // 4. dynamic_comments 형식으로 변환 (T-Score 기반 레벨 결정)
    const dynamicComments = {
      area_comments: convertAreaCommentsFormat(
        reportData.comments.areaComments,
        gradingResult.areaResults
      ),
      learning_strategy: {}, // TODO: 추후 추가 가능
      roadmap: reportData.comments.roadmap,
    };

    // 5. Supabase에 보고서 저장
    const insertData = {
      result_id: resultId,
      html_content: null, // TODO: 2단계에서 HTML 템플릿 구현
      pdf_url: null, // TODO: 3단계에서 PDF 변환 구현
      dynamic_comments: dynamicComments,
    };

    const { data: report, error: reportError } = await supabase
      .from('diagnostic_reports')
      .insert([insertData])
      .select()
      .single();

    if (reportError) {
      console.error('보고서 생성 실패:', reportError);
      throw new Error('보고서 생성에 실패했습니다.');
    }

    return report;
  } catch (error) {
    console.error('generateReport 실패:', error);
    throw error;
  }
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
    score: qr.score, // 원래 배점 (earnedScore가 아닌 score)
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
    .maybeSingle();

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

  // 백분위 기반으로 9등급/5등급 재계산 (DB 저장값 대신)
  const recalculatedGrade9 = GradeCalculator.calculate9GradeFromPercentile(result.percentile);
  const recalculatedGrade5 = GradeCalculator.calculate5Grade(result.percentile);

  return {
    ...result,
    grade9: recalculatedGrade9,
    grade5: recalculatedGrade5,
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
    .maybeSingle();

  if (error) {
    console.error('보고서 조회 실패:', error);
    return null;
  }

  return data;
}

/**
 * 결과 ID로 보고서 조회 또는 생성
 * 보고서가 없으면 자동으로 생성합니다.
 */
export async function getOrGenerateReport(
  resultId: string
): Promise<DiagnosticReport | null> {
  // 1. 먼저 기존 보고서 조회
  const existingReport = await getReportByResultId(resultId);
  if (existingReport) {
    return existingReport;
  }

  // 2. 보고서가 없으면 새로 생성
  try {
    console.log('보고서 없음 - 새로 생성합니다:', resultId);
    const report = await generateReport(resultId);
    return report;
  } catch (error) {
    console.error('보고서 생성 실패:', error);
    return null;
  }
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

// ========================================
// 학생 등록 관리 (성적 입력 전)
// ========================================

/**
 * 학생 등록 생성 (성적 입력 전)
 */
export async function createDiagnosticRegistration(
  request: CreateRegistrationRequest
): Promise<DiagnosticSubmission | null> {
  try {
    // 1. 시험 정보 조회
    const test = await getDiagnosticTestByType(request.test_type);
    if (!test) {
      throw new Error('존재하지 않는 시험입니다.');
    }

    // 2. 등록 데이터 생성
    const registrationId = 'R' + Date.now();
    const registrationData: any = {
      submission_id: registrationId,
      student_name: request.student_name,
      parent_phone: request.parent_phone,
      school: request.school || null,
      grade: request.grade,
      math_level: request.math_level || null,
      test_id: test.id,
      test_type: request.test_type,
      test_date: request.test_date || null, // 빈 문자열이면 null로 변환
      test_time: request.test_time || null, // 빈 문자열이면 null로 변환
      location: request.location || null,
      answers: null, // 등록 시에는 답안 없음
      submission_type: 'registration',
      campaign_id: request.campaign_id || null, // 캠페인 ID 추가
    };

    // 3. Supabase에 등록 데이터 삽입
    const { data: registration, error: registrationError } = await supabase
      .from('diagnostic_submissions')
      .insert([registrationData])
      .select()
      .single();

    if (registrationError) {
      console.error('등록 실패:', registrationError);
      throw new Error('학생 등록에 실패했습니다.');
    }

    return registration;
  } catch (error) {
    console.error('createDiagnosticRegistration 실패:', error);
    return null;
  }
}

/**
 * 학생 등록 정보 수정
 */
export async function updateDiagnosticRegistration(
  request: UpdateRegistrationRequest
): Promise<DiagnosticSubmission | null> {
  try {
    const updateData: any = {};

    if (request.student_name !== undefined) updateData.student_name = request.student_name;
    if (request.parent_phone !== undefined) updateData.parent_phone = request.parent_phone;
    if (request.school !== undefined) updateData.school = request.school;
    if (request.grade !== undefined) updateData.grade = request.grade;
    if (request.math_level !== undefined) updateData.math_level = request.math_level;
    if (request.test_date !== undefined) updateData.test_date = request.test_date;
    if (request.test_time !== undefined) updateData.test_time = request.test_time;
    if (request.location !== undefined) updateData.location = request.location;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('diagnostic_submissions')
      .update(updateData)
      .eq('id', request.id)
      .select()
      .single();

    if (error) {
      console.error('등록 수정 실패:', error);
      throw new Error('학생 정보 수정에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('updateDiagnosticRegistration 실패:', error);
    return null;
  }
}

/**
 * 모든 등록 목록 조회 (관리자용)
 * @param campaignId - 캠페인 ID (선택, 제공 시 해당 캠페인 등록만 조회)
 */
export async function getAllRegistrations(campaignId?: string): Promise<DiagnosticSubmission[]> {
  let query = supabase
    .from('diagnostic_submissions')
    .select('*')
    .eq('submission_type', 'registration'); // 등록 타입만 조회

  // 캠페인 ID가 있으면 필터링
  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('등록 목록 조회 실패:', error);
    throw new Error('등록 목록을 불러올 수 없습니다.');
  }

  return data || [];
}

/**
 * 특정 시험 타입의 등록 목록 조회
 */
export async function getRegistrationsByTestType(
  testType: TestType
): Promise<DiagnosticSubmission[]> {
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('*')
    .eq('test_type', testType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('등록 목록 조회 실패:', error);
    throw new Error('등록 목록을 불러올 수 없습니다.');
  }

  return data || [];
}

/**
 * 등록 삭제
 */
export async function deleteRegistration(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('diagnostic_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('등록 삭제 실패:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('deleteRegistration 실패:', error);
    return false;
  }
}

// ========================================
// 보고서 생성 헬퍼 함수
// ========================================

/**
 * area_results를 배열 형식으로 정규화 (객체/배열 모두 지원)
 */
function normalizeAreaResults(areaResults: unknown): Array<{
  areaName: string;
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalCount: number;
  correctRate: number;
  tscore: number;
  percentile: number;
}> {
  // null, undefined, 빈 값 처리
  if (!areaResults) {
    console.warn('normalizeAreaResults: areaResults is empty or null');
    return [];
  }

  // 이미 배열인 경우 그대로 반환
  if (Array.isArray(areaResults)) {
    return areaResults;
  }

  // 문자열인 경우 (JSON 문자열로 저장된 경우) 파싱 시도
  if (typeof areaResults === 'string') {
    try {
      const parsed = JSON.parse(areaResults);
      if (Array.isArray(parsed)) return parsed;
      areaResults = parsed;
    } catch (e) {
      console.error('normalizeAreaResults: Failed to parse string:', e);
      return [];
    }
  }

  // 객체가 아닌 경우
  if (typeof areaResults !== 'object') {
    console.warn('normalizeAreaResults: unexpected type:', typeof areaResults);
    return [];
  }

  // 객체 형식인 경우 배열로 변환
  return Object.entries(areaResults as Record<string, {
    max?: number;
    totalScore?: number;
    earned?: number;
    earnedScore?: number;
    correctCount?: number;
    totalCount?: number;
    rate?: number;
    correctRate?: number;
    tscore?: number;
    percentile?: number;
  }>).map(([areaName, stats]) => ({
    areaName,
    totalScore: stats?.max || stats?.totalScore || 0,
    earnedScore: stats?.earned || stats?.earnedScore || 0,
    correctCount: stats?.correctCount || 0,
    totalCount: stats?.totalCount || 0,
    correctRate: stats?.rate || stats?.correctRate || 0,
    tscore: stats?.tscore || 50,
    percentile: stats?.percentile || stats?.rate || 50,
  }));
}

/**
 * difficulty_results를 배열 형식으로 정규화 (객체/배열 모두 지원)
 */
function normalizeDifficultyResults(difficultyResults: unknown): Array<{
  difficulty: string;
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalCount: number;
  correctRate: number;
}> {
  // null, undefined, 빈 값 처리
  if (!difficultyResults) {
    console.warn('normalizeDifficultyResults: difficultyResults is empty or null');
    return [];
  }

  // 이미 배열인 경우 그대로 반환
  if (Array.isArray(difficultyResults)) {
    return difficultyResults;
  }

  // 문자열인 경우 (JSON 문자열로 저장된 경우) 파싱 시도
  if (typeof difficultyResults === 'string') {
    try {
      const parsed = JSON.parse(difficultyResults);
      if (Array.isArray(parsed)) return parsed;
      difficultyResults = parsed;
    } catch (e) {
      console.error('normalizeDifficultyResults: Failed to parse string:', e);
      return [];
    }
  }

  // 객체가 아닌 경우
  if (typeof difficultyResults !== 'object') {
    console.warn('normalizeDifficultyResults: unexpected type:', typeof difficultyResults);
    return [];
  }

  // 객체 형식인 경우 배열로 변환
  return Object.entries(difficultyResults as Record<string, {
    max?: number;
    totalScore?: number;
    earned?: number;
    earnedScore?: number;
    fullScoreCount?: number;
    correctCount?: number;
    questions?: unknown[];
    totalCount?: number;
    rate?: number;
    correctRate?: number;
  }>).map(([difficulty, stats]) => ({
    difficulty: difficulty.toUpperCase(),
    totalScore: stats?.max || stats?.totalScore || 0,
    earnedScore: stats?.earned || stats?.earnedScore || 0,
    correctCount: stats?.fullScoreCount || stats?.correctCount || 0,
    totalCount: stats?.questions?.length || stats?.totalCount || 0,
    correctRate: stats?.rate || stats?.correctRate || 0,
  }));
}

/**
 * DiagnosticResult를 GradingResult로 변환
 */
function convertToGradingResult(
  result: DiagnosticResult,
  submission: DiagnosticSubmission
): GradingResult {
  // 영역별 결과 변환 (객체/배열 형식 모두 지원)
  const normalizedAreaResults = normalizeAreaResults(result.area_results);
  const areaResults: GradingAreaResult[] = normalizedAreaResults.map(ar => ({
    area: ar.areaName,
    totalScore: ar.totalScore,
    earnedScore: ar.earnedScore,
    correctCount: ar.correctCount,
    totalCount: ar.totalCount,
    accuracy: ar.correctRate,
    tScore: ar.tscore,
    percentile: ar.percentile,
  }));

  // 난이도별 결과 변환 (객체/배열 형식 모두 지원)
  const normalizedDifficultyResults = normalizeDifficultyResults(result.difficulty_results);
  const difficultyResults: GradingDifficultyResult[] = normalizedDifficultyResults.map(dr => ({
    difficulty: dr.difficulty === 'LOW' || dr.difficulty === 'MID' ? 'LOW' :
                dr.difficulty === 'HIGH' ? 'MID' : 'HIGH',
    totalScore: dr.totalScore,
    earnedScore: dr.earnedScore,
    correctCount: dr.correctCount,
    totalCount: dr.totalCount,
    accuracy: dr.correctRate,
  }));

  // 문항별 결과 변환
  const questionResults: GradingQuestionResult[] = result.question_results.map(qr => ({
    questionNumber: qr.questionNumber,
    area: qr.area,
    difficulty: qr.difficulty,
    score: qr.score,
    earnedScore: qr.isCorrect ? qr.score : 0,
    isCorrect: qr.isCorrect,
  }));

  // 통계 정보 (기본값 사용)
  const statistics = {
    mean: result.max_score * 0.5, // 50% 평균 가정
    stdDev: result.max_score * 0.15, // 15% 표준편차 가정
    grade1Cut: result.max_score * 0.87,
    grade2Cut: result.max_score * 0.75,
    grade3Cut: result.max_score * 0.63,
    grade4Cut: result.max_score * 0.51,
    grade5Cut: result.max_score * 0.39,
  };

  return {
    studentInfo: {
      studentId: submission.submission_id,
      studentName: submission.student_name,
      grade: submission.grade,
      testType: submission.test_type,
    },
    overallScore: {
      totalScore: result.max_score,
      earnedScore: result.total_score,
      percentile: result.percentile,
      // 백분위 기반으로 9등급/5등급 재계산 (DB 저장값 대신)
      grade9: GradeCalculator.calculate9GradeFromPercentile(result.percentile),
      grade5: GradeCalculator.calculate5Grade(result.percentile),
      expectedHighSchoolGrade: `${GradeCalculator.calculate9GradeFromPercentile(result.percentile)}등급`,
    },
    areaResults,
    difficultyResults,
    questionResults,
    statistics,
  };
}

/**
 * T-Score 기반 레벨 결정
 */
function getTScoreLevelForArea(tScore: number): 'Excellent' | 'Good' | 'Average' | 'Weak' | 'Critical' {
  if (tScore >= 65) return 'Excellent';
  if (tScore >= 55) return 'Good';
  if (tScore >= 45) return 'Average';
  if (tScore >= 35) return 'Weak';
  return 'Critical';
}

/**
 * 영역별 코멘트를 DB 형식으로 변환 (T-Score 기반 레벨 결정)
 */
function convertAreaCommentsFormat(
  areaComments: { [area: string]: string },
  areaResults?: GradingAreaResult[]
): {
  [areaName: string]: {
    level: 'Excellent' | 'Good' | 'Average' | 'Weak' | 'Critical';
    comment: string;
    wrongPatterns?: string;
  };
} {
  const result: any = {};

  // areaResults를 맵으로 변환 (빠른 조회용)
  const areaScoreMap: { [area: string]: number } = {};
  if (areaResults) {
    for (const ar of areaResults) {
      areaScoreMap[ar.area] = ar.tScore;
    }
  }

  for (const [area, comment] of Object.entries(areaComments)) {
    // T-Score 기반으로 레벨 결정 (우선) 또는 키워드 매칭 (fallback)
    let level: 'Excellent' | 'Good' | 'Average' | 'Weak' | 'Critical' = 'Average';

    if (areaScoreMap[area] !== undefined) {
      // T-Score 기반 레벨 결정
      level = getTScoreLevelForArea(areaScoreMap[area]);
    } else {
      // 키워드 매칭 (fallback - 종합 분석 등 영역 외 항목용)
      if (comment.includes('우수') || comment.includes('탁월') || comment.includes('완벽')) {
        level = 'Excellent';
      } else if (comment.includes('양호') || comment.includes('잘 ') || comment.includes('좋')) {
        level = 'Good';
      } else if (comment.includes('미흡') || comment.includes('부족')) {
        level = 'Weak';
      } else if (comment.includes('취약') || comment.includes('매우 부족')) {
        level = 'Critical';
      }
    }

    result[area] = {
      level,
      comment,
    };
  }

  return result;
}
