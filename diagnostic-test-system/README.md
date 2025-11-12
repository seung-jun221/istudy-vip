# 🎓 i.study 수리탐구 진단검사 자동 채점 시스템

중학생 대상 수학 진단검사(MONO/DI/TRI) 자동 채점 및 보고서 생성 시스템

## 📋 주요 기능

### 1. 자동 채점
- ✅ 25문항 자동 채점 (난이도별 차등 배점 3.0~5.0점)
- ✅ 총점, 영역별 점수, 난이도별 점수 계산
- ✅ 정답률 분석

### 2. 등급 산출
- ✅ 9등급제 환산 (1~9등급)
- ✅ 5등급제 환산 (A~E등급)
- ✅ 백분위 계산 (정규분포 기반)
- ✅ T-Score 계산 (영역별)
- ✅ 고1 예상 등급 산출

### 3. 통계 분석
- ✅ 영역별 상세 분석 (수와 연산, 식의 계산, 방정식, 함수)
- ✅ 난이도별 정답률 분석 (하/중/고난도)
- ✅ 평균, 표준편차, 등급컷 제공

## 🚀 빠른 시작

### 설치
\`\`\`bash
cd diagnostic-test-system
npm install
\`\`\`

### 예제 실행
\`\`\`bash
npm run dev
\`\`\`

## 📖 사용 방법

### 1. 기본 채점

\`\`\`typescript
import { AutoGrader, StudentSubmission } from './src/index.js';

// 정답표
const correctAnswers = {
  1: '답1', 2: '답2', 3: '답3', // ... 25문항
};

// 학생 답안
const submission: StudentSubmission = {
  studentId: 'STU001',
  studentName: '김민석',
  grade: '중1',
  testType: 'DI',
  answers: [
    { questionNumber: 1, answer: '학생답안1' },
    { questionNumber: 2, answer: '학생답안2' },
    // ... 25문항
  ],
  submittedAt: new Date(),
};

// 자동 채점
const result = AutoGrader.grade(submission, correctAnswers);

console.log(\`총점: \${result.overallScore.earnedScore}점\`);
console.log(\`등급: \${result.overallScore.grade9}등급\`);
console.log(\`백분위: 상위 \${100 - result.overallScore.percentile}%\`);
\`\`\`

### 2. 시험지 정보 조회

\`\`\`typescript
import { ScoreTableParser } from './src/index.js';

// DI 시험지 전체 정보
const testPaper = ScoreTableParser.getTestPaper('DI');
console.log(\`총 문항 수: \${testPaper.totalQuestions}\`);
console.log(\`총점: \${testPaper.totalScore}점\`);

// 특정 문항 정보
const q1 = ScoreTableParser.getQuestionInfo('DI', 1);
console.log(\`1번 문항: \${q1.area}, \${q1.score}점\`);

// 영역별 문항 조회
const mathQuestions = ScoreTableParser.getQuestionsByArea('DI', '수와 연산');
console.log(\`수와 연산 문항 수: \${mathQuestions.length}\`);
\`\`\`

### 3. 등급 계산

\`\`\`typescript
import { GradeCalculator } from './src/index.js';

// 9등급 계산
const grade9 = GradeCalculator.calculate9Grade('DI', 72);
console.log(\`9등급: \${grade9}등급\`); // 2등급

// 5등급 변환
const grade5 = GradeCalculator.convert9To5Grade(grade9);
console.log(\`5등급: \${grade5}\`); // A등급

// 백분위 계산
const percentile = GradeCalculator.calculatePercentile('DI', 72);
console.log(\`백분위: 상위 \${(100 - percentile).toFixed(1)}%\`);

// T-Score 계산
const tScore = GradeCalculator.calculateTScore('DI', '함수', 18.25);
console.log(\`함수 T-Score: \${tScore}\`);

// 고1 예상 등급
const expectedGrade = GradeCalculator.calculateExpectedHighSchoolGrade('DI', 2);
console.log(\`고1 예상: \${expectedGrade}\`); // "1~2등급"
\`\`\`

## 📊 시험 유형

### MONO (중1-1 과정 이수자)
- **대상**: 중1-1 과정 완료 학생
- **난이도**: 중등 기본 + 사고력 중심
- **평균**: 45.5점 (표준편차 22점)
- **1등급 컷**: 87점

### DI (중2-1 과정 이수자)
- **대상**: 중2-1 과정 완료 학생
- **난이도**: 중등 심화 + 고등 적응력
- **평균**: 47점 (표준편차 20점)
- **1등급 컷**: 89점

### TRI (중3-1 과정 + 공통수학1)
- **대상**: 중3-1 과정 + 공통수학1 학습자
- **난이도**: 고등 수학 준비도 (최고난도)
- **평균**: 42.5점 (표준편차 24점)
- **1등급 컷**: 84점

## 📁 프로젝트 구조

\`\`\`
diagnostic-test-system/
├── src/
│   ├── types/           # 타입 정의
│   │   └── index.ts
│   ├── parsers/         # 배점표 파서
│   │   └── scoreTableParser.ts
│   ├── scoring/         # 채점 엔진
│   │   ├── autoGrader.ts
│   │   └── gradeCalculator.ts
│   └── index.ts         # 메인 엔트리
├── examples/            # 예제 코드
│   └── example-di.ts
├── tests/              # 테스트 코드
├── data/               # 데이터 파일
│   ├── 등급산출기준표.md
│   └── 배점표.md
└── templates/          # HTML 템플릿
    └── report-template.html
\`\`\`

## 🎯 채점 결과 구조

\`\`\`typescript
{
  studentInfo: {
    studentId: "STU001",
    studentName: "김민석",
    grade: "중1",
    testType: "DI"
  },
  overallScore: {
    totalScore: 100,
    earnedScore: 72.0,
    percentile: 92.5,
    grade9: 2,                    // 2등급
    grade5: "A",                  // A등급
    expectedHighSchoolGrade: "1~2등급"
  },
  areaResults: [
    {
      area: "수와 연산",
      totalScore: 30.5,
      earnedScore: 21.5,
      correctCount: 6,
      totalCount: 8,
      accuracy: 75.0,
      tScore: 61.7,
      percentile: 75.0
    },
    // ... 다른 영역
  ],
  difficultyResults: [
    {
      difficulty: "HIGH",
      totalScore: 37.0,
      earnedScore: 0,
      correctCount: 0,
      totalCount: 9,
      accuracy: 0
    },
    // ... 다른 난이도
  ],
  questionResults: [ ... ],  // 문항별 결과
  statistics: {              // 통계 정보
    mean: 47.0,
    stdDev: 20.0,
    grade1Cut: 89,
    // ...
  }
}
\`\`\`

## 🔧 개발

### 빌드
\`\`\`bash
npm run build
\`\`\`

### 테스트
\`\`\`bash
npm test
\`\`\`

## 📌 다음 단계

- [ ] HTML 보고서 자동 생성 엔진
- [ ] 동적 코멘트 시스템 (영역별 학습 전략)
- [ ] 3개월 맞춤 학습 로드맵 생성
- [ ] Supabase 연동 (DB 저장)
- [ ] API 서버 구축

## 📝 라이선스

MIT

## 👥 제작

i.study 수리탐구
