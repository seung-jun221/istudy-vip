/**
 * DI 진단검사 채점 예제
 * 김민석 학생 (중1, 72점)
 */

import { AutoGrader, StudentSubmission } from '../src/index.js';

// 정답표 (실제로는 DB에서 가져오거나 별도 파일로 관리)
const DI_CORRECT_ANSWERS: { [questionNumber: number]: string | number } = {
  // 수와 연산 (1~8번) - 6/8 정답
  1: '0.27', 2: '5', 3: '정답값', 4: '정답값', 5: '8', 6: '정답값', 7: '12', 8: '18',

  // 식의 계산 (9~12번) - 4/4 정답
  9: '정답값', 10: '정답값', 11: '정답값', 12: '정답값',

  // 방정식 (13~16번) - 3/4 정답
  13: '정답값', 14: '정답값', 15: '오답', 16: '정답값',

  // 함수 (17~25번) - 4/9 정답
  17: '정답값', 18: '정답값', 19: '정답값', 20: '정답값',
  21: '오답', 22: '오답', 23: '오답', 24: '오답', 25: '오답',
};

// 학생 답안 (HTML 템플릿 예제 기준)
const studentSubmission: StudentSubmission = {
  studentId: 'STU001',
  studentName: '김민석',
  grade: '중1',
  testType: 'DI',
  answers: [
    // 수와 연산: 6/8 정답 (3번, 6번 오답)
    { questionNumber: 1, answer: '0.27' },
    { questionNumber: 2, answer: '5' },
    { questionNumber: 3, answer: '오답' }, // X
    { questionNumber: 4, answer: '정답값' },
    { questionNumber: 5, answer: '8' },
    { questionNumber: 6, answer: '오답' }, // X
    { questionNumber: 7, answer: '12' },
    { questionNumber: 8, answer: '18' },

    // 식의 계산: 4/4 정답
    { questionNumber: 9, answer: '정답값' },
    { questionNumber: 10, answer: '정답값' },
    { questionNumber: 11, answer: '정답값' },
    { questionNumber: 12, answer: '정답값' },

    // 방정식: 3/4 정답 (15번 오답)
    { questionNumber: 13, answer: '정답값' },
    { questionNumber: 14, answer: '정답값' },
    { questionNumber: 15, answer: '오답' }, // X
    { questionNumber: 16, answer: '정답값' },

    // 함수: 4/9 정답 (21~25번 고난도 전체 오답)
    { questionNumber: 17, answer: '정답값' },
    { questionNumber: 18, answer: '정답값' },
    { questionNumber: 19, answer: '정답값' },
    { questionNumber: 20, answer: '정답값' },
    { questionNumber: 21, answer: '오답' }, // X
    { questionNumber: 22, answer: '오답' }, // X
    { questionNumber: 23, answer: '오답' }, // X
    { questionNumber: 24, answer: '오답' }, // X
    { questionNumber: 25, answer: '오답' }, // X
  ],
  submittedAt: new Date('2025-01-15T10:00:00Z'),
};

// 자동 채점 실행
const result = AutoGrader.grade(studentSubmission, DI_CORRECT_ANSWERS);

// 결과 출력
console.log('===== 진단검사 자동 채점 결과 =====\n');

console.log(`학생 정보: ${result.studentInfo.studentName} (${result.studentInfo.grade})`);
console.log(`시험 유형: ${result.studentInfo.testType}\n`);

console.log('--- 종합 성적 ---');
console.log(`총점: ${result.overallScore.earnedScore}점 / ${result.overallScore.totalScore}점`);
console.log(`백분위: 상위 ${(100 - result.overallScore.percentile).toFixed(1)}% (${result.overallScore.percentile.toFixed(1)} percentile)`);
console.log(`9등급제: ${result.overallScore.grade9}등급`);
console.log(`5등급제: ${result.overallScore.grade5}등급`);
console.log(`고1 예상 등급: ${result.overallScore.expectedHighSchoolGrade}\n`);

console.log('--- 영역별 성적 ---');
result.areaResults.forEach((area) => {
  console.log(`[${area.area}]`);
  console.log(`  점수: ${area.earnedScore}/${area.totalScore}점`);
  console.log(`  정답률: ${area.accuracy}% (${area.correctCount}/${area.totalCount}문항)`);
  console.log(`  T-Score: ${area.tScore}`);
  console.log(`  백분위: ${area.percentile}%`);
  console.log('');
});

console.log('--- 난이도별 정답률 ---');
const diffLabels = { LOW: '하난도', MID: '중난도', HIGH: '고난도' };
result.difficultyResults.forEach((diff) => {
  console.log(`[${diffLabels[diff.difficulty]}]`);
  console.log(`  정답률: ${diff.accuracy}% (${diff.correctCount}/${diff.totalCount}문항)`);
  console.log(`  득점: ${diff.earnedScore}/${diff.totalScore}점`);
  console.log('');
});

console.log('--- 통계 정보 ---');
console.log(`전국 평균: ${result.statistics.mean}점`);
console.log(`표준편차: ${result.statistics.stdDev}`);
console.log(`1등급 컷: ${result.statistics.grade1Cut}점`);
console.log(`2등급 컷: ${result.statistics.grade2Cut}점`);
console.log(`3등급 컷: ${result.statistics.grade3Cut}점`);

// JSON 출력 (보고서 생성용)
console.log('\n\n===== JSON 결과 (보고서 생성용) =====');
console.log(JSON.stringify(result, null, 2));
