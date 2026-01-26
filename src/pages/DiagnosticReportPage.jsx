import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFullResultById, getOrGenerateReport } from '../utils/diagnosticService';
import NormalDistributionChart from '../components/charts/NormalDistributionChart';
import TScoreBarChart from '../components/charts/TScoreBarChart';
import SchoolCompetitivenessChart from '../components/charts/SchoolCompetitivenessChart';
import './DiagnosticReportPage.css';

export default function DiagnosticReportPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReportData();
  }, [id]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const result = await getFullResultById(id);

      if (!result) {
        setError('결과를 찾을 수 없습니다.');
        return;
      }

      setData(result);

      const reportData = await getOrGenerateReport(id);
      if (reportData) {
        setReport(reportData);
      }
    } catch (err) {
      console.error('결과 조회 실패:', err);
      setError('결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getTestTypeName = (testType) => {
    const names = {
      'DI': 'DI 진단검사',
      'MONO': 'MONO 진단검사',
      'TRI': 'TRI 진단검사'
    };
    return names[testType] || testType;
  };

  const QUESTION_DATA = {
    MONO: {
      1: { content: '150 이하 자연수 중 약수의 개수가 3개인 수의 개수', score: 3.5 },
      2: { content: 'x^a × y^b × (x+y)의 인수 개수', score: 4.5 },
      3: { content: '(a+12)/(a-2)가 정수가 되는 a의 값의 합', score: 3.5 },
      4: { content: '연분수 계산', score: 3.5 },
      5: { content: '72×a=b²를 만족하는 a', score: 4.0 },
      6: { content: '약수 개수가 3개일 때 순서쌍 개수', score: 4.5 },
      7: { content: '식 간단히 하기', score: 3.5 },
      8: { content: '최대공약수 활용', score: 4.0 },
      9: { content: '(-4) × (-a) = b²', score: 3.5 },
      10: { content: '반대 부호 조건', score: 3.5 },
      11: { content: '거듭제곱 패턴', score: 4.0 },
      12: { content: '일반항 계산', score: 4.5 },
      13: { content: '다항식 상수항', score: 3.5 },
      14: { content: '복잡한 분수식', score: 4.0 },
      15: { content: '항등식', score: 4.0 },
      16: { content: '방정식 해의 배수 관계', score: 4.5 },
      17: { content: '절댓값 방정식', score: 4.0 },
      18: { content: '가우스 기호 방정식', score: 4.5 },
      19: { content: '연산 정의', score: 4.0 },
      20: { content: '평행사변형 넓이', score: 4.0 },
      21: { content: '두 함수 조건', score: 4.0 },
      22: { content: '그래프 해석', score: 4.0 },
      23: { content: '일차함수 그래프', score: 4.0 },
      24: { content: '반비례 그래프', score: 4.0 },
      25: { content: '삼각형 넓이', score: 4.5 }
    },
    DI: {
      1: { content: '순환소수를 분수로', score: 3.0 },
      2: { content: '다항식 내림차순', score: 3.5 },
      3: { content: '복잡한 분수식', score: 4.0 },
      4: { content: '양수 규칙', score: 3.5 },
      5: { content: '지수법칙', score: 3.5 },
      6: { content: '지수 패턴 인식', score: 4.5 },
      7: { content: '유리수 조건', score: 4.0 },
      8: { content: '최대공약수', score: 4.5 },
      9: { content: '다항식 곱셈', score: 3.5 },
      10: { content: '등식 변형', score: 3.5 },
      11: { content: '분수식 정리', score: 4.0 },
      12: { content: '인수분해 활용', score: 4.5 },
      13: { content: '항등식', score: 4.0 },
      14: { content: '방정식 해의 배수', score: 4.5 },
      15: { content: '연립방정식', score: 4.0 },
      16: { content: '치환 연립방정식', score: 5.0 },
      17: { content: '일차함수 미지수', score: 3.0 },
      18: { content: 'x절편 = y절편', score: 3.5 },
      19: { content: '대칭 + 수직', score: 4.0 },
      20: { content: '그래프 해석', score: 4.0 },
      21: { content: '대칭 최단거리', score: 4.5 },
      22: { content: '수직이등분선', score: 4.0 },
      23: { content: '삼각형 조건', score: 4.5 },
      24: { content: '제4사분면 교점', score: 4.0 },
      25: { content: '삼각형 넓이 이등분', score: 5.0 }
    },
    TRI: {
      1: { content: '제곱근 계산', score: 3.0 },
      2: { content: '무리수 조건', score: 3.5 },
      3: { content: '실수 대소 비교', score: 3.5 },
      4: { content: '근호 간단히', score: 3.5 },
      5: { content: '분모 유리화', score: 4.0 },
      6: { content: '제곱근 응용', score: 4.5 },
      7: { content: '다항식 곱셈', score: 3.5 },
      8: { content: '곱셈공식 활용', score: 4.0 },
      9: { content: '인수분해 기본', score: 3.5 },
      10: { content: '인수분해 심화', score: 4.0 },
      11: { content: '복잡한 인수분해', score: 4.5 },
      12: { content: '인수분해 응용', score: 4.5 },
      13: { content: '이차방정식 풀이', score: 3.5 },
      14: { content: '근의 공식', score: 4.0 },
      15: { content: '판별식 활용', score: 4.0 },
      16: { content: '근과 계수의 관계', score: 4.5 },
      17: { content: '이차방정식 활용', score: 4.5 },
      18: { content: '새로운 이차방정식', score: 4.5 },
      19: { content: '이차함수 그래프', score: 3.5 },
      20: { content: '꼭짓점과 축', score: 4.0 },
      21: { content: '이차함수 최대/최소', score: 4.5 },
      22: { content: '그래프 이동', score: 4.0 },
      23: { content: '이차함수 결정', score: 4.5 },
      24: { content: '이차함수와 직선', score: 4.5 },
      25: { content: '이차함수 종합', score: 5.0 }
    }
  };

  const getDifficultyInfo = (difficulty) => {
    const info = {
      'LOW': { label: '⭐', text: '기본', color: '#4A7C59' },
      'MID': { label: '⭐⭐', text: '중급', color: '#66BB6A' },
      'HIGH': { label: '⭐⭐⭐', text: '심화', color: '#C49A3F' },
      'VERY_HIGH': { label: '⭐⭐⭐⭐', text: '고급', color: '#FF7043' },
      'EXTREME': { label: '⭐⭐⭐⭐⭐', text: '최고급', color: '#A85454' }
    };
    return info[difficulty] || { label: '⭐⭐', text: '중급', color: '#888' };
  };

  const getQuestionContent = (testType, questionNumber) => {
    return QUESTION_DATA[testType]?.[questionNumber]?.content || '-';
  };

  const getQuestionScore = (testType, questionNumber, dbScore) => {
    if (dbScore && dbScore > 0) return dbScore;
    return QUESTION_DATA[testType]?.[questionNumber]?.score || 0;
  };

  const getTestStats = (testType) => {
    const stats = {
      'MONO': { average: 45, stdDev: 22 },
      'DI': { average: 47, stdDev: 20 },
      'TRI': { average: 42, stdDev: 24 }
    };
    return stats[testType] || { average: 45, stdDev: 20 };
  };

  const getPredictedGrade = (grade9) => {
    if (grade9 <= 2) return `${grade9}~${Math.min(grade9 + 1, 3)}`;
    if (grade9 <= 4) return `${grade9 - 1}~${grade9}`;
    if (grade9 <= 6) return `${grade9}~${grade9 + 1}`;
    return `${grade9 - 1}~${grade9}`;
  };

  const getTScoreEvaluation = (tScore) => {
    if (tScore >= 70) return { label: '최상', className: 'excellent' };
    if (tScore >= 60) return { label: '우수', className: 'good' };
    if (tScore >= 40) return { label: '보통', className: 'average' };
    if (tScore >= 30) return { label: '주의', className: 'weak' };
    return { label: '위험', className: 'critical' };
  };

  const get5GradeColor = (grade) => {
    const colors = { 1: '#4A7C59', 2: '#66BB6A', 3: '#C49A3F', 4: '#FF7043', 5: '#A85454' };
    return colors[grade] || '#999';
  };

  // ========================================
  // 학습 전략 가이드 데이터 및 로직
  // ========================================

  // 학년을 숫자로 변환 (초1=1, 초6=6, 중1=7, 중3=9, 고1=10, 고3=12)
  const parseGradeToNumber = (gradeStr) => {
    if (!gradeStr) return null;
    const str = gradeStr.toString();

    // 초등
    const elemMatch = str.match(/초\s*(\d)/);
    if (elemMatch) return parseInt(elemMatch[1]);

    // 중등
    const midMatch = str.match(/중\s*(\d)/);
    if (midMatch) return 6 + parseInt(midMatch[1]); // 중1=7, 중2=8, 중3=9

    // 고등
    const highMatch = str.match(/고\s*(\d)/);
    if (highMatch) return 9 + parseInt(highMatch[1]); // 고1=10, 고2=11, 고3=12

    return null;
  };

  // 진도를 숫자로 변환 (초6-2=62, 중1-1=71, 고1-1=101)
  // studentGrade: 학생의 현재 학년 (현행, 1년선행 등 처리용)
  const parseProgressToNumber = (progressStr, studentGrade) => {
    if (!progressStr) return null;
    const str = progressStr.toString().trim();

    // 헬퍼 함수: 학년 문자열에서 진도 숫자 추출
    const extractProgress = (text) => {
      // 고등
      const highMatch = text.match(/고\s*(\d)/);
      if (highMatch) {
        const grade = parseInt(highMatch[1]);
        const semMatch = text.match(/고\s*\d[^\d]*(\d)/);
        const semester = semMatch ? parseInt(semMatch[1]) : 1;
        return (9 + grade) * 10 + semester;
      }
      // 중등
      const midMatch = text.match(/중\s*(\d)/);
      if (midMatch) {
        const grade = parseInt(midMatch[1]);
        const semMatch = text.match(/중\s*\d[^\d]*(\d)/);
        const semester = semMatch ? parseInt(semMatch[1]) : 1;
        return (6 + grade) * 10 + semester;
      }
      // 초등
      const elemMatch = text.match(/초\s*(\d)/);
      if (elemMatch) {
        const grade = parseInt(elemMatch[1]);
        const semMatch = text.match(/초\s*\d[^\d]*(\d)/);
        const semester = semMatch ? parseInt(semMatch[1]) : 1;
        return grade * 10 + semester;
      }
      // 숫자만 (예: 6학년2학기)
      const numMatch = text.match(/(\d)\s*학년\s*(\d)?/);
      if (numMatch) {
        const grade = parseInt(numMatch[1]);
        const semester = numMatch[2] ? parseInt(numMatch[2]) : 1;
        if (grade <= 6) return grade * 10 + semester;
      }
      return null;
    };

    // 학생 학년을 진도로 변환
    const getStudentProgress = () => {
      if (!studentGrade) return 81; // 기본값 중2-1
      return parseGradeToNumber(studentGrade) * 10 + 1;
    };

    // 1. 괄호 안의 선행 정보 우선 추출 (예: 중2(중3선행중), 초4(중1))
    const parenMatch = str.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const innerProgress = extractProgress(parenMatch[1]);
      if (innerProgress) return innerProgress;
    }

    // 2. "X선행중" 패턴 (예: 고1선행중, 중3 선행중, 고2선행중)
    const advanceMatch = str.match(/(초|중|고)\s*(\d)\s*선행/);
    if (advanceMatch) {
      const level = advanceMatch[1];
      const grade = parseInt(advanceMatch[2]);
      if (level === '초') return grade * 10 + 1;
      if (level === '중') return (6 + grade) * 10 + 1;
      if (level === '고') return (9 + grade) * 10 + 1;
    }

    // 3. "현행", "학교진도" - 학생 학년과 동일
    if (str.includes('현행') || str.includes('학교진도')) {
      return getStudentProgress();
    }

    // 4. "N년선행" 패턴
    const yearMatch = str.match(/(\d)\s*년\s*선행/);
    if (yearMatch) {
      const years = parseInt(yearMatch[1]);
      return getStudentProgress() + (years * 10);
    }

    // 5. "심화" 패턴 (예: 중2 심화) - 해당 학년 2학기로 처리
    if (str.includes('심화')) {
      const progress = extractProgress(str);
      if (progress) {
        // 1학기면 2학기로 변경
        return progress % 10 === 1 ? progress + 1 : progress;
      }
    }

    // 6. 과목명 패턴 (예: 공수1,2 기본, 공통수학)
    if (str.includes('공수') || str.includes('공통수학')) {
      return 101; // 고1-1 수준
    }

    // 7. 숫자만 있는 패턴 (예: 5-1)
    const numOnlyMatch = str.match(/^(\d)-(\d)$/);
    if (numOnlyMatch) {
      const grade = parseInt(numOnlyMatch[1]);
      const semester = parseInt(numOnlyMatch[2]);
      if (grade <= 6) return grade * 10 + semester; // 초등
    }

    // 8. 기본: 단순 학년 패턴 추출
    return extractProgress(str);
  };

  // 진도 비교용 상수
  const PROGRESS = {
    '초6-2': 62,
    '중1-1': 71,
    '중3-1': 91,
    '중3-2': 92,
    '고1-1': 101
  };

  const STRATEGY_DATA = {
    advanceVsDeepen: {
      title: '선행 VS 심화',
      leftLabel: '심화',
      rightLabel: '선행',
      icon: '◆',
      strategies: [
        // 중3, 고1-1 이상, 3등급 이하 (386)
        { gradeMin: 9, gradeMax: 9, progressMin: PROGRESS['고1-1'], progressMax: null, levelMin: 3, levelMax: 9,
          recommendation: '심화', subtitle: '심화 학습 우선',
          content: `고등 수학부터는 '상위 3등급' 이하의 학생들이라면 '내신과 수능 킬러 문제'를 제외한 나머지 문항들을 정확하고, 빠르게 푸는 것이 중요합니다.

킬러를 제외한 나머지 문항들을 안정적으로 풀 수 없는 상태에서 선행을 나가는 것은 의미가 없습니다. 그렇게 나간 선행은 장기 기억으로 체득 되기 이전에 현행으로 돌아와야 하며, 학습 효율은 제로에 수렴합니다.

킬러 문제를 충분히 풀어 볼 수 있는 시간을 확보하면서, 정확도를 높이는 것은 적당한 심화 학습으로는 불가능합니다. 킬러 문제는 일반적인 학습으로는 체득할 수 있는 문항이 아닙니다. 따라서 일반적인 학습으로 체득이 가능한 심화 문제까지는 반드시 빠르고 정확하게 풀어 낼 수 있는 능력을 길러야 상위권 경쟁력이 생깁니다.`,
          keyPoint: '킬러 제외 문항을 빠르고 정확하게 푸는 능력이 우선' },
        // 중3, 고1-1 이상, 1~2등급 (329)
        { gradeMin: 9, gradeMax: 9, progressMin: PROGRESS['고1-1'], progressMax: null, levelMin: 1, levelMax: 2,
          recommendation: '선행', subtitle: '다음 학기 선행 추천',
          content: `현재 진행하고 있는 고등수학의 등급이 안정적으로 1~2등급이 나온다면, 다음 학기 고등 수학 선행을 하는 것을 추천합니다. 물론 단, 1점이라도 더 올릴 수 있도록 심화를 다지고 싶은 학생도 있겠지만 어차피 시험 한달전 내신 대비 때 다시 복습해야 합니다.

따라서 지금은 다음 학기 선행을 제대로 학습하여 고1 내신 기간에 선행이 중단되더라도 대표유형이 흔들리지 않게 만들어 놓는 것이 중요합니다. 그래야 선행의 학습 효율을 극대화 시킬 수 있습니다.

고등 수학의 경우 대표유형을 정확하고, 빠르게 푸는 것도 시중 문제집 2~3권의 학습량이 필요하니 열심히 준비해야 합니다.`,
          keyPoint: '1~2등급 안정시 다음 학기 선행 권장' },
        // 중3, 중3-1~중3-2, 전등급 (366)
        { gradeMin: 9, gradeMax: 9, progressMin: PROGRESS['중3-1'], progressMax: PROGRESS['중3-2'], levelMin: 1, levelMax: 9,
          recommendation: '선행', subtitle: '고등 수학 빠르게 시작',
          content: `중3이 아직 고등 수학을 시작한 상태가 아니라면 학습 등급에 상관없이 빠르게 시작해야 합니다. 만약 중3 수학 진도가 마무리 되지 않아서 못하는 경우라면, 중3 진도를 병행해서라도 고등 수학을 시작을 해야 합니다.

고등 수학은 중3 과정과 밀접한 관계를 갖고 있기 때문에 학습 등급이 낮은 학생이라고 하더라도 중3 과정과 병행하면서 고등 수학 진도 시작을 빠르게 해 주는 것이 무조건 유리합니다. 단, 두 진도 병행 시 학습 시간이 부족한 경우라면 다른 과목 시간을 줄여서라도 수학을 하는 것을 추천합니다.

이유는 대한민국 입시에서 수학은 절대 과목이며, 고1 수학은 문이과 예체능 상관없이 반드시 모두 학습해야 하는 공통과목이기 때문입니다.`,
          keyPoint: '중3은 학습 등급 상관없이 고등 수학 빠르게 시작' },
        // 중1~중2, 중1-1 이상, 1~2등급 (576)
        { gradeMin: 7, gradeMax: 8, progressMin: PROGRESS['중1-1'], progressMax: null, levelMin: 1, levelMax: 2,
          recommendation: '선행', subtitle: '영재교육 함정 주의',
          content: `초, 중등 수학 등급이 1~2등급인 학생들은 자칫 잘못하면 영재 교육 함정에 빠지기 쉽습니다.

영재 교육 함정이란? 경시나 사고력 같은 영재 수학이 정규 교과 수학보다 상위 개념이라고 생각해서 영재 수학을 하면 정규 교과 수학은 당연히 잘하게 될거라고 착각하는 것을 의미합니다. 영재 수학과 정규 교과 수학은 서로 간의 위계가 존재하는 것이 아니라 다른 영역의 수학입니다. 따라서, 절대 한 영역을 잘한다고 해서 다른 한 영역도 잘해지는 경우는 없습니다.

한가지 확실히 알고 계셔야 할 사실은 영재 수학이나 정규 교과 수학 모두 대입에서 유의미한 1~2등급의 상위 등급을 확보하기 위해서는 두가지 수학을 동시에 병행할 수 없다는 것입니다. 상위권을 위한 최고의 학습 전략은 영재 수학과 고등 수학 중 한가지를 조기에 선택하여 남들보다 물리적인 학습 시간을 유리하게 편성하는 것입니다.`,
          keyPoint: '영재 수학과 정규 교과 수학 중 하나 선택' },
        // 중1~중2, 중1-1 이상, 3~4등급 (301)
        { gradeMin: 7, gradeMax: 8, progressMin: PROGRESS['중1-1'], progressMax: null, levelMin: 3, levelMax: 4,
          recommendation: '심화', subtitle: '고등 등급 올릴 가능성',
          content: `초, 중등 수학 등급이 3~4등급인 중1,2 학생들은 아직 고등 진학 전까지 충분히 고등 수학 등급을 올릴 수 있는 가능성이 있습니다. 단, 고등 수학의 경우 고1 내신시험 하나를 2등급 이내로 만들기 위해서는 최소 4~9개월의 시간이 걸리기 때문에 물리적 시간도 많이 소요되고, 학습 완성 시간의 편차도 크게 됩니다.

따라서, 본인이 고1 내신 시험 하나를 원하는 등급까지 완성하는데 얼마의 시간이 소요되는지 고등학교 진학 전에 확인해 보는 것은 굉장히 중요합니다. 이 부분 확인없이 학습 전략을 짜는 것은 굉장히 위험한 발상입니다.`,
          keyPoint: '고등 진학 전 충분히 등급 올릴 가능성 있음' },
        // 중1~중2, 중1-1 이상, 5등급 이하 (599)
        { gradeMin: 7, gradeMax: 8, progressMin: PROGRESS['중1-1'], progressMax: null, levelMin: 5, levelMax: 9,
          recommendation: '심화', subtitle: '전략적 과목 선택',
          content: `중학생 아이들이 수학에서 원하는 등급을 받지 못하는 경우라면, 현 입시 제도에서 우리 아이의 경쟁력을 생각해 보아야 합니다. 입시에서 경쟁력이 있다는 것은 변별력을 만들어 낼 수 있는 '학업적 우수성'이 있다는 것입니다.

아이가 '학업적 우수성'을 보이는 과목이 수학이 아니라면 중3 여름 방학 시기 이전까지는 수학 학습량을 줄이는 것을 추천합니다. 중학생들이 가장 많은 시간을 투자하는 과목이 수학입니다. 하지만 투자한 시간 대비 성적 가성비가 가장 떨어지는 것도 수학입니다.

그렇다고 수학을 포기하라는 뜻이 아닙니다. 중1~2 시기에 수학 성적이 안나오는 경우, 수학 학습 시간 비중을 줄이고, 경쟁력이 있는 다른 과목 시간 비중을 늘려야 다른 과목의 경쟁력을 잃지 않을 수 있습니다. 그리고 수학을 중3 여름이후 시기에 집중적으로 몰입해야 합니다.`,
          keyPoint: '수학 외 경쟁력 있는 과목에 집중' },
        // 초4이하, 전진도, 1등급 (587)
        { gradeMin: 1, gradeMax: 4, progressMin: null, progressMax: null, levelMin: 1, levelMax: 1,
          recommendation: '선행', subtitle: '영재 교육 전략',
          content: `'영재 교육'을 하고 싶다면 일단 우리 아이의 학년부터 확인하세요. 우리 아이 학년이 초5이하의 학생이라면 초6이 되기 전까지 원하는 '영재 교육'을 마음껏 하셔도 됩니다. 단, '영재 교육'을 하실려면 반드시 목표 시험을 설정하셔야 합니다. 그 목표 시험은 꼭 지필평가가 아니어도 됩니다. 예를 들면 수학, 과학 경시 준비를 하셔도 되고, 탐구 토론 대회 준비를 하셔도 됩니다. 단, 목표 시험을 위해 충분히 학습할 수 있는 물리적 시간을 확보해 주셔야 합니다.

초6 이후 시기부터는 '영재학교 합격선'이라고 판단되는 학생들을 제외하고, '영재 교육'보다 '정규 교육'에 몰입하는 것을 추천드립니다. 특목고 입시 특성상 지필평가는 영재학교만 진행되기 때문에 영재학교 진학이 확실시 되는 학생들을 제외하고는 나머지 학생은 '정규 교육'과정 지필평가를 준비하는 것이 확률적으로 유리합니다.

중등 수학은 성취도가 80%정도만 나와도 다음 진도 진행에 문제가 없지만 고등 수학은 반드시 목표 등급을 만든 후 다음 과정 진도를 진행해야 합니다.`,
          keyPoint: '초5 이하는 영재교육 가능, 초6 이후는 정규 교육 몰입 권장' },
        // 초4이하, 전진도, 2등급 (592)
        { gradeMin: 1, gradeMax: 4, progressMin: null, progressMax: null, levelMin: 2, levelMax: 2,
          recommendation: '심화', subtitle: '초중 과정 성적 주의',
          content: `대부분은 초,중 과정을 학습할 때 성적이 좋으면 고등 과정도 비슷한 수준으로 성적이 나올 것이라고 판단합니다. 하지만 절대 그렇지 않습니다.

고등 과정의 상위 등급에서 필요로 하는 학습 역량은 그동안 필요로 해왔던 학습 역량과는 차원이 다른 단계입니다. 따라서 초, 중등 과정 성적 중상위권 학생들은 고등 과정에 대한 철저한 대비와 전략을 수립해야 합니다.

중등 2학년 이하 시기에는 심화 학습이 가능한 과목의 학습 비중을 늘려야 합니다. 그리고 이런 과목은 고1 과정까지 완벽하게 학습하여야 하며, 고1 기준 내신 또는 수능 등급을 만들어야 합니다. 본인 목표 등급이 있다면 그 등급보다 적어도 한 등급 아래까지는 안정적으로 등급이 나올 수 있게 학습역량을 올려야 합니다.`,
          keyPoint: '초중 성적 좋아도 고등 과정은 다름' },
        // 초5~6, 초6-2이하, 1~2등급 (596)
        { gradeMin: 5, gradeMax: 6, progressMin: null, progressMax: PROGRESS['초6-2'], levelMin: 1, levelMax: 2,
          recommendation: '심화', subtitle: '상위권 전략 필요',
          content: `현 입시 제도는 전국 단위 11%이내의 성적을 우대합니다. 더 엄밀히 말하면 '고등 교육 과정' 전국단위 11% 이내의 학생을 우대합니다. 대부분은 초,중 과정을 학습할 때 성적이 좋으면 고등 과정도 비슷한 수준으로 성적이 나올 것이라고 판단합니다. 하지만 절대 그렇지 않습니다.

상위권 아이들의 딜레마는 조금만 방심하면 중위권으로 금방 떨어지지만, 아무리 열심히 해도 최상위권으로는 잘 올라가지지 않는다는 것입니다. 따라서 상위권 아이들은 최상위권을 잡을 수 있는 학습 전략이 필요합니다.

'학습 시간 전략'은 성취도가 낮은 과목을 줄이고, 잘하는 과목 학습량을 늘리는 것입니다. 모든 과목이 입시에 활용되는 것이 아닙니다. 초, 중등 시기에 경쟁력이 있는 과목을 하나라도 만들어야 합니다. '학습 컨텐츠 전략'은 '고등 실전 기출 학습'을 진행하는 것입니다.`,
          keyPoint: '상위권 아이들은 최상위권 전략 필요' },
        // 초5~6, 초6-2이하, 3~4등급 (568)
        { gradeMin: 5, gradeMax: 6, progressMin: null, progressMax: PROGRESS['초6-2'], levelMin: 3, levelMax: 4,
          recommendation: '심화', subtitle: '중위권 학습 전략',
          content: `현 입시제도에서 지필 평가를 직접적으로 입시에 활용하는 과정은 고등 교육 과정부터입니다. 고등 교육 과정과 초,중등 교육 과정의 연계성을 확인해 보면 기본 개념 학습의 연계성은 높지만 오히려 심화 과정에 대한 연계성은 떨어진다는 것을 알 수 있습니다.

'중위권 아이들의 학습 전략'은 초, 중등 교육 과정 완성도를 100%가 아닌 80%만 만드는 것입니다. 가장 학습 효율이 좋고, 고등 연계율이 높은 개념 학습은 충실히 하고, 심화 과정은 하지 않는 것을 추천합니다. 그럼 상대적으로 선행 진도가 빨라지기 때문에 고등 학습을 할 수 있는 물리적 시간이 많아집니다.

이렇게 만든 시간을 고등 교육 과정에 집중 투자하는 것이 현 입시제도에서 유리합니다. 기본만 명확히 되어있어도 고등 과정 진행이 가능하며, 직접적인 고등 과정 학습을 많이 하는 것이 무조건 고등 등급에 유리합니다.`,
          keyPoint: '현행 완성도 80%로 선행 시간 확보' },
        // 초5~6, 초6-2이하, 5등급 이하 (514)
        { gradeMin: 5, gradeMax: 6, progressMin: null, progressMax: PROGRESS['초6-2'], levelMin: 5, levelMax: 9,
          recommendation: '심화', subtitle: '최소한의 방어',
          content: `초등 수학 등급이 잘 나오지 않는 경우는 크게 2가지가 있습니다. 아이가 학습적으로 불성실한 경우 또는 수학적 학습 역량이 부족한 경우입니다. 두가지 경우 모두 현 입시제도에서는 '최소한의 방어'가 필요합니다.

'최소한의 방어'란? 후행 학습을 하더라도 초등 5~6학년 수학 과정은 반드시 성취도 80% 이상을 만드는 것을 의미합니다. 이 시기에 배워야 할 수학 기본 역량을 체득하지 못하면 다음 과정은 더 이상 정상적인 속도로 따라갈 수 없게 됩니다. 이런 경우 대부분 수포자의 길을 걷게 됩니다.

따라서 이 시기에는 다른 과목의 학습량을 줄여서라도 반드시 성취도 80%이상을 만들어야 합니다. 중1이 될때까지 초등 수학 성취도가 나오지 않는 경우에는 수학을 암기해서 해야 하는 상태라고 판단하셔야 합니다.`,
          keyPoint: '초5~6 수학 성취도 80% 이상 필수' },
        // 초5~6, 중1-1 이상, 7등급 이하 (584)
        { gradeMin: 5, gradeMax: 6, progressMin: PROGRESS['중1-1'], progressMax: null, levelMin: 7, levelMax: 9,
          recommendation: '심화', subtitle: '초5~6 과정 점검',
          content: `중등 선행 학습을 하고 있지만 성취도가 잘나오지 않는 경우, 초5~6 과정의 학습 성취도를 점검해 보아야 합니다. 만약 초5~6과정 학습 성취도가 80%이상 나오지 않는 경우라면, 초5~6과정 학습부터 다시 학습이 진행되어야 합니다.

초5~6과정 학습 성취도는 잘 나오지만, 중등과정 학습 성취도만 떨어지는 경우에는 물리적인 학습량이 절대적으로 부족한 경우입니다. 이런 경우 타 과목 학습 시간을 줄여서라도 수학 학습 시간을 늘려야 합니다. 그리고 스스로 학습 완성도를 높일 수 있는 상황이 아니기 때문에 반드시 학습 완성도 확인을 하는 선생님이 필요합니다.

여기서 말하는 학습 완성도는 '맞은 문제'에 대한 확인입니다. 2주전 진도에서 맞은 문제를 무작위로 질문하였을 때, 정확하게 설명하지 못하는 유형이나 개념은 반드시 다시 학습을 시켜야 합니다.`,
          keyPoint: '중등 선행 성취도 낮으면 초5~6 과정 점검' },
        // 기본값: 전체
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 9,
          recommendation: '심화', subtitle: '현행 완성 우선',
          content: `현재 학습 내용의 완성도를 높이는 것이 선행보다 중요합니다.

현 입시제도에서 지필 평가를 직접적으로 입시에 활용하는 과정은 고등 교육 과정부터입니다. 고등 교육 과정과 초,중등 교육 과정의 연계성을 확인해 보면 기본 개념 학습의 연계성은 높지만 오히려 심화 과정에 대한 연계성은 떨어진다는 것을 알 수 있습니다.

'중위권 아이들의 학습 전략'은 초, 중등 교육 과정 완성도를 100%가 아닌 80%만 만드는 것입니다. 가장 학습 효율이 좋고, 고등 연계율이 높은 개념 학습은 충실히 하고, 심화 과정은 하지 않는 것을 추천합니다. 그럼 상대적으로 선행 진도가 빨라지기 때문에 고등 학습을 할 수 있는 물리적 시간이 많아집니다.`,
          keyPoint: '현행 완성도 우선, 기본기 확립 후 선행' }
      ]
    },
    csatVsSchool: {
      title: '내신 VS 수능',
      leftLabel: '내신',
      rightLabel: '수능',
      icon: '◇',
      strategies: [
        // 전학년, 전진도, 1등급 (524)
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 1,
          recommendation: '내신+수능', subtitle: '실전 기출 등급 확인',
          content: `최상위 등급이 나오는 학생들의 경우, '고1 내신 실전 기출' 등급 확인은 필수입니다. 고1 내신은 현 입시제도에서 최초의 상대평가 시험이기 때문에 진학하고자 하는 고등학교 1학년 4번의 내신 시험이 안정적으로 1등급이 나오는 지 확인을 해 보아야 합니다.

목표 등급이 안정적으로 잘 나온다면 원하는 다른 학습 역량을 키워도 되지만, 목표 등급이 잘 나오지 않는다면 내신 등급을 만드는 것을 최우선으로 학습해야 합니다. 단, 주의할 점은 일반적으로 교육 특구인 경우 수능보다 내신 등급 만들기가 더 어려워 타 지역 내신 등급 확인이 필요없지만, 교육 특구가 아닌 지역은 본인 지역 내신 등급이 안정적으로 나오더라도 교육 특구에 위치한 주요 고등학교 내신 기출 등급 확인이 필요합니다.

고1 내신 등급이 안정적으로 나오는 경우, 고2 학습 진도를 진행해도 되며 고2 진도 과정부터는 완성도 확인을 수능 모의고사 등급으로 하는 것이 좋습니다. 현 입시제도에서 고1내신과 수능만 9등급 상대평가로 대입에 직접 반영되기 때문입니다.`,
          keyPoint: '고1 내신 실전 기출 등급 확인 필수' },
        // 전학년, 전진도, 2등급 (594)
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 2, levelMax: 2,
          recommendation: '내신', subtitle: '내신 경쟁력 강화',
          content: `일단 내신의 경우 상위 11%안에 들어가는 학생들은 내신 경쟁력이 대입에 도움이 많이 됩니다. 따라서, 내신을 잘 받을 수 있다고 판단되는 학생들은 고등학교 진학 전에 내신 경쟁력을 최상으로 끌어 올려 주는 것이 좋습니다.

내신 2등급 안쪽에서는 한,두문제로 내신 1,2등급이 갈리기 때문에 정밀한 등급만들기 학습이 필요합니다. 보통 이런 등급을 만드는 노하우는 수년간 해당 지역에서 고등 내신등급을 만들어 온 고등부 선생님들이 가지고 있기 때문에 초, 중등 시기라고 하더라도 고등부 학원을 지원해서 학습하는 것이 유리합니다.

단, 아직 진도 자체가 고등 선행이 안되어 있다면, 중등 과정 진도를 성취도 80% 수준에서 빠르게 완성하고, 고등 과정으로 진입하는 것이 좋습니다. 중등 심화까지 하지 않더라도 고등 과정을 진행하는데 지장이 없기 때문에 기본 진도 과정 성취도가 80% 수준까지만 나온다면 문제가 되지 않습니다. 하지만 고등 과정부터는 철저하게 원하는 목표등급이 나오지 않으면 다음 과정으로 진행해서는 안됩니다.

고1 내신 등급이 안정적으로 나오는 경우, 고2 학습 진도를 진행하고, 완성도 확인은 수능 모의고사로 하는 것이 좋습니다.`,
          keyPoint: '상위 11% 내신은 대입에 큰 도움' },
        // 전학년, 전진도, 3~4등급 (550)
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 3, levelMax: 4,
          recommendation: '균형', subtitle: '시기별 전략적 선택',
          content: `'중위권 아이들' 입장에서는 고등 내신과 수능 두가지 시험을 모두 상위 등급 받기는 굉장히 어렵습니다. 그렇다고 둘 중 하나를 선택하라는 이야기가 아닙니다. 시기별 전략적 선택을 할 수 있는 것이 중요합니다.

고1 공통과목은 수능에서 기본 지식으로 활용되며, 내신에서는 유일한 상대평가 과목으로 활용됩니다. 따라서 초, 중등 시기부터 고1 때까지 '공통과목 내신 등급'을 만들기 위해서 최선을 다하는 것이 중요합니다. 물론 고2 이상의 내용을 선행할 수 있는 여력이 있으면 좋겠지만 '중위권 아이들' 입장에서는 그런 여력은 없을 것입니다.

수능에 올인하는 것은 고1 내신 등급 성적을 보고, 결정해도 늦지 않습니다. 단, 수능 모든 과목을 상위 등급 만들기 위해 학습하는 것은 위험합니다. 고1 내신 등급 결과를 바탕으로 목표 대학군을 좁혀야 합니다. 대학이 모든 수능 과목 성적을 요구하지 않기 때문에 본인 등급이 잘 나오는 과목 성적을 요구하는 대학 전형을 확인하고, 전략적으로 그 대학에서 원하는 수능 과목을 상위 등급으로 만드는 것이 중요합니다.`,
          keyPoint: '고1 공통과목 내신 등급 만들기 최우선' },
        // 전학년, 전진도, 5등급 이하 (552)
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 5, levelMax: 9,
          recommendation: '수능', subtitle: '시험 종류 축소',
          content: `평소 학습 습관이 좋지 않아서 내신을 잘 받기 어려운 학생이라고 판단된다면, 지속적인 평가 형태보다 일회성 평가 형태가 더 유리합니다. 그리고 평가 받아야 할 시험의 종류를 줄이는 것도 중요합니다.

이를 좀 더 구체적으로 이야기하면, 고등 내신은 3년동안 과목당 적어도 18번(지필12+수행6)의 평가가 이루어지고, 주요과목 5개 모두 꾸준히 관리되어야 합니다. 단순 합만 보더라도 3년동안 약 90개의 평가를 준비해야 합니다. 중하위권 학생들 입장에서는 대비가 불가능한 구조입니다.

따라서 중하위권 학생들은 일회성 수능이라는 시험이 더 유리할 수 밖에 없습니다. 중,하위권 학생들은 사실 목표 등급이 1~2등급이 될 수 없습니다. 대부분 5~7등급을 형성하는 중하위권 학생들 입장에서 한 두 과목이라도 3~4등급을 안정적으로 받을 수 있다면 입시에서 절대적으로 유리한 입장이 됩니다.

따라서 등급이 낮은 학생일수록 목표 대학의 범위를 좁히고, 전략적 입시 전형을 선택해야 합니다. 초,중등 시기부터 이를 꾸준히 준비한다면 3~4등급까지는 충분히 받을 수 있습니다.`,
          keyPoint: '내신보다 수능 집중이 유리' }
      ]
    },
    artsVsScience: {
      title: '문과 VS 이과',
      leftLabel: '문과',
      rightLabel: '이과',
      icon: '◆',
      strategies: [
        // 중2~3, 고1-1이상, 3등급이상 (284)
        { gradeMin: 8, gradeMax: 9, progressMin: PROGRESS['고1-1'], progressMax: null, levelMin: 1, levelMax: 3,
          recommendation: '이과', subtitle: '이과 선택 유리',
          content: `'문,이과 통합'이후 문,이과의 선택 기준은 더 이상 적성에 의해 결정되지 않습니다. '수능 선택 과목' 학습이 어디까지 가능할 것인지 판단하여 결정해야 합니다. 이유는 현 입시제도에서 문과를 선택할 학생이라도 '이과 아이들이 주로 선택하는 과목'을 학습하여 등급이 나오면 압도적으로 유리하기 때문입니다.

따라서 이과를 희망하는 학생들도 당연히 이과 관련 선택 과목을 해야 하지만 문과를 지원할 학생들도 학습 역량만 된다면 이과 관련 선택 과목을 선택하여 교차 지원을 하는 것이 좋습니다.`,
          keyPoint: '문이과 통합 후 적성보다 학습 역량 기준' },
        // 중2~3, 고1-1이상, 4~5등급 (404)
        { gradeMin: 8, gradeMax: 9, progressMin: PROGRESS['고1-1'], progressMax: null, levelMin: 4, levelMax: 5,
          recommendation: '탐색', subtitle: '학습 역량 측정',
          content: `현 입시 제도에서 문,이과 구분은 큰 의미를 갖지 않습니다. 문과를 희망하는 학생이더라도 '이과 아이들이 주로 선택하는 과목'을 학습하여 등급이 나오면 압도적으로 대입에서 유리하기 때문입니다. 본인의 학습 역량이 '수능 선택 과목'에서 미적, 기하 또는 과학2 과목까지 선택하여 학습이 가능하다면 대학 진학의 폭이 넓어지고, 합격 가능성이 올라갑니다.

단, 여기서 주의해야 할 부분은 나의 학습 역량을 측정하는 방법입니다. 가장 좋은 방법은 진학이 예상되는 고등 학교 내신 실전 기출이나 전국단위 모의고사 기준으로 수학, 과학 등급을 확인하는 것입니다. 본인의 현재 등급과 목표 등급과의 간극을 확인하고, 물리적 시간을 역산해 보아야 합니다. 이런 판단이 어렵다면 전문 컨설팅을 받는 것을 추천드립니다.`,
          keyPoint: '미적/기하/과학2 학습 가능 여부가 핵심' },
        // 중1이하, 초1-1~초6-2, 4~5등급 (549)
        { gradeMin: 1, gradeMax: 7, progressMin: null, progressMax: PROGRESS['초6-2'], levelMin: 4, levelMax: 5,
          recommendation: '문과', subtitle: '타 과목 경쟁력 확보',
          content: `수학이나 과학에 흥미가 없거나 성취도가 나오지 않는 학생이라면, 중2 이하 시기에는 수학, 과학 사교육에 시간 투자를 많이 하지 않는 것을 추천합니다.

남들이 하기 때문에 적당하게 따라서 수학, 과학 사교육에 시간을 투자한다면 오히려 다른 과목의 경쟁력을 잃을 수 있습니다. 현 입시제도는 문,이과가 통합되었기 때문에 본인이 문과적 성향인지 이과적 성향인지 고민할 필요는 없습니다. 단, 입시가 '수능 선택 과목'에서 미적, 기하 또는 과학2 과목까지 선택 가능한 학생에게 압도적으로 유리하기 때문에 본인이 미적, 기하 또는 과학2 과목을 선택할 수 없다면 반드시 타 과목 경쟁력을 극대화 시켜야 합니다.

따라서 중2 이하 시기에는 수학, 과학을 제외한 타 과목 경쟁력에 시간을 투자하고, 중3 시기에 수학, 과학 학습에 시간을 집중 투자하는 것이 현명한 선택입니다. 그리고 고등학교 진학 후에는 내신 등급에 맞게 과목별 학습 시간 비율을 결정해야 합니다.`,
          keyPoint: '수학/과학 성취도 낮으면 타 과목 경쟁력 극대화' },
        // 기본값
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 9,
          recommendation: '탐색', subtitle: '학습 역량 측정',
          content: `현 입시 제도에서 문,이과 구분은 큰 의미를 갖지 않습니다. 문과를 희망하는 학생이더라도 '이과 아이들이 주로 선택하는 과목'을 학습하여 등급이 나오면 압도적으로 대입에서 유리하기 때문입니다.

본인의 학습 역량이 '수능 선택 과목'에서 미적, 기하 또는 과학2 과목까지 선택하여 학습이 가능하다면 대학 진학의 폭이 넓어지고, 합격 가능성이 올라갑니다. 가장 좋은 방법은 진학이 예상되는 고등 학교 내신 실전 기출이나 전국단위 모의고사 기준으로 수학, 과학 등급을 확인하는 것입니다.`,
          keyPoint: '미적/기하/과학2 학습 가능 여부가 핵심' }
      ]
    },
    academyVsTutor: {
      title: '학원 VS 과외',
      leftLabel: '학원',
      rightLabel: '과외',
      icon: '◇',
      strategies: [
        // 초5이상, 전진도, 1~2등급 (391)
        { gradeMin: 5, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 2,
          recommendation: '과외', subtitle: '고등 등급 만들기',
          content: `과외 형태의 맞춤형 교수법은 목적과 기간이 명확한 상태에서 해야 합니다. 따라서 과외는 부족한 영역이 명확하여 Make-up을 해야 하거나 최상위 등급을 만들기 위한 특화된 컨텐츠를 해야 할 때 활용해야 합니다. 단순히 학생이 학원에 적응을 잘 못해 개별 학습을 하기 위한 과외는 절대 선택해서는 안됩니다.

상위 등급 학생이라면 초, 중등 시기에 '고등 등급 만들기' 과정을 진행해야 합니다. 진짜 상위권은 '고등 내신 기출 등급'이 나와야 합니다. 하지만 이런 등급 만들기 수업은 일반적인 학원에서 정규과정으로 개설되지 않기 때문에 이런 경우 고등부 선생님을 섭외하여 과외를 하는 것이 좋습니다. 과외를 진행할 때에도 과외 시작전 목표 등급과 기간을 명확히 협의하여 진행하셔야 합니다.`,
          keyPoint: '과외는 목적/기간 명확할 때만' },
        // 초4이하, 전진도, 7등급이하 (474)
        { gradeMin: 1, gradeMax: 4, progressMin: null, progressMax: null, levelMin: 7, levelMax: 9,
          recommendation: '과외', subtitle: 'Make-up 학습',
          content: `성취도가 잘 나오지 않는 경우 대부분 과외를 선택하게 됩니다. 이 때 과외를 선택하는 판단이 잘못된 것은 아니지만 한가지 주의해야 할 부분이 있습니다. 과외를 장기적으로 계속 할 수 없다는 것입니다.

과외는 한시적으로 정규과정을 따라가기 위해 진행되어야 하며, 부족한 영역을 명확히 확인하여 Make-up을 하는 용도로 활용해야 합니다. 과외가 가지고 있는 장점들이 오히려 아이의 학습 습관에 독이 될 수 있습니다. 학교나 학원에서 진행되는 정규 학습 과정을 따라가지 못한 상태에서 과외로 부족 부분을 계속 채워 나간다면, 학습 효율은 계속 떨어지게 되고, 학생은 수동적으로 변하게 됩니다.

따라서 과외를 활용하여 부족한 부분을 Make-up 할 때는 목적과 기간을 명확하게 정하고, 평소 학습 루틴을 지키는 선에서 진행하는 것이 좋습니다.`,
          keyPoint: '과외는 한시적 Make-up 용도' },
        // 초4이하, 전진도, 5~6등급 (593)
        { gradeMin: 1, gradeMax: 4, progressMin: null, progressMax: null, levelMin: 5, levelMax: 6,
          recommendation: '학원', subtitle: '학원과 과외 선택 기준',
          content: `저학년이면서 성적이 중위권인 학생들은 항상 학원과 과외 사이에서 고민하게 됩니다. 하지만 앞으로는 이 고민은 그만 하셔도 됩니다. 학원도 과외도 모두 틀린 선택이 아니기 때문입니다. 단, 학원과 과외의 목적만 명확히 하고, 시기에 맞게 선택해 주시면 됩니다.

학원과 과외 모두 큰 틀에서는 학교에서 학습할 수 없거나 부족하다고 생각되는 교육 과정을 이수하는 것을 목적으로 합니다. 하지만 더 세부적인 목적을 확인해 보면 둘의 성격은 완전히 다릅니다. 학원은 학교와 비슷한 학습 환경을 가지고 있으며, 일대 다수의 학습이 진행됩니다. 따라서 학교 교육 환경에서 학습을 잘하고 있으면서 선행이나 심화 학습 같이 학교에서 진행되지 않은 학습을 하기 위해 학원에 다니는 것을 목적으로 하는 학생에게 적합합니다.

하지만 학교 교육 환경에서 학습을 잘 따라가지 못하고 이를 보강하기 위해서 학원에 다니는 것은 부적합합니다. 이런 경우는 부족한 부분을 명확히 확인하고, 목적과 기간을 정해 과외를 진행하는 것이 적합합니다.`,
          keyPoint: '학교 수업 적응도에 따라 학원/과외 선택' },
        // 초5이상, 전진도, 5~6등급 (324)
        { gradeMin: 5, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 5, levelMax: 6,
          recommendation: '학원', subtitle: '학원 적응 추천',
          content: `성적이 상위권이 아닌 경우, 학원을 보내면 그나마 성적이 좀 나오고, 학원을 보내지 않으면 성적이 잘 나오지 않는 학생들이 대다수입니다. 그렇게 한,두 과목씩 학원에 의존하다 보면 어느 순간 주요 과목 학원을 모두 다니고 있습니다. 그렇다고 학원을 다니는 과목 성적이 계속 오르지도 않습니다.

원인은 굉장히 단순합니다. 아이가 주당 학습할 수 있는 물리적 시간은 정해져 있고, 각 과목마다 상위권이 되기 위한 학습 임계량이 존재하는데 상대적으로 아이의 주당 학습 시간이 학습 임계량에 미치지 못해서입니다.

따라서 이런 상황에서 우리가 취할 수 있는 학습 전략은 학습 과목수를 줄이고, 특정 과목 학습 시간을 늘리는 것입니다. 성적이 중위권 이상인 경우 과외보다는 학원에 적응시키는 것을 추천드립니다. 학원은 과외보다 학습 환경이 학교와 유사하기 때문에 '학원 학습 성취도'가 좋아지면, '학교 학습 성취도'도 무리 없이 올릴 수 있습니다.`,
          keyPoint: '중위권 이상은 학원 추천' },
        // 기본값
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 9,
          recommendation: '학원', subtitle: '학원 적응 추천',
          content: `성적이 중위권 이상인 경우 과외보다는 학원에 적응시키는 것을 추천드립니다. 학원은 과외보다 학습 환경이 학교와 유사하기 때문에 '학원 학습 성취도'가 좋아지면, '학교 학습 성취도'도 무리 없이 올릴 수 있습니다. 또한 학원은 장기적으로 지속 가능한 학습이고, 과정마다 정확한 레벨과 기간이 정해져 있기 때문에 학습 효율이 더 좋을 수 밖에 없습니다.

단, 일대 다수의 수업에 적응을 못하여 학원을 꺼리는 경우라면 한시적으로 과외를 병행하는 것이 좋습니다. 과외는 학원에서 수업 결손이 생기지 않도록 학습 습관을 교정하는 것에 목적을 두고 진행되어야 합니다.`,
          keyPoint: '학원 적응 후 과외는 보충용' }
      ]
    },
    regularVsIntensive: {
      title: '일반 VS 몰입',
      leftLabel: '일반',
      rightLabel: '몰입',
      icon: '◆',
      strategies: [
        // 중1~2, 전진도, 1~2등급 (576)
        { gradeMin: 7, gradeMax: 8, progressMin: null, progressMax: null, levelMin: 1, levelMax: 2,
          recommendation: '몰입', subtitle: '등급 차별화 전략',
          content: `중1~2 시기 정도가 되면, 과목별 학생의 학습 역량을 파악할 수 있게 됩니다. 어떤 과목은 학습 역량이 계속 올라가 상위 등급이 되는 반면 또 다른 과목은 어느 순간부터 학습 역량이 올라가지 않고, 암기나 반복 학습에 의존해 단기 기억 상태로 유지되는 경우가 있습니다. 특히 상위권 아이들은 심화 학습 단계에서 이해가 아닌 암기로 꾸역꾸역 버텨내고 있는 경우가 많습니다. 이럴 때 중3 여름 방학 이전까지는 과감한 '몰입 학습'을 통해 등급 차별화를 만드는 것이 좋습니다.

예를 들면 영어는 잘하지만 수학 심화 단계를 힘들어하는 아이가 있다면, 대부분은 수학 사교육 학습 비중을 더 늘리려 할 것입니다. 하지만 중1~2 시기에는 반대로 하는 것이 더 좋습니다. 수학 학습 비중을 줄이고, 잘하는 영어 학습 비중을 늘리는 것입니다. 영어를 잘한다고 적당히 하지 않고, 입시 평가 요소인 고등 내신과 수능 영어 등급까지 안정적으로 1등급을 만들어 놓는 것입니다. 이를 통해 중3~고1 시기에 영어 학습 시간을 최소로 하고, 상대적으로 취약한 수학 학습 시간을 극대화 하는 것이 훨씬 더 좋은 결과를 얻을 수 있습니다.`,
          keyPoint: '잘하는 과목에 몰입하여 1등급 완성' },
        // 중3, 전진도, 6등급 이하 (515)
        { gradeMin: 9, gradeMax: 9, progressMin: null, progressMax: null, levelMin: 6, levelMax: 9,
          recommendation: '몰입', subtitle: '1~2과목 몰입 필수',
          content: `중3인 우리 아이가 주요 과목 등급이 안나온다면, 이 시기에는 반드시 '몰입 학습'을 해야 합니다.

더 구체적으로 말씀을 드리면 중3 11월 기준 이전과 이후 학습 방법은 완전히 달라야 합니다. 중3 11월 이전 시기는 1~2과목 '몰입 학습'을, 중3 11월 이후 시기는 '고1 전과목 내신대비'를 해야 합니다.

중3 11월이후 시기부터는 학습 전략을 세울 수가 없습니다. 특히 학습 등급이 하위권인 학생들은 더더욱 전과목 내신대비를 할 수 밖에 없어서 특별한 전략이라는 것은 만들 수 없습니다. 고1 내신 등급을 받고 나서 등급을 보고, 다시 학습 전략을 짜야 합니다. 하지만 중3 11월 시기 이전이라면, 남은 기간에 따라 1~2 과목에 몰입하는 것이 좋습니다. 몰입해야 하는 과목은 가장 등급이 잘 나오거나 학습하기 가장 편한 과목을 선택하는 것이 좋습니다.`,
          keyPoint: '중3 11월 전까지 1~2과목 몰입 필수' },
        // 중1~2, 전진도, 3~4등급 (537)
        { gradeMin: 7, gradeMax: 8, progressMin: null, progressMax: null, levelMin: 3, levelMax: 4,
          recommendation: '몰입', subtitle: '상위권 도약 기회',
          content: `중1~2 중상위권 아이들은 '고등학교 진학 시 성적이 중하위권으로 떨어지지 않을까?' 라는 걱정을 많이 합니다. 그러면서 특별한 노력을 하기 어려운 것이 '기존에 진행했던 학습 루틴'이 나름 시행 착오를 거쳐 완성한 것이기에 쉽게 그 학습 루틴을 바꿀 수도 없게 됩니다.

하지만 당장 이 생각을 바꾸어야 합니다. 중1~2 시기가 상위권 도약을 할 수 있는 유일한 시기이기 때문입니다. 그동안 해왔던 남들과 비슷한 학습으로는 절대 상위권 도약을 할 수 없습니다. 현재까지 사교육을 해왔던 과목들 중에서 가장 등급이 잘 나오는 과목을 선택하여 '몰입 학습'을 진행하세요. 중1~2 시기는 반드시 잘하는 과목을 더 잘하게 만들어야 하는 시기입니다.

단순히 빠른 선행만으로 만족하지 마시고, 실제 대입에 반영되는 고등 내신과 수능 등급을 만들어 보세요. 중3 여름 방학 이전까지 본인이 잘하는 과목의 등급을 2~3등급이 아닌 1등급까지 안정적으로 끌어 올려 보세요. 그러기 위해서 다른 과목 학습 시간을 줄이거나 빼야 한다면 과감히 실행하세요.`,
          keyPoint: '중1~2가 상위권 도약 유일한 시기' },
        // 초6이하, 전진도, 3등급이상 (487)
        { gradeMin: 1, gradeMax: 6, progressMin: null, progressMax: null, levelMin: 1, levelMax: 3,
          recommendation: '일반', subtitle: '목표 시험 설정',
          content: `초등 학생이면서 성적이 어느 정도 나오면 대부분 동네에서 공부 잘하는 아이들이 하고 있는 모든 사교육을 다 시키게 됩니다. 그런데 아이러니하게도 이 판단이 아이의 경쟁력을 잃게 합니다.

학습은 종류가 많아지면 절대 모든 학습을 다 잘 해낼 수가 없습니다. 항상 사교육을 선택하실 때에는 학습 목표가 필요합니다. 그 목표는 시험이나 대회를 기준으로 설정하시는 것이 좋습니다. 이왕이면 그 시험이나 대회가 입시에 도움이 되는 것이면 더 좋습니다.

아이의 학원 시간표를 짤 때는 동네의 유명학원 시간을 먼저 픽스해 두고 남는 시간을 찾아서는 안됩니다. 아이가 현 시점에서 목표로하는 대회나 시험을 최대한 열심히 준비할 수 있는 학원이나 과외를 우선 순위로 하여 시간표를 먼저 픽스하고, 여유가 있을 때 다른 사교육 시간을 넣어야 합니다.`,
          keyPoint: '모든 사교육보다 목표 시험 설정 후 집중' },
        // 중3, 전진도, 1~2등급 (581)
        { gradeMin: 9, gradeMax: 9, progressMin: null, progressMax: null, levelMin: 1, levelMax: 2,
          recommendation: '몰입', subtitle: '등급 차별화',
          content: `중3 시기 정도가 되면, 과목별 학생의 학습 역량을 파악할 수 있게 됩니다. 어떤 과목은 학습 역량이 계속 올라가 상위 등급이 되는 반면 또 다른 과목은 어느 순간부터 학습 역량이 올라가지 않고, 암기나 반복 학습에 의존해 단기 기억 상태로 유지되는 경우가 있습니다. 특히 상위권 아이들은 심화 학습 단계에서 이해가 아닌 암기로 꾸역꾸역 버텨내고 있는 경우가 많습니다. 이럴 때 중3 11월 이전까지는 과감한 '몰입 학습'을 통해 등급 차별화를 만드는 것이 좋습니다.

예를 들면 영어는 잘하지만 수학 심화 단계를 힘들어하는 아이가 있다면, 대부분은 수학 사교육 학습 비중을 더 늘리려 할 것입니다. 하지만 중3 11월 이전 시기에는 반대로 하는 것이 더 좋습니다. 수학 학습 비중을 줄이고, 잘하는 영어 학습 비중을 늘리는 것입니다. 영어를 잘한다고 적당히 하지 않고, 입시 평가 요소인 고등 내신과 수능 영어 등급까지 안정적으로 1등급을 만들어 놓는 것입니다.`,
          keyPoint: '중3 11월 이전까지 등급 차별화' },
        // 중1~2, 전진도, 5~6등급 (587)
        { gradeMin: 7, gradeMax: 8, progressMin: null, progressMax: null, levelMin: 5, levelMax: 6,
          recommendation: '몰입', subtitle: '학습 과목수 축소',
          content: `아이의 학습 성취도가 잘 나오지 않는 경우라면 학습 과목수를 줄이는 것이 좋습니다.

아이가 주당 학습할 수 있는 물리적 시간은 정해져 있고, 각 과목마다 상위권이 되기 위한 학습 임계량이 존재합니다. 여러 과목을 동시에 진행하면 어느 과목도 임계량에 도달하지 못하는 상황이 발생합니다.

따라서 잘하는 과목이나 학습하기 편한 과목에 몰입하여 먼저 그 과목의 등급을 안정적으로 만들고, 그 다음 과목으로 넘어가는 전략이 필요합니다. 중하위권일수록 학습 과목수를 줄여야 합니다.`,
          keyPoint: '학습 과목수 줄이고 몰입' },
        // 기본값
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 9,
          recommendation: '일반', subtitle: '학습 목표 설정',
          content: `학습은 종류가 많아지면 절대 모든 학습을 다 잘 해낼 수가 없습니다. 항상 사교육을 선택하실 때에는 학습 목표가 필요합니다. 그 목표는 시험이나 대회를 기준으로 설정하시는 것이 좋습니다.

아이가 현 시점에서 목표로하는 대회나 시험을 최대한 열심히 준비할 수 있는 학습 환경을 우선으로 구성하고, 여유가 있을 때 다른 학습을 추가해야 합니다.`,
          keyPoint: '학습 목표 설정 후 집중' }
      ]
    },
    regularVsSpecial: {
      title: '일반 VS 특구',
      leftLabel: '일반',
      rightLabel: '특구',
      icon: '◇',
      strategies: [
        // 전학년, 전진도, 1~2등급 (325)
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 2,
          recommendation: '특구', subtitle: '교육 특구 유리',
          content: `성적이 상위권인 경우, 교육 특구에서 학습을 받는 것이 무조건 유리합니다. 단, 여기서 말하는 성적 상위권은 고등과정 성적 기준입니다. 초, 중등 학생들의 경우 본인이 진학하고자 하는 고등학교 '내신 기출 등급'을 확인하여야 합니다.

그리고 가능하다면 해당 고등학교의 최근 3년 동안 대입 실적을 확인하여, 본인이 목표로 하는 대학에 내신 몇 등급까지 진학시켰는지 확인해 보아야 합니다. 만약 고등 진도를 나가지 못해서 고등 '내신 기출 등급'을 확인할 수 없거나, 대입 실적 등을 확인하고 비교하는 것이 어렵다면, 전문 컨설턴트에게 컨설팅을 받는 것을 추천합니다.`,
          keyPoint: '상위권은 교육 특구 무조건 유리' },
        // 전학년, 전진도, 3~6등급 (385)
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 3, levelMax: 6,
          recommendation: '일반+특구', subtitle: '특구 사교육 + 타지역 내신',
          content: `성적이 상위권이 아닌 경우, 교육 특구의 사교육 환경을 이용할 수 있으면서 내신 등급을 좀 더 편하게 받을 수 있는 지역을 추천합니다. 예를들면 대치동으로 학원은 라이딩이 가능하지만 학교는 강남구가 아닌 타 지역으로 다니는 것입니다.

물론 교육 특구에서 멀어질수록 학교 아이들의 학력 수준이 떨어져 내신 받기가 더 편할 것입니다. 그렇다고 라이딩 시간이 너무 길어지면 길거리에 버려지는 시간이 너무 많아집니다. 이런 부분을 고려해 적정선을 찾으셔야 합니다.

물론 '이렇게까지 할 필요가 있을까?'라고 고민하신다면, 가족이 가장 살기 편한 지역을 선택하시는 것이 맞습니다. 지역 선택이 얼마나 입시의 유불리를 가져오는지는 누구도 정확한 수치로 판단할 수 없기 때문입니다.`,
          keyPoint: '특구 사교육 활용 + 타 지역 내신 전략' },
        // 기본값
        { gradeMin: 1, gradeMax: 12, progressMin: null, progressMax: null, levelMin: 1, levelMax: 9,
          recommendation: '일반', subtitle: '가족 생활 중심',
          content: `지역 선택이 얼마나 입시의 유불리를 가져오는지는 누구도 정확한 수치로 판단할 수 없습니다. 가족이 가장 살기 편한 지역을 선택하시는 것도 합리적인 선택입니다.

다만, 상위권 학생이라면 교육 특구의 사교육 환경을 활용하는 것이 입시에 유리할 수 있으므로, 라이딩 가능 여부 등을 고려해 보시기 바랍니다.`,
          keyPoint: '가족 생활 환경 중심으로 선택' }
      ]
    }
  };

  // 학생 조건에 맞는 전략 찾기 (새로운 조건 형식)
  const findStrategy = (categoryData, grade9, studentGrade, mathLevel) => {
    const gradeNum = parseGradeToNumber(studentGrade) || 8; // 기본값 중2
    const progressNum = parseProgressToNumber(mathLevel, studentGrade);

    // 전략 조건 매칭
    for (const strategy of categoryData.strategies) {
      const gradeMatch = gradeNum >= strategy.gradeMin && gradeNum <= strategy.gradeMax;
      const levelMatch = grade9 >= strategy.levelMin && grade9 <= strategy.levelMax;

      // 진도 조건 확인
      let progressMatch = true;
      if (strategy.progressMin !== null && progressNum !== null) {
        progressMatch = progressNum >= strategy.progressMin;
      }
      if (strategy.progressMax !== null && progressNum !== null) {
        progressMatch = progressMatch && progressNum <= strategy.progressMax;
      }

      if (gradeMatch && levelMatch && progressMatch) {
        return strategy;
      }
    }

    // 기본값: 마지막 전략 반환
    return categoryData.strategies[categoryData.strategies.length - 1];
  };

  // 이전 함수들은 하위 호환성을 위해 유지
  const gradeToLevel = (grade9) => {
    if (grade9 <= 2) return '상';
    if (grade9 <= 4) return '중';
    return '하';
  };

  const getGradeCategory = (studentGrade) => {
    if (!studentGrade) return '중등';
    const gradeStr = studentGrade.toString().toLowerCase();
    if (gradeStr.includes('초') || gradeStr.includes('elementary')) return '초등';
    if (gradeStr.includes('고') || gradeStr.includes('high')) return '고등';
    return '중등';
  };

  const getProgressStatus = (testType) => {
    if (testType === 'TRI') return '선행';
    return '정규';
  };

  // 이전 findStrategy는 새 버전으로 대체됨
  const findStrategyLegacy = (categoryData, grade9, studentGrade, testType) => {
    const level = gradeToLevel(grade9);
    const gradeCategory = getGradeCategory(studentGrade);
    const progressStatus = getProgressStatus(testType);

    let strategy = categoryData.strategies.find(s =>
      (s.grade === gradeCategory || s.grade === '전체') &&
      (s.progress === progressStatus || s.progress === '전체') &&
      (s.level === level || s.level === '전체')
    );

    if (!strategy) {
      strategy = categoryData.strategies.find(s =>
        (s.grade === gradeCategory || s.grade === '전체') &&
        (s.level === level || s.level === '전체')
      );
    }

    if (!strategy) {
      strategy = categoryData.strategies.find(s =>
        s.grade === gradeCategory || s.grade === '전체'
      );
    }

    return strategy || categoryData.strategies[0];
  };

  // 추천에 따른 스케일 위치 계산 (1~7, 4가 중앙)
  const getScalePosition = (recommendation, leftLabel, rightLabel) => {
    const rec = recommendation?.toLowerCase() || '';
    // 왼쪽 라벨과 매칭되면 1~3
    if (rec.includes(leftLabel.toLowerCase().substring(0, 2)) ||
        rec === leftLabel.toLowerCase()) {
      if (rec.includes('강력') || rec.includes('확실')) return 1;
      return 2;
    }
    // 오른쪽 라벨과 매칭되면 5~7
    if (rec.includes(rightLabel.toLowerCase().substring(0, 2)) ||
        rec === rightLabel.toLowerCase()) {
      if (rec.includes('강력') || rec.includes('확실')) return 7;
      return 6;
    }
    // 균형, 탐색, 병행 등은 중앙
    if (rec.includes('균형') || rec.includes('탐색') || rec.includes('병행') || rec.includes('+')) {
      return 4;
    }
    // 기본값은 약간 왼쪽 또는 오른쪽
    return 4;
  };

  // 스케일 인디케이터 컴포넌트
  const ScaleIndicator = ({ leftLabel, rightLabel, position, title }) => {
    return (
      <div className="scale-indicator">
        <div className="scale-header">{title}</div>
        <div className="scale-container">
          <span className="scale-label left">{leftLabel}</span>
          <div className="scale-dots">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div
                key={i}
                className={`scale-dot ${i === position ? 'active' : ''} ${i === 4 ? 'center' : ''}`}
              />
            ))}
          </div>
          <span className="scale-label right">{rightLabel}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <p>결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="report-page">
        <div className="report-error">
          <h2>오류</h2>
          <p>{error || '결과를 불러올 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  const { submission } = data;
  const wrongAnswers = data.question_results.filter(q => !q.isCorrect);

  // 전략 가이드 데이터 준비
  const strategyCategories = [
    'advanceVsDeepen',
    'csatVsSchool',
    'artsVsScience',
    'academyVsTutor',
    'regularVsIntensive',
    'regularVsSpecial'
  ];

  const strategies = strategyCategories.map(key => {
    const categoryData = STRATEGY_DATA[key];
    const strategy = findStrategy(categoryData, data.grade9, submission?.grade, submission?.math_level);
    const position = getScalePosition(strategy.recommendation, categoryData.leftLabel, categoryData.rightLabel);
    return {
      key,
      category: categoryData,
      strategy,
      position
    };
  });

  // 페이지 번호 계산
  let pageNum = 0;

  return (
    <div className="report-page">
      <div className="print-button-container">
        <button className="print-button" onClick={handlePrint}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
          </svg>
          PDF 출력
        </button>
      </div>

      <div className="report-document">
        {/* 표지 */}
        <div className="page cover-page">
          <div className="cover-decoration-top"></div>
          <div className="cover-decoration-bottom"></div>
          <div className="cover-logo">i.STUDY</div>
          <div className="cover-gold-line"></div>
          <div className="cover-title-wrapper">
            <h1 className="cover-title">수리탐구 진단검사</h1>
            <p className="cover-subtitle">MATHEMATICAL REASONING DIAGNOSTIC</p>
          </div>
          <div className="cover-gold-line"></div>
          <div className="cover-test-type">{submission?.test_type}</div>
          <div className="cover-student-info">
            <div className="cover-student-name">{submission?.student_name || '-'}</div>
            <div className="cover-student-detail">
              {submission?.school || '-'} | {submission?.grade || '-'}
            </div>
          </div>
          <div className="cover-date">{formatDate(submission?.submitted_at)}</div>
        </div>

        {/* 표지 뒷장 빈 페이지 (양면 인쇄용) */}
        <div className="page blank-page print-only">
          <div className="blank-page-content"></div>
        </div>

        {/* 간지 1: 성적 분석 */}
        <div className="page divider-page">
          <div className="divider-number">01</div>
          <h2 className="divider-title">성적 분석</h2>
          <p className="divider-subtitle">SCORE ANALYSIS</p>
          <div className="divider-gold-line"></div>
          <p className="divider-description">
            종합 성적과 영역별 세부 분석을 통해<br/>
            학생의 현재 수학 역량을 파악합니다.
          </p>
        </div>

        {/* 페이지 1: 종합 성적 */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">학생 정보</span>
              <div className="section-title-line"></div>
            </div>
            <div className="student-info-card">
              <div className="student-info-grid">
                <div className="student-info-item">
                  <span className="student-info-label">이름</span>
                  <span className="student-info-value">{submission?.student_name || '-'}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">학교</span>
                  <span className="student-info-value">{submission?.school || '-'}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">학년</span>
                  <span className="student-info-value">{submission?.grade || '-'}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">선행정도</span>
                  <span className="student-info-value">{submission?.math_level || '-'}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">검사 유형</span>
                  <span className="student-info-value">{getTestTypeName(submission?.test_type)}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">검사 일자</span>
                  <span className="student-info-value">{formatDate(submission?.submitted_at)}</span>
                </div>
              </div>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">종합 성적</span>
              <div className="section-title-line"></div>
            </div>
            <div className="overall-score-section">
              <div className="score-cards-grid">
                <div className="score-card primary">
                  <div className="score-card-label">총점</div>
                  <div className="score-card-value">
                    {data.total_score.toFixed(1)}
                    <span className="score-card-unit">점</span>
                  </div>
                  <div className="score-card-sub">/ {data.max_score}점 만점</div>
                </div>
                <div className="score-card">
                  <div className="score-card-label">백분위</div>
                  <div className="score-card-value">
                    {data.percentile.toFixed(1)}
                    <span className="score-card-unit">%</span>
                  </div>
                  <div className="score-card-sub">상위 {(100 - data.percentile).toFixed(1)}%</div>
                </div>
                <div className="score-card">
                  <div className="score-card-label">9등급제</div>
                  <div className="score-card-value">
                    {data.grade9}
                    <span className="score-card-unit">등급</span>
                  </div>
                  <div className="score-card-sub">현행 수능 기준</div>
                </div>
                <div className="score-card">
                  <div className="score-card-label">5등급제</div>
                  <div className="score-card-value" style={{ color: get5GradeColor(data.grade5) }}>
                    {data.grade5}
                    <span className="score-card-unit">등급</span>
                  </div>
                  <div className="score-card-sub">2028 수능 기준</div>
                </div>
              </div>

              <div className="chart-container">
                <NormalDistributionChart
                  score={data.total_score}
                  maxScore={data.max_score}
                  average={getTestStats(submission?.test_type).average}
                  stdDev={getTestStats(submission?.test_type).stdDev}
                  predictedGrade={getPredictedGrade(data.grade9)}
                />
              </div>
            </div>

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{++pageNum}</span>
            </div>
          </div>
        </div>

        {/* 페이지 2: 영역별 성적 */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">영역별 성적</span>
              <div className="section-title-line"></div>
            </div>

            <table className="area-table">
              <thead>
                <tr>
                  <th>영역</th>
                  <th>원점수</th>
                  <th>T-Score</th>
                  <th>백분위</th>
                  <th>평가</th>
                </tr>
              </thead>
              <tbody>
                {data.area_results.map((area, index) => {
                  const evaluation = getTScoreEvaluation(area.tscore);
                  const topPercentile = (100 - area.percentile).toFixed(0);
                  return (
                    <tr key={index}>
                      <td>{area.areaName}</td>
                      <td>{area.earnedScore.toFixed(1)} / {area.totalScore.toFixed(1)}</td>
                      <td className="tscore-cell" style={{ color: evaluation.className === 'excellent' ? '#2E7D32' : evaluation.className === 'good' ? '#1565C0' : evaluation.className === 'average' ? '#EF6C00' : evaluation.className === 'weak' ? '#F9A825' : '#C62828' }}>
                        {area.tscore.toFixed(1)}
                      </td>
                      <td>상위 {topPercentile}%</td>
                      <td>
                        <span className={`eval-badge ${evaluation.className}`}>
                          {evaluation.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="chart-container">
              <div className="chart-title">자기주도 학습역량 주요 요인 프로파일</div>
              <TScoreBarChart areaResults={data.area_results} />
            </div>

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{++pageNum}</span>
            </div>
          </div>
        </div>

        {/* 페이지 3: 난이도별 정답률 & 문항별 결과 */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">난이도별 정답률</span>
              <div className="section-title-line"></div>
            </div>

            <div className="difficulty-cards">
              {data.difficulty_results.map((diff, index) => {
                const labels = { LOW: '하난도', MID: '중난도', HIGH: '고난도' };
                const classNames = { LOW: 'low', MID: 'mid', HIGH: 'high' };
                return (
                  <div key={index} className={`difficulty-card ${classNames[diff.difficulty]}`}>
                    <div className={`difficulty-badge ${classNames[diff.difficulty]}`}>
                      {labels[diff.difficulty]}
                    </div>
                    <div className="difficulty-rate">{diff.correctRate.toFixed(1)}%</div>
                    <div className="difficulty-stats">
                      {diff.correctCount} / {diff.totalCount}문항 | {diff.earnedScore.toFixed(1)} / {diff.totalScore.toFixed(1)}점
                    </div>
                    <div className="difficulty-bar">
                      <div className={`difficulty-bar-fill ${classNames[diff.difficulty]}`} style={{ width: `${diff.correctRate}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">문항별 결과</span>
              <div className="section-title-line"></div>
            </div>

            <div className="question-grid">
              {data.question_results.map((q, index) => (
                <div key={index} className={`question-cell ${q.isCorrect ? 'correct' : 'incorrect'}`}>
                  <span className="question-cell-number">{q.questionNumber}</span>
                  <span className="question-cell-mark">{q.isCorrect ? '○' : '✕'}</span>
                </div>
              ))}
            </div>

            <div className="question-summary">
              <div className="question-summary-item">
                <span className="question-summary-label">정답</span>
                <span className="question-summary-value correct">
                  {data.question_results.filter(q => q.isCorrect).length}개
                </span>
              </div>
              <div className="question-summary-item">
                <span className="question-summary-label">오답</span>
                <span className="question-summary-value incorrect">
                  {wrongAnswers.length}개
                </span>
              </div>
            </div>

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{++pageNum}</span>
            </div>
          </div>
        </div>

        {/* 오답 문항 분석 (오답이 있는 경우) */}
        {wrongAnswers.length > 0 && (
          <div className="page content-page">
            <div className="page-content">
              <div className="page-header">
                <span className="page-header-logo">i.STUDY</span>
                <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
              </div>

              <div className="section-title">
                <span className="section-title-icon">▪</span>
                <span className="section-title-text">오답 문항 상세 분석</span>
                <div className="section-title-line"></div>
              </div>

              <div className="wrong-cards-grid">
                {wrongAnswers.slice(0, 8).map((q, index) => {
                  const diffInfo = getDifficultyInfo(q.difficulty);
                  return (
                    <div key={index} className="wrong-card">
                      <div className="wrong-card-header">
                        <span className="wrong-card-number">{q.questionNumber}번</span>
                        <span className="wrong-card-area">{q.area}</span>
                      </div>
                      <div className="wrong-card-content">
                        {getQuestionContent(submission?.test_type, q.questionNumber)}
                      </div>
                      <div className="wrong-card-meta">
                        <div className="wrong-card-meta-item">
                          <span className="wrong-card-meta-label">난이도</span>
                          <span className="wrong-card-meta-value" style={{ color: diffInfo.color }}>
                            {diffInfo.label} {diffInfo.text}
                          </span>
                        </div>
                        <div className="wrong-card-meta-item">
                          <span className="wrong-card-meta-label">배점</span>
                          <span className="wrong-card-meta-value">
                            {getQuestionScore(submission?.test_type, q.questionNumber, q.score)}점
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {wrongAnswers.length > 8 && (
                <p style={{ textAlign: 'center', color: '#8B7B72', fontSize: '12px', marginTop: '15px' }}>
                  ... 외 {wrongAnswers.length - 8}개 문항
                </p>
              )}

              <div className="page-footer">
                <span>i.study 수리탐구 진단검사</span>
                <span className="page-number">{++pageNum}</span>
              </div>
            </div>
          </div>
        )}

        {/* 오답문항분석 뒷장 빈 페이지 (양면 인쇄용) */}
        <div className="page blank-page print-only">
          <div className="blank-page-content"></div>
        </div>

        {/* 간지 2: 경쟁력 분석 */}
        <div className="page divider-page">
          <div className="divider-number">02</div>
          <h2 className="divider-title">경쟁력 분석</h2>
          <p className="divider-subtitle">COMPETITIVENESS ANALYSIS</p>
          <div className="divider-gold-line"></div>
          <p className="divider-description">
            고교 유형별 내신 경쟁력을 분석하고<br/>
            맞춤형 학습 전략을 제시합니다.
          </p>
        </div>

        {/* 고교 유형별 내신 경쟁력 분석 페이지 (4개 박스만) */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">고교 유형별 내신 경쟁력 분석</span>
              <div className="section-title-line"></div>
            </div>

            <div className="chart-container">
              <SchoolCompetitivenessChart score={data.total_score} maxScore={data.max_score} />
            </div>

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{++pageNum}</span>
            </div>
          </div>
        </div>

        {/* 간지 3: 학습 전략 가이드 */}
        <div className="page divider-page">
          <div className="divider-number">03</div>
          <h2 className="divider-title">학습 전략 가이드</h2>
          <p className="divider-subtitle">LEARNING STRATEGY GUIDE</p>
          <div className="divider-gold-line"></div>
          <p className="divider-description">
            학생의 현재 상황에 맞는<br/>
            맞춤형 학습 전략을 안내합니다.
          </p>
        </div>

        {/* 학습 전략 가이드 페이지 1 (전략 1-2) */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">학습 전략 가이드</span>
              <div className="section-title-line"></div>
            </div>

            {strategies.slice(0, 2).map((item, index) => (
              <div key={index} className="strategy-page-card">
                <ScaleIndicator
                  leftLabel={item.category.leftLabel}
                  rightLabel={item.category.rightLabel}
                  position={item.position}
                  title={item.category.title}
                />
                <h4 className="strategy-page-subtitle">
                  <span className="strategy-page-icon">{item.category.icon}</span>
                  {item.strategy.subtitle}
                </h4>
                <div className="strategy-page-content">{item.strategy.content}</div>
                <div className="strategy-page-keypoint">
                  <span className="keypoint-label">핵심:</span>
                  <span className="keypoint-text">{item.strategy.keyPoint}</span>
                </div>
              </div>
            ))}

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{++pageNum}</span>
            </div>
          </div>
        </div>

        {/* 학습 전략 가이드 페이지 2 (전략 3-4) */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">학습 전략 가이드</span>
              <div className="section-title-line"></div>
            </div>

            {strategies.slice(2, 4).map((item, index) => (
              <div key={index} className="strategy-page-card">
                <ScaleIndicator
                  leftLabel={item.category.leftLabel}
                  rightLabel={item.category.rightLabel}
                  position={item.position}
                  title={item.category.title}
                />
                <h4 className="strategy-page-subtitle">
                  <span className="strategy-page-icon">{item.category.icon}</span>
                  {item.strategy.subtitle}
                </h4>
                <div className="strategy-page-content">{item.strategy.content}</div>
                <div className="strategy-page-keypoint">
                  <span className="keypoint-label">핵심:</span>
                  <span className="keypoint-text">{item.strategy.keyPoint}</span>
                </div>
              </div>
            ))}

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{++pageNum}</span>
            </div>
          </div>
        </div>

        {/* 학습 전략 가이드 페이지 3 (전략 5-6) */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            <div className="section-title">
              <span className="section-title-icon">▪</span>
              <span className="section-title-text">학습 전략 가이드</span>
              <div className="section-title-line"></div>
            </div>

            {strategies.slice(4, 6).map((item, index) => (
              <div key={index} className="strategy-page-card">
                <ScaleIndicator
                  leftLabel={item.category.leftLabel}
                  rightLabel={item.category.rightLabel}
                  position={item.position}
                  title={item.category.title}
                />
                <h4 className="strategy-page-subtitle">
                  <span className="strategy-page-icon">{item.category.icon}</span>
                  {item.strategy.subtitle}
                </h4>
                <div className="strategy-page-content">{item.strategy.content}</div>
                <div className="strategy-page-keypoint">
                  <span className="keypoint-label">핵심:</span>
                  <span className="keypoint-text">{item.strategy.keyPoint}</span>
                </div>
              </div>
            ))}

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{++pageNum}</span>
            </div>
          </div>
        </div>

        {/* 학습 분석 (동적 코멘트가 있는 경우) */}
        {report?.dynamic_comments?.area_comments && (
          <>
            <div className="page divider-page">
              <div className="divider-number">04</div>
              <h2 className="divider-title">학습 분석</h2>
              <p className="divider-subtitle">LEARNING ANALYSIS</p>
              <div className="divider-gold-line"></div>
              <p className="divider-description">
                영역별 학습 분석과 종합 평가를 통해<br/>
                효과적인 학습 방향을 안내합니다.
              </p>
            </div>

            <div className="page content-page">
              <div className="page-content">
                <div className="page-header">
                  <span className="page-header-logo">i.STUDY</span>
                  <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
                </div>

                <div className="section-title">
                  <span className="section-title-icon">▪</span>
                  <span className="section-title-text">종합 분석</span>
                  <div className="section-title-line"></div>
                </div>

                <div className="summary-blocks">
                  {report.dynamic_comments.area_comments['종합 분석'] && (
                    <div className="summary-block general">
                      <p className="summary-block-text">
                        {typeof report.dynamic_comments.area_comments['종합 분석'] === 'object'
                          ? report.dynamic_comments.area_comments['종합 분석'].comment
                          : report.dynamic_comments.area_comments['종합 분석']}
                      </p>
                    </div>
                  )}
                  {report.dynamic_comments.area_comments['강점 영역'] && (
                    <div className="summary-block strength">
                      <div className="summary-block-title">강점 영역</div>
                      <p className="summary-block-text">
                        {typeof report.dynamic_comments.area_comments['강점 영역'] === 'object'
                          ? report.dynamic_comments.area_comments['강점 영역'].comment
                          : report.dynamic_comments.area_comments['강점 영역']}
                      </p>
                    </div>
                  )}
                  {report.dynamic_comments.area_comments['약점 영역'] && (
                    <div className="summary-block weakness">
                      <div className="summary-block-title">약점 영역</div>
                      <p className="summary-block-text">
                        {typeof report.dynamic_comments.area_comments['약점 영역'] === 'object'
                          ? report.dynamic_comments.area_comments['약점 영역'].comment
                          : report.dynamic_comments.area_comments['약점 영역']}
                      </p>
                    </div>
                  )}
                  {report.dynamic_comments.area_comments['학습 우선순위'] && (
                    <div className="summary-block priority">
                      <div className="summary-block-title">학습 우선순위</div>
                      <p className="summary-block-text">
                        {typeof report.dynamic_comments.area_comments['학습 우선순위'] === 'object'
                          ? report.dynamic_comments.area_comments['학습 우선순위'].comment
                          : report.dynamic_comments.area_comments['학습 우선순위']}
                      </p>
                    </div>
                  )}
                </div>

                <div className="page-footer">
                  <span>i.study 수리탐구 진단검사</span>
                  <span className="page-number">{++pageNum}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 마지막 페이지 */}
        <div className="page divider-page">
          <div className="divider-number" style={{ opacity: 0.08 }}>END</div>
          <h2 className="divider-title">감사합니다</h2>
          <p className="divider-subtitle">THANK YOU</p>
          <div className="divider-gold-line"></div>
          <p className="divider-description">
            본 결과는 i.study 수리탐구 진단검사 시스템을 통해<br/>
            자동 생성되었습니다.<br/><br/>
            상세한 학습 분석 및 맞춤형 커리큘럼 상담을 원하시면<br/>
            담당 선생님께 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
