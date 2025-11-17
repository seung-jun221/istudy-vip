/**
 * 진단검사 보고서 생성 모듈
 *
 * 채점 결과를 분석하여 동적 코멘트, 로드맵, 학습 제안을 생성합니다.
 */

// 레벨 매핑
export {
  getTScoreLevel,
  getPercentileLevel,
  getAccuracyLevel,
  getLevelInfo,
  analyzeDifficultyPattern,
  type PerformanceLevel,
  type LevelInfo,
} from './levelMapper';

// 코멘트 데이터베이스
export {
  getAreaComment,
  generateAllAreaComments,
  type AreaComment,
} from './commentDatabase';

// 로드맵 생성
export {
  generateRoadmap,
  generateSimpleRoadmap,
  type Roadmap,
} from './roadmapGenerator';

// 메인 코멘트 생성기
export {
  generateReportData,
  generateSimpleReport,
  analyzeIncorrectPatterns,
  generateOverallComment,
  identifyStrengthsAndWeaknesses,
  generateLearningPriority,
} from './commentGenerator';
