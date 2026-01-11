/**
 * 진단검사 보고서 코멘트 생성기
 *
 * 채점 결과를 분석하여 동적 코멘트와 로드맵을 생성합니다.
 */

import { GradingResult, ReportData, AreaType } from '../types';
import {
  getTScoreLevel,
  getPercentileLevel,
  getAccuracyLevel,
  analyzeDifficultyPattern,
  PerformanceLevel,
} from './levelMapper';
import { generateAllAreaComments, getAreaComment } from './commentDatabase';
import { generateRoadmap, generateSimpleRoadmap } from './roadmapGenerator';

/**
 * 틀린 문항 패턴 분석
 *
 * @param gradingResult - 채점 결과
 * @returns 패턴 분석 결과
 */
export function analyzeIncorrectPatterns(gradingResult: GradingResult): {
  totalIncorrect: number;
  incorrectByArea: Record<string, number>;
  incorrectByDifficulty: Record<string, number>;
  pattern: string;
} {
  const { questionResults, areaResults, difficultyResults } = gradingResult;

  // 틀린 문항 수 계산
  const incorrectQuestions = questionResults.filter(q => !q.isCorrect);
  const totalIncorrect = incorrectQuestions.length;

  // 영역별 틀린 문항 수
  const incorrectByArea: Record<string, number> = {};
  for (const q of incorrectQuestions) {
    incorrectByArea[q.area] = (incorrectByArea[q.area] || 0) + 1;
  }

  // 난이도별 틀린 문항 수
  const incorrectByDifficulty: Record<string, number> = {};
  for (const q of incorrectQuestions) {
    // 표시 난이도로 변환 (하/중/고)
    let displayDifficulty: string;
    if (q.difficulty === 'LOW' || q.difficulty === 'MID') {
      displayDifficulty = '하난도';
    } else if (q.difficulty === 'HIGH') {
      displayDifficulty = '중난도';
    } else {
      displayDifficulty = '고난도';
    }
    incorrectByDifficulty[displayDifficulty] = (incorrectByDifficulty[displayDifficulty] || 0) + 1;
  }

  // 패턴 분석 메시지 생성
  const pattern = analyzeDifficultyPattern(
    difficultyResults.map(d => ({
      difficulty: d.difficulty,
      accuracy: d.accuracy,
    }))
  );

  return {
    totalIncorrect,
    incorrectByArea,
    incorrectByDifficulty,
    pattern,
  };
}

/**
 * 종합 성적 분석 메시지 생성
 *
 * @param gradingResult - 채점 결과
 * @returns 종합 분석 메시지
 */
export function generateOverallComment(gradingResult: GradingResult): string {
  const { overallScore } = gradingResult;
  const { earnedScore, percentile, grade9, grade5 } = overallScore;

  const level = getPercentileLevel(percentile);
  const levelText = level === 'EXCELLENT' ? '우수' :
                    level === 'GOOD' ? '양호' :
                    level === 'AVERAGE' ? '보통' :
                    level === 'WEAK' ? '미흡' : '취약';

  let comment = `총 ${earnedScore}점으로 백분위 ${percentile}%에 해당하며, `;
  comment += `9등급제 기준 ${grade9}등급, 5등급제 기준 ${grade5}등급입니다. `;
  comment += `전반적으로 ${levelText}한 실력을 보이고 있습니다.`;

  return comment;
}

/**
 * 강점 영역과 약점 영역 찾기
 *
 * @param areaResults - 영역별 결과
 * @returns 강점/약점 영역
 */
export function identifyStrengthsAndWeaknesses(
  areaResults: Array<{
    area: AreaType;
    tScore: number;
    accuracy: number;
  }>
): {
  strengths: AreaType[];
  weaknesses: AreaType[];
} {
  const strengths: AreaType[] = [];
  const weaknesses: AreaType[] = [];

  for (const result of areaResults) {
    const level = getTScoreLevel(result.tScore);

    if (level === 'EXCELLENT' || level === 'GOOD') {
      strengths.push(result.area);
    } else if (level === 'WEAK' || level === 'CRITICAL') {
      weaknesses.push(result.area);
    }
  }

  return { strengths, weaknesses };
}

/**
 * 학습 우선순위 제안
 *
 * @param weaknesses - 약점 영역
 * @param incorrectPatterns - 틀린 문항 패턴
 * @returns 학습 우선순위 메시지
 */
export function generateLearningPriority(
  weaknesses: AreaType[],
  incorrectPatterns: {
    totalIncorrect: number;
    incorrectByArea: Record<string, number>;
    incorrectByDifficulty: Record<string, number>;
  }
): string {
  if (weaknesses.length === 0) {
    return '모든 영역에서 고른 실력을 보이고 있습니다. 심화 학습을 통해 더욱 발전시키세요.';
  }

  // 가장 많이 틀린 영역 찾기
  const sortedAreas = Object.entries(incorrectPatterns.incorrectByArea)
    .sort(([, a], [, b]) => b - a)
    .map(([area]) => area);

  const topWeakArea = sortedAreas[0];
  const topWeakCount = incorrectPatterns.incorrectByArea[topWeakArea];

  let priority = `가장 먼저 "${topWeakArea}" 영역을 집중 학습하세요 (${topWeakCount}문항 오답). `;

  if (weaknesses.length > 1) {
    priority += `그 다음 "${weaknesses[1]}" 영역을 보완하면 좋겠습니다.`;
  }

  return priority;
}

/**
 * 메인 보고서 데이터 생성
 *
 * @param gradingResult - 채점 결과
 * @returns 보고서 데이터 (코멘트 + 로드맵 포함)
 */
export function generateReportData(gradingResult: GradingResult): ReportData {
  const { areaResults, difficultyResults, overallScore, studentInfo } = gradingResult;

  // 1. 영역별 코멘트 생성
  const areaComments = generateAllAreaComments(
    studentInfo.testType,
    areaResults.map(ar => ({
      area: ar.area,
      tScore: ar.tScore,
      percentile: ar.percentile,
      accuracy: ar.accuracy,
    }))
  );

  // 2. 종합 T-Score 계산 (영역별 T-Score 평균)
  const totalTScore = areaResults.length > 0
    ? areaResults.reduce((sum, ar) => sum + ar.tScore, 0) / areaResults.length
    : 50; // 기본값

  // 3. 로드맵 생성
  const roadmap = generateRoadmap(
    studentInfo.testType,
    totalTScore,
    areaResults.map(ar => ({
      area: ar.area,
      tScore: ar.tScore,
      accuracy: ar.accuracy,
    }))
  );

  // 4. 추가 분석 정보
  const incorrectPatterns = analyzeIncorrectPatterns(gradingResult);
  const { strengths, weaknesses } = identifyStrengthsAndWeaknesses(
    areaResults.map(ar => ({
      area: ar.area,
      tScore: ar.tScore,
      accuracy: ar.accuracy,
    }))
  );

  // 5. 종합 코멘트
  const overallComment = generateOverallComment(gradingResult);
  const priorityComment = generateLearningPriority(weaknesses, incorrectPatterns);

  // 종합 코멘트를 areaComments에 추가
  areaComments['종합 분석'] = overallComment;
  areaComments['학습 우선순위'] = priorityComment;
  areaComments['난이도별 분석'] = incorrectPatterns.pattern;

  // 강점/약점 코멘트 추가
  if (strengths.length > 0) {
    areaComments['강점 영역'] = `"${strengths.join(', ')}" 영역에서 우수한 실력을 보이고 있습니다.`;
  }
  if (weaknesses.length > 0) {
    areaComments['약점 영역'] = `"${weaknesses.join(', ')}" 영역에 대한 보충 학습이 필요합니다.`;
  }

  return {
    gradingResult,
    comments: {
      areaComments,
      roadmap,
    },
    generatedAt: new Date(),
  };
}

/**
 * 간단한 보고서 생성 (T-Score 없이)
 *
 * @param gradingResult - 채점 결과
 * @returns 간단한 보고서 데이터
 */
export function generateSimpleReport(gradingResult: GradingResult): ReportData {
  const { overallScore } = gradingResult;

  // 백분위 기반 레벨 결정
  const level = getPercentileLevel(overallScore.percentile);

  // 기본 로드맵 사용
  const roadmap = generateSimpleRoadmap(level);

  // 종합 코멘트
  const overallComment = generateOverallComment(gradingResult);

  return {
    gradingResult,
    comments: {
      areaComments: {
        '종합 분석': overallComment,
      },
      roadmap,
    },
    generatedAt: new Date(),
  };
}
