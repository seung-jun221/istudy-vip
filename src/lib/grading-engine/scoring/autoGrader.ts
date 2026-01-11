/**
 * 자동 채점 엔진
 * 학생 답안 → 종합 채점 결과 생성
 */

import {
  StudentSubmission,
  GradingResult,
  QuestionResult,
  AreaResult,
  DifficultyResult,
  TestType,
} from '../types/index';
import { ScoreTableParser } from '../parsers/scoreTableParser';
import { GradeCalculator } from './gradeCalculator';

export class AutoGrader {
  /**
   * 자동 채점 실행
   */
  static grade(submission: StudentSubmission, correctAnswers: { [questionNumber: number]: string | number }): GradingResult {
    const testPaper = ScoreTableParser.getTestPaper(submission.testType);

    // 1. 문항별 채점
    const questionResults: QuestionResult[] = testPaper.questions.map((question) => {
      const studentAnswer = submission.answers.find(a => a.questionNumber === question.questionNumber);
      const correctAnswer = correctAnswers[question.questionNumber];

      const isCorrect = studentAnswer?.answer?.toString() === correctAnswer?.toString();
      const earnedScore = isCorrect ? question.score : 0;

      return {
        questionNumber: question.questionNumber,
        area: question.area,
        difficulty: question.difficulty,
        score: question.score,
        earnedScore,
        isCorrect,
      };
    });

    // 2. 총점 계산
    const totalEarnedScore = questionResults.reduce((sum, r) => sum + r.earnedScore, 0);

    // 3. 영역별 집계
    const areaResults: AreaResult[] = this.calculateAreaResults(submission.testType, questionResults);

    // 4. 난이도별 집계
    const difficultyResults: DifficultyResult[] = this.calculateDifficultyResults(questionResults, submission.testType);

    // 5. 등급 계산
    const percentile = GradeCalculator.calculatePercentile(submission.testType, totalEarnedScore);
    const grade9 = GradeCalculator.calculate9Grade(submission.testType, totalEarnedScore);
    const grade5 = GradeCalculator.calculate5Grade(percentile); // 2028 대입제도 개편안
    const expectedHighSchoolGrade = GradeCalculator.calculateExpectedHighSchoolGrade(submission.testType, grade9);

    // 6. 통계 정보
    const statistics = GradeCalculator.getGradeCutoffs(submission.testType);

    return {
      studentInfo: {
        studentId: submission.studentId,
        studentName: submission.studentName,
        grade: submission.grade,
        testType: submission.testType,
      },
      overallScore: {
        totalScore: testPaper.totalScore,
        earnedScore: Math.round(totalEarnedScore * 10) / 10, // 소수 첫째자리
        percentile: Math.round(percentile * 10) / 10,
        grade9,
        grade5,
        expectedHighSchoolGrade,
      },
      areaResults,
      difficultyResults,
      questionResults,
      statistics: {
        mean: statistics.mean,
        stdDev: statistics.stdDev,
        grade1Cut: statistics.grade1Cut,
        grade2Cut: statistics.grade2Cut,
        grade3Cut: statistics.grade3Cut,
        grade4Cut: statistics.grade4Cut,
        grade5Cut: statistics.grade5Cut,
      },
    };
  }

  /**
   * 영역별 결과 계산
   */
  private static calculateAreaResults(testType: string, questionResults: QuestionResult[]): AreaResult[] {
    // 영역별 그룹화
    const areaGroups = questionResults.reduce((acc, result) => {
      if (!acc[result.area]) {
        acc[result.area] = [];
      }
      acc[result.area].push(result);
      return acc;
    }, {} as { [area: string]: QuestionResult[] });

    // 각 영역별 통계 계산
    return Object.entries(areaGroups).map(([area, results]) => {
      const totalScore = results.reduce((sum, r) => sum + r.score, 0);
      const earnedScore = results.reduce((sum, r) => sum + r.earnedScore, 0);
      const correctCount = results.filter(r => r.isCorrect).length;
      const totalCount = results.length;
      const accuracy = (correctCount / totalCount) * 100;

      // T-Score 계산
      const tScore = GradeCalculator.calculateTScore(testType as any, area, earnedScore);

      // 백분위 근사 (T-Score 기반)
      const percentile = GradeCalculator['normalCDF']((tScore - 50) / 10) * 100;

      return {
        area: area as any,
        totalScore: Math.round(totalScore * 10) / 10,
        earnedScore: Math.round(earnedScore * 10) / 10,
        correctCount,
        totalCount,
        accuracy: Math.round(accuracy * 10) / 10,
        tScore: Math.round(tScore * 10) / 10,
        percentile: Math.round(percentile * 10) / 10,
      };
    });
  }

  /**
   * 난이도별 결과 계산
   */
  private static calculateDifficultyResults(questionResults: QuestionResult[], testType: TestType): DifficultyResult[] {
    // 시험별 난이도 매핑
    // MONO/TRI: MID(⭐⭐)→하난도, HIGH(⭐⭐⭐)→중난도, VERY_HIGH(⭐⭐⭐⭐)→고난도
    // DI: LOW(⭐)+MID(⭐⭐)→하난도, HIGH(⭐⭐⭐)→중난도, VERY_HIGH(⭐⭐⭐⭐)+EXTREME(⭐⭐⭐⭐⭐)→고난도
    const getDifficultyMapping = (testType: TestType) => {
      if (testType === 'DI') {
        return {
          LOW: 'LOW',        // ⭐ → 하난도
          MID: 'LOW',        // ⭐⭐ → 하난도
          HIGH: 'MID',       // ⭐⭐⭐ → 중난도
          VERY_HIGH: 'HIGH', // ⭐⭐⭐⭐ → 고난도
          EXTREME: 'HIGH',   // ⭐⭐⭐⭐⭐ → 고난도
        };
      } else {
        // MONO, TRI
        return {
          LOW: 'LOW',        // ⭐ → 하난도 (MONO/TRI에는 없음)
          MID: 'LOW',        // ⭐⭐ → 하난도
          HIGH: 'MID',       // ⭐⭐⭐ → 중난도
          VERY_HIGH: 'HIGH', // ⭐⭐⭐⭐ → 고난도
          EXTREME: 'HIGH',   // ⭐⭐⭐⭐⭐ → 고난도
        };
      }
    };

    const difficultyMapping = getDifficultyMapping(testType);

    // 난이도별 그룹화
    const groups = questionResults.reduce((acc, result) => {
      const mappedDiff = difficultyMapping[result.difficulty] as 'LOW' | 'MID' | 'HIGH';
      if (!acc[mappedDiff]) {
        acc[mappedDiff] = [];
      }
      acc[mappedDiff].push(result);
      return acc;
    }, {} as { [key: string]: QuestionResult[] });

    return (['LOW', 'MID', 'HIGH'] as const).map((difficulty) => {
      const results = groups[difficulty] || [];
      const totalScore = results.reduce((sum, r) => sum + r.score, 0);
      const earnedScore = results.reduce((sum, r) => sum + r.earnedScore, 0);
      const correctCount = results.filter(r => r.isCorrect).length;
      const totalCount = results.length;
      const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

      return {
        difficulty,
        totalScore: Math.round(totalScore * 10) / 10,
        earnedScore: Math.round(earnedScore * 10) / 10,
        correctCount,
        totalCount,
        accuracy: Math.round(accuracy * 10) / 10,
      };
    });
  }
}
