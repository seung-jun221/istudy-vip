/**
 * i.study 수리탐구 진단검사 자동 채점 시스템
 * 메인 엔트리 포인트
 */

export { ScoreTableParser } from './parsers/scoreTableParser';
export { GradeCalculator } from './scoring/gradeCalculator';
export { AutoGrader } from './scoring/autoGrader';

// 보고서 생성 모듈
export {
  generateReportData,
  generateSimpleReport,
  analyzeIncorrectPatterns,
  generateOverallComment,
  identifyStrengthsAndWeaknesses,
  generateLearningPriority,
  getTScoreLevel,
  getPercentileLevel,
  getAccuracyLevel,
  getLevelInfo,
  analyzeDifficultyPattern,
  getAreaComment,
  generateAllAreaComments,
  generateRoadmap,
  generateSimpleRoadmap,
} from './report';

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

// 보고서 타입
export type {
  PerformanceLevel,
  LevelInfo,
  AreaComment,
  Roadmap,
} from './report';
