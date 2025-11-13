/**
 * i.study 수리탐구 진단검사 자동 채점 시스템
 * 메인 엔트리 포인트
 */

export { ScoreTableParser } from './parsers/scoreTableParser';
export { GradeCalculator } from './scoring/gradeCalculator';
export { AutoGrader } from './scoring/autoGrader';

export type {
  TestType,
  AreaType,
  Difficulty,
  QuestionInfo,
  TestPaper,
  StudentAnswer,
  StudentSubmission,
  QuestionResult,
  AreaResult,
  DifficultyResult,
  GradingResult,
  GradeCutoffs,
  AreaStatistics,
  ReportData,
} from './types/index';
