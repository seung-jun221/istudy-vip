/**
 * 배점표 파서
 * docs/diagnostic-test/진단검사_3종_통합_문항분석_배점표_v2.1_최종.md 파일을 파싱
 */

import { TestType, QuestionInfo, TestPaper, AreaType, Difficulty } from '../types/index.js';

export class ScoreTableParser {
  /**
   * 배점표 데이터 (하드코딩 - 실제로는 MD 파일 파싱)
   */
  private static readonly TEST_PAPERS: { [key in TestType]: TestPaper } = {
    MONO: {
      type: 'MONO',
      totalQuestions: 25,
      totalScore: 100,
      questions: [
        // 수와 연산 (1~8번)
        { questionNumber: 1, area: '수와 연산', difficulty: 'MID', score: 3.5, content: '150 이하 자연수 중 약수의 개수가 3개인 수의 개수' },
        { questionNumber: 2, area: '수와 연산', difficulty: 'HIGH', score: 4.5, content: 'x^a × y^b × (x+y)의 인수 개수' },
        { questionNumber: 3, area: '수와 연산', difficulty: 'MID', score: 3.5, content: '(a+12)/(a-2)가 정수가 되는 a의 값의 합' },
        { questionNumber: 4, area: '수와 연산', difficulty: 'MID', score: 3.5, content: '연분수 계산' },
        { questionNumber: 5, area: '수와 연산', difficulty: 'HIGH', score: 4.0, content: '72×a=b^2를 만족하는 a' },
        { questionNumber: 6, area: '수와 연산', difficulty: 'VERY_HIGH', score: 4.5, content: '약수 개수가 3개일 때 순서쌍 개수' },
        { questionNumber: 7, area: '수와 연산', difficulty: 'MID', score: 3.5, content: '식 간단히 하기' },
        { questionNumber: 8, area: '수와 연산', difficulty: 'HIGH', score: 4.0, content: '최대공약수 활용' },

        // 식의 계산 (9~12번)
        { questionNumber: 9, area: '식의 계산', difficulty: 'MID', score: 3.5, content: '(-4) × (-a) = b^2' },
        { questionNumber: 10, area: '식의 계산', difficulty: 'MID', score: 3.5, content: '반대 부호 조건' },
        { questionNumber: 11, area: '식의 계산', difficulty: 'HIGH', score: 4.0, content: '거듭제곱 패턴' },
        { questionNumber: 12, area: '식의 계산', difficulty: 'VERY_HIGH', score: 4.5, content: '일반항 계산' },

        // 방정식 (13~20번)
        { questionNumber: 13, area: '방정식', difficulty: 'MID', score: 3.5, content: '다항식 상수항' },
        { questionNumber: 14, area: '방정식', difficulty: 'HIGH', score: 4.0, content: '복잡한 분수식' },
        { questionNumber: 15, area: '방정식', difficulty: 'HIGH', score: 4.0, content: '항등식' },
        { questionNumber: 16, area: '방정식', difficulty: 'VERY_HIGH', score: 4.5, content: '방정식 해의 배수 관계' },
        { questionNumber: 17, area: '방정식', difficulty: 'HIGH', score: 4.0, content: '절댓값 방정식' },
        { questionNumber: 18, area: '방정식', difficulty: 'VERY_HIGH', score: 4.5, content: '가우스 기호 방정식' },
        { questionNumber: 19, area: '방정식', difficulty: 'HIGH', score: 4.0, content: '연산 정의' },
        { questionNumber: 20, area: '방정식', difficulty: 'HIGH', score: 4.0, content: '평행사변형 넓이' },

        // 함수 (21~25번)
        { questionNumber: 21, area: '함수', difficulty: 'HIGH', score: 4.0, content: '두 함수 조건' },
        { questionNumber: 22, area: '함수', difficulty: 'MID', score: 4.0, content: '그래프 해석' },
        { questionNumber: 23, area: '함수', difficulty: 'HIGH', score: 4.0, content: '일차함수 그래프' },
        { questionNumber: 24, area: '함수', difficulty: 'HIGH', score: 4.0, content: '반비례 그래프' },
        { questionNumber: 25, area: '함수', difficulty: 'VERY_HIGH', score: 4.5, content: '삼각형 넓이' },
      ],
      areaScores: {
        '수와 연산': 31.5,
        '식의 계산': 15.5,
        '방정식': 32.5,
        '함수': 20.5,
      },
    },
    DI: {
      type: 'DI',
      totalQuestions: 25,
      totalScore: 100,
      questions: [
        // 수와 연산 (1~8번)
        { questionNumber: 1, area: '수와 연산', difficulty: 'LOW', score: 3.0, content: '순환소수를 분수로' },
        { questionNumber: 2, area: '수와 연산', difficulty: 'MID', score: 3.5, content: '다항식 내림차순' },
        { questionNumber: 3, area: '수와 연산', difficulty: 'HIGH', score: 4.0, content: '복잡한 분수식' },
        { questionNumber: 4, area: '수와 연산', difficulty: 'MID', score: 3.5, content: '양수 규칙' },
        { questionNumber: 5, area: '수와 연산', difficulty: 'MID', score: 3.5, content: '지수법칙' },
        { questionNumber: 6, area: '수와 연산', difficulty: 'VERY_HIGH', score: 4.5, content: '지수 패턴 인식' },
        { questionNumber: 7, area: '수와 연산', difficulty: 'HIGH', score: 4.0, content: '유리수 조건' },
        { questionNumber: 8, area: '수와 연산', difficulty: 'HIGH', score: 4.5, content: '최대공약수' },

        // 식의 계산 (9~12번)
        { questionNumber: 9, area: '식의 계산', difficulty: 'MID', score: 3.5, content: '다항식 곱셈' },
        { questionNumber: 10, area: '식의 계산', difficulty: 'MID', score: 3.5, content: '등식 변형' },
        { questionNumber: 11, area: '식의 계산', difficulty: 'HIGH', score: 4.0, content: '분수식 정리' },
        { questionNumber: 12, area: '식의 계산', difficulty: 'VERY_HIGH', score: 4.5, content: '인수분해 활용' },

        // 방정식 (13~16번)
        { questionNumber: 13, area: '방정식', difficulty: 'HIGH', score: 4.0, content: '항등식' },
        { questionNumber: 14, area: '방정식', difficulty: 'VERY_HIGH', score: 4.5, content: '방정식 해의 배수' },
        { questionNumber: 15, area: '방정식', difficulty: 'HIGH', score: 4.0, content: '연립방정식' },
        { questionNumber: 16, area: '방정식', difficulty: 'EXTREME', score: 5.0, content: '치환 연립방정식' },

        // 함수 (17~25번)
        { questionNumber: 17, area: '함수', difficulty: 'LOW', score: 3.0, content: '일차함수 미지수' },
        { questionNumber: 18, area: '함수', difficulty: 'MID', score: 3.5, content: 'x절편 = y절편' },
        { questionNumber: 19, area: '함수', difficulty: 'HIGH', score: 4.0, content: '대칭 + 수직' },
        { questionNumber: 20, area: '함수', difficulty: 'MID', score: 4.0, content: '그래프 해석' },
        { questionNumber: 21, area: '함수', difficulty: 'VERY_HIGH', score: 4.5, content: '대칭 최단거리' },
        { questionNumber: 22, area: '함수', difficulty: 'HIGH', score: 4.0, content: '수직이등분선' },
        { questionNumber: 23, area: '함수', difficulty: 'VERY_HIGH', score: 4.5, content: '삼각형 조건' },
        { questionNumber: 24, area: '함수', difficulty: 'HIGH', score: 4.0, content: '제4사분면 교점' },
        { questionNumber: 25, area: '함수', difficulty: 'EXTREME', score: 5.0, content: '삼각형 넓이 이등분' },
      ],
      areaScores: {
        '수와 연산': 30.5,
        '식의 계산': 15.5,
        '방정식': 17.5,
        '함수': 36.5,
      },
    },
    TRI: {
      type: 'TRI',
      totalQuestions: 25,
      totalScore: 100,
      questions: [
        // 실수와 연산 (1~8번)
        { questionNumber: 1, area: '실수와 연산', difficulty: 'MID', score: 3.5, content: '무리수 정수/소수 부분' },
        { questionNumber: 2, area: '실수와 연산', difficulty: 'MID', score: 3.5, content: '제곱근 대소 비교' },
        { questionNumber: 3, area: '실수와 연산', difficulty: 'MID', score: 3.5, content: '분모 유리화' },
        { questionNumber: 4, area: '실수와 연산', difficulty: 'MID', score: 3.5, content: '무리수 사칙연산' },
        { questionNumber: 5, area: '실수와 연산', difficulty: 'HIGH', score: 4.0, content: '가우스 기호 활용' },
        { questionNumber: 6, area: '실수와 연산', difficulty: 'VERY_HIGH', score: 4.5, content: '제곱근 연산' },
        { questionNumber: 7, area: '실수와 연산', difficulty: 'VERY_HIGH', score: 4.5, content: '근과 계수 관계' },
        { questionNumber: 8, area: '실수와 연산', difficulty: 'HIGH', score: 4.0, content: '대칭식 계산' },

        // 다항식 (9~12번)
        { questionNumber: 9, area: '다항식', difficulty: 'VERY_HIGH', score: 4.5, content: 'a³+b³+c³' },
        { questionNumber: 10, area: '다항식', difficulty: 'HIGH', score: 4.0, content: '대입 계산' },
        { questionNumber: 11, area: '다항식', difficulty: 'HIGH', score: 4.0, content: '인수분해' },
        { questionNumber: 12, area: '다항식', difficulty: 'VERY_HIGH', score: 4.5, content: '산술-기하 평균' },

        // 이차방정식 (13~16번)
        { questionNumber: 13, area: '이차방정식', difficulty: 'HIGH', score: 4.0, content: '가우스 기호 방정식' },
        { questionNumber: 14, area: '이차방정식', difficulty: 'VERY_HIGH', score: 4.5, content: '무리수 근' },
        { questionNumber: 15, area: '이차방정식', difficulty: 'HIGH', score: 4.0, content: '근과 계수' },
        { questionNumber: 16, area: '이차방정식', difficulty: 'HIGH', score: 4.0, content: '절댓값 같은 근' },

        // 이차함수 (17~25번)
        { questionNumber: 17, area: '이차함수', difficulty: 'HIGH', score: 3.5, content: '평행이동' },
        { questionNumber: 18, area: '이차함수', difficulty: 'HIGH', score: 3.5, content: '꼭짓점 조건' },
        { questionNumber: 19, area: '이차함수', difficulty: 'HIGH', score: 4.0, content: '최댓값 조건' },
        { questionNumber: 20, area: '이차함수', difficulty: 'HIGH', score: 4.0, content: '구간 최값' },
        { questionNumber: 21, area: '이차함수', difficulty: 'VERY_HIGH', score: 4.5, content: '구간 최값 케이스' },
        { questionNumber: 22, area: '이차함수', difficulty: 'VERY_HIGH', score: 4.5, content: '평행이동 + 최값' },
        { questionNumber: 23, area: '이차함수', difficulty: 'VERY_HIGH', score: 4.5, content: '교점 거리' },
        { questionNumber: 24, area: '이차함수', difficulty: 'EXTREME', score: 5.0, content: '판별식' },
        { questionNumber: 25, area: '이차함수', difficulty: 'EXTREME', score: 5.0, content: '함수값 부호' },
      ],
      areaScores: {
        '실수와 연산': 31.0,
        '다항식': 17.0,
        '이차방정식': 16.5,
        '이차함수': 35.5,
      },
    },
  };

  /**
   * 시험지 정보 가져오기
   */
  static getTestPaper(testType: TestType): TestPaper {
    return this.TEST_PAPERS[testType];
  }

  /**
   * 문항 정보 가져오기
   */
  static getQuestionInfo(testType: TestType, questionNumber: number): QuestionInfo | undefined {
    const paper = this.TEST_PAPERS[testType];
    return paper.questions.find(q => q.questionNumber === questionNumber);
  }

  /**
   * 영역별 문항 목록 가져오기
   */
  static getQuestionsByArea(testType: TestType, area: AreaType): QuestionInfo[] {
    const paper = this.TEST_PAPERS[testType];
    return paper.questions.filter(q => q.area === area);
  }

  /**
   * 난이도별 문항 목록 가져오기
   */
  static getQuestionsByDifficulty(testType: TestType, difficulty: Difficulty): QuestionInfo[] {
    const paper = this.TEST_PAPERS[testType];
    return paper.questions.filter(q => q.difficulty === difficulty);
  }
}
