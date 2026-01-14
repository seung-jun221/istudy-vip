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
  const STRATEGY_DATA = {
    advanceVsDeepen: {
      title: '선행 VS 심화',
      leftLabel: '심화',
      rightLabel: '선행',
      icon: '📚',
      strategies: [
        { grade: '중등', progress: '선행', level: '중', recommendation: '심화',
          subtitle: '심화 학습 우선',
          content: `고등 수학부터는 '상위 3등급' 이하의 학생들이라면 '내신과 수능 킬러 문제'를 제외한 나머지 문항들을 정확하고, 빠르게 푸는 것이 중요합니다.\n\n킬러를 제외한 나머지 문항들을 안정적으로 풀 수 없는 상태에서 선행을 나가는 것은 의미가 없습니다.`,
          keyPoint: '킬러 제외 문항을 빠르고 정확하게 푸는 능력이 우선' },
        { grade: '초등', progress: '선행', level: '상', recommendation: '선행',
          subtitle: '영재 교육 전략',
          content: `'영재 교육'을 하고 싶다면 일단 우리 아이의 학년부터 확인하세요. 초5이하의 학생이라면 원하는 '영재 교육'을 마음껏 하셔도 됩니다.\n\n초6 이후 시기부터는 '영재학교 합격선'이 아니라면 '정규 교육'에 몰입하는 것을 추천드립니다.`,
          keyPoint: '초5 이하는 영재교육 가능, 초6 이후는 정규 교육 몰입 권장' },
        { grade: '중등', progress: '선행', level: '상', recommendation: '선행',
          subtitle: '다음 학기 선행 추천',
          content: `현재 진행하고 있는 고등수학의 등급이 안정적으로 1~2등급이 나온다면, 다음 학기 고등 수학 선행을 하는 것을 추천합니다.\n\n지금은 다음 학기 선행을 제대로 학습하여 대표유형이 흔들리지 않게 만들어 놓는 것이 중요합니다.`,
          keyPoint: '1~2등급 안정시 다음 학기 선행 권장' },
        { grade: '중등', progress: '정규', level: '하', recommendation: '심화',
          subtitle: '전략적 과목 선택',
          content: `중학생 아이들이 수학에서 원하는 등급을 받지 못하는 경우라면, 현 입시 제도에서 우리 아이의 경쟁력을 생각해 보아야 합니다.\n\n아이가 '학업적 우수성'을 보이는 과목이 수학이 아니라면 중3 여름 방학 시기 이전까지는 수학 학습량을 줄이는 것을 추천합니다.`,
          keyPoint: '수학 외 경쟁력 있는 과목에 집중' },
        { grade: '고등', progress: '선행', level: '상', recommendation: '선행',
          subtitle: '선행 유지',
          content: `선행 학습이 효과적으로 진행 중입니다. 현재 진도를 유지하면서 수능 대비와 함께 심화까지 병행하는 것을 권장합니다.\n\n고등학교 수학에서 상위권을 유지하는 학생들은 선행과 심화를 균형있게 병행해야 합니다. 선행만 빠르게 나가면 개념의 깊이가 부족해지고, 심화만 하면 진도에서 뒤처질 수 있습니다.`,
          keyPoint: '선행 유지하며 수능 대비와 심화 병행' },
        { grade: '고등', progress: '정규', level: '하', recommendation: '심화',
          subtitle: '기본 개념 정립',
          content: `현재 수학 성적이 기대에 미치지 못한다면, 선행을 멈추고 기본 개념 정립에 집중해야 합니다.\n\n고등 수학은 중학교 때와 달리 개념들이 유기적으로 연결되어 있습니다. 기초가 없는 상태에서 선행을 나가면 결국 모든 단원에서 어려움을 겪게 됩니다. 지금은 현재 배우는 내용의 완벽한 이해가 최우선입니다.`,
          keyPoint: '선행 중단, 기본 개념 정립에 집중 필수' },
        { grade: '전체', progress: '전체', level: '중', recommendation: '심화',
          subtitle: '현행 완성 우선',
          content: `현재 학습 내용의 완성도를 높이는 것이 선행보다 중요합니다.\n\n중위권 학생들이 상위권으로 도약하기 위해서는 현재 배우고 있는 내용을 100% 소화하는 것이 핵심입니다. 선행을 나가더라도 현행이 흔들리면 결국 모래 위에 성을 쌓는 것과 같습니다.`,
          keyPoint: '현행 완성도 우선, 기본기 확립 후 선행' }
      ]
    },
    csatVsSchool: {
      title: '내신 VS 수능',
      leftLabel: '내신',
      rightLabel: '수능',
      icon: '🎯',
      strategies: [
        { grade: '전체', progress: '전체', level: '상', recommendation: '수능+내신',
          subtitle: '실전 기출 등급 확인',
          content: `최상위 등급이 나오는 학생들의 경우, '고1 내신 실전 기출' 등급 확인은 필수입니다.\n\n목표 등급이 잘 나온다면 원하는 다른 학습 역량을 키워도 되지만, 목표 등급이 잘 나오지 않는다면 내신 등급을 만드는 것을 최우선으로 학습해야 합니다.`,
          keyPoint: '고1 내신 실전 기출 등급 확인 필수' },
        { grade: '전체', progress: '전체', level: '상위', recommendation: '내신',
          subtitle: '내신 경쟁력 강화',
          content: `상위 11%안에 들어가는 학생들은 내신 경쟁력이 대입에 도움이 많이 됩니다.\n\n내신 2등급 안쪽에서는 한,두문제로 내신 1,2등급이 갈리기 때문에 정밀한 등급만들기 학습이 필요합니다.`,
          keyPoint: '상위 11% 내신은 대입에 큰 도움' },
        { grade: '전체', progress: '전체', level: '중', recommendation: '균형',
          subtitle: '시기별 전략적 선택',
          content: `'중위권 아이들' 입장에서는 고등 내신과 수능 두가지 시험을 모두 상위 등급 받기는 굉장히 어렵습니다.\n\n초, 중등 시기부터 고1 때까지 '공통과목 내신 등급'을 만들기 위해서 최선을 다하는 것이 중요합니다.`,
          keyPoint: '고1 공통과목 내신 등급 만들기 최우선' },
        { grade: '전체', progress: '전체', level: '하', recommendation: '수능',
          subtitle: '시험 종류 축소',
          content: `평소 학습 습관이 좋지 않아서 내신을 잘 받기 어려운 학생이라고 판단된다면, 일회성 평가 형태가 더 유리합니다.\n\n중하위권 학생들은 일회성 수능이라는 시험이 더 유리할 수 밖에 없습니다.`,
          keyPoint: '내신보다 수능 집중이 유리' },
        { grade: '중등', progress: '선행', level: '상', recommendation: '수능',
          subtitle: '수능 사고력 준비',
          content: `상위권 중학생이라면 지금부터 수능 유형에 익숙해지는 것이 좋습니다.\n\n수능 수학은 단순 계산이 아닌 수학적 사고력을 측정합니다. 중학교 때부터 논리적 사고와 문제 해결 능력을 기르는 문제에 도전하면 고등학교에서 수능 대비가 훨씬 수월해집니다.`,
          keyPoint: '수능 유형 익히기 시작' }
      ]
    },
    artsVsScience: {
      title: '문과 VS 이과',
      leftLabel: '문과',
      rightLabel: '이과',
      icon: '🔬',
      strategies: [
        { grade: '중등', progress: '선행', level: '상', recommendation: '이과',
          subtitle: '이과 선택 유리',
          content: `'문,이과 통합'이후 문,이과의 선택 기준은 더 이상 적성에 의해 결정되지 않습니다.\n\n문과를 지원할 학생들도 학습 역량만 된다면 이과 관련 선택 과목을 선택하여 교차 지원을 하는 것이 좋습니다.`,
          keyPoint: '문이과 통합 후 적성보다 학습 역량 기준' },
        { grade: '중등', progress: '선행', level: '중', recommendation: '탐색',
          subtitle: '학습 역량 측정',
          content: `본인의 학습 역량이 '수능 선택 과목'에서 미적, 기하 또는 과학2 과목까지 선택하여 학습이 가능하다면 대학 진학의 폭이 넓어집니다.`,
          keyPoint: '미적/기하/과학2 학습 가능 여부가 핵심' },
        { grade: '중등', progress: '정규', level: '중', recommendation: '탐색',
          subtitle: '타 과목 경쟁력 확보',
          content: `수학이나 과학에 흥미가 없거나 성취도가 나오지 않는 학생이라면, 수학, 과학 사교육에 시간 투자를 많이 하지 않는 것을 추천합니다.`,
          keyPoint: '수학/과학 성취도 낮으면 타 과목 경쟁력 극대화' },
        { grade: '고등', progress: '선행', level: '상', recommendation: '이과',
          subtitle: '이과 강점',
          content: `수학 실력이 우수합니다. 이과 진학 시 수학이 큰 강점이 될 수 있습니다.\n\n현재 수학 성취도가 높은 학생이라면 이과 계열로 진학하여 수학을 무기로 활용하는 것이 입시에서 유리합니다. 의대, 공대 등 이과 계열 상위권 학과에서는 수학 실력이 합격의 핵심 요소입니다.`,
          keyPoint: '수학 우수, 이과 진학시 강점' },
        { grade: '전체', progress: '전체', level: '하', recommendation: '문과',
          subtitle: '기본기 강화 우선',
          content: `수학 기본기 강화가 필요합니다. 진로 선택 전 수학 실력을 먼저 끌어올리세요.\n\n현재 수학 성취도가 낮다면 문·이과 선택보다 먼저 기본기를 다져야 합니다. 기본 개념이 잡히면 문·이과 어느 쪽을 선택하든 수학에서 경쟁력을 가질 수 있습니다.`,
          keyPoint: '수학 기본기 강화 우선' }
      ]
    },
    academyVsTutor: {
      title: '학원 VS 과외',
      leftLabel: '학원',
      rightLabel: '과외',
      icon: '👨‍🏫',
      strategies: [
        { grade: '중등', progress: '전체', level: '상', recommendation: '과외',
          subtitle: '고등 등급 만들기',
          content: `과외 형태의 맞춤형 교수법은 목적과 기간이 명확한 상태에서 해야 합니다.\n\n상위 등급 학생이라면 초, 중등 시기에 '고등 등급 만들기' 과정을 진행해야 합니다.`,
          keyPoint: '과외는 목적/기간 명확할 때만' },
        { grade: '초등', progress: '전체', level: '하', recommendation: '과외',
          subtitle: 'Make-up 학습',
          content: `과외는 한시적으로 정규과정을 따라가기 위해 진행되어야 하며, 부족한 영역을 명확히 확인하여 Make-up을 하는 용도로 활용해야 합니다.`,
          keyPoint: '과외는 한시적 Make-up 용도' },
        { grade: '중등', progress: '전체', level: '중', recommendation: '학원',
          subtitle: '학원 적응 추천',
          content: `성적이 중위권 이상인 경우 과외보다는 학원에 적응 시키는 것을 추천드립니다.\n\n학원은 장기적으로 지속 가능한 학습이고, 과정마다 정확한 레벨과 기간이 정해져 있기 때문에 학습 효율이 더 좋습니다.`,
          keyPoint: '중위권 이상은 학원 추천' },
        { grade: '고등', progress: '선행', level: '상', recommendation: '학원',
          subtitle: '입시 전문 학원',
          content: `입시 전문 학원의 체계적인 관리가 효과적입니다.\n\n고등학교 상위권 학생에게는 입시 전문 학원의 체계적인 커리큘럼과 경쟁 환경이 큰 도움이 됩니다. 내신과 수능을 동시에 관리할 수 있는 시스템을 갖춘 학원을 선택하는 것이 중요합니다.`,
          keyPoint: '입시 전문 학원의 체계적 관리 활용' },
        { grade: '고등', progress: '정규', level: '하', recommendation: '과외',
          subtitle: '1:1 맞춤 지도',
          content: `개인 맞춤 지도가 절실합니다. 과외 선생님과 기초부터 시작하세요.\n\n현재 수학 기초가 부족한 상태라면 학원의 빠른 진도를 따라가기 어렵습니다. 1:1 과외를 통해 부족한 부분을 정확히 진단하고 학생 수준에 맞는 맞춤형 학습이 필요합니다.`,
          keyPoint: '개인 맞춤 과외로 기초부터 시작 필요' }
      ]
    },
    regularVsIntensive: {
      title: '일반 VS 몰입',
      leftLabel: '일반',
      rightLabel: '몰입',
      icon: '⚡',
      strategies: [
        { grade: '중등', progress: '전체', level: '상', recommendation: '몰입',
          subtitle: '등급 차별화 전략',
          content: `특히 상위권 아이들은 심화 학습 단계에서 이해가 아닌 암기로 꾸역꾸역 버텨내고 있는 경우가 많습니다.\n\n중3 여름 방학 이전까지는 과감한 '몰입 학습'을 통해 등급 차별화를 만드는 것이 좋습니다.`,
          keyPoint: '잘하는 과목에 몰입하여 1등급 완성' },
        { grade: '중등', progress: '전체', level: '하', recommendation: '몰입',
          subtitle: '1~2과목 몰입 필수',
          content: `중3인 우리 아이가 주요 과목 등급이 안나온다면, 이 시기에는 반드시 '몰입 학습'을 해야 합니다.\n\n몰입해야 하는 과목은 가장 등급이 잘 나오거나 학습하기 가장 편한 과목을 선택하는 것이 좋습니다.`,
          keyPoint: '중3 11월 전까지 1~2과목 몰입 필수' },
        { grade: '중등', progress: '전체', level: '중', recommendation: '몰입',
          subtitle: '상위권 도약 기회',
          content: `중1~2 시기가 상위권 도약을 할 수 있는 유일한 시기입니다.\n\n현재까지 사교육을 해왔던 과목들 중에서 가장 등급이 잘 나오는 과목을 선택하여 '몰입 학습'을 진행하세요.`,
          keyPoint: '중1~2가 상위권 도약 유일한 시기' },
        { grade: '초등', progress: '전체', level: '상', recommendation: '일반',
          subtitle: '목표 시험 설정',
          content: `학습은 종류가 많아지면 절대 모든 학습을 다 잘 해낼 수가 없습니다.\n\n아이가 현 시점에서 목표로하는 대회나 시험을 최대한 열심히 준비할 수 있는 학원이나 과외를 우선 순위로 하세요.`,
          keyPoint: '모든 사교육보다 목표 시험 설정 후 집중' },
        { grade: '고등', progress: '선행', level: '상', recommendation: '일반',
          subtitle: '페이스 유지',
          content: `현재 학습 패턴을 유지하되, 수능 D-100부터 몰입 모드로 전환하세요.\n\n고등학교 상위권 학생은 무리한 몰입보다 꾸준한 학습 페이스 유지가 중요합니다. 다만 수능 100일 전부터는 집중적인 실전 대비가 필요하므로 그때 몰입 학습으로 전환하는 것이 효과적입니다.`,
          keyPoint: '현재 패턴 유지, 수능 D-100부터 몰입 전환' }
      ]
    },
    regularVsSpecial: {
      title: '일반 VS 특구',
      leftLabel: '일반',
      rightLabel: '특구',
      icon: '🏫',
      strategies: [
        { grade: '전체', progress: '전체', level: '상', recommendation: '특구',
          subtitle: '교육 특구 유리',
          content: `성적이 상위권인 경우, 교육 특구에서 학습을 받는 것이 무조건 유리합니다.\n\n초, 중등 학생들의 경우 본인이 진학하고자 하는 고등학교 '내신 기출 등급'을 확인하여야 합니다.`,
          keyPoint: '상위권은 교육 특구 무조건 유리' },
        { grade: '전체', progress: '전체', level: '중', recommendation: '일반+특구',
          subtitle: '특구 사교육 + 타지역 내신',
          content: `성적이 상위권이 아닌 경우, 교육 특구의 사교육 환경을 이용할 수 있으면서 내신 등급을 좀 더 편하게 받을 수 있는 지역을 추천합니다.`,
          keyPoint: '특구 사교육 활용 + 타 지역 내신 전략' },
        { grade: '중등', progress: '선행', level: '상', recommendation: '특구고려',
          subtitle: '고교 진학 대비',
          content: `고등학교 진학을 고려해 학군지 이동을 검토해볼 수 있습니다.\n\n중학교 상위권 학생이라면 고등학교 진학 전 교육 특구로의 이동을 고려해볼 만합니다. 다만 내신 경쟁이 치열해지는 점도 함께 고려해야 합니다. 목표 대학과 전형을 먼저 정하고 결정하는 것이 좋습니다.`,
          keyPoint: '고교 진학 대비 학군지 이동 검토 가능' },
        { grade: '고등', progress: '전체', level: '전체', recommendation: '현유지',
          subtitle: '현 환경 최선',
          content: `고등학교에서는 전학보다 현재 환경에서 최선을 다하세요.\n\n고등학교 재학 중 환경을 바꾸는 것은 오히려 학습에 방해가 될 수 있습니다. 현재 학교에서 내신 관리에 집중하고, 부족한 부분은 사교육을 통해 보완하는 것이 현실적인 전략입니다.`,
          keyPoint: '고등학교는 전학보다 현재 환경에서 최선' }
      ]
    }
  };

  // 등급을 레벨로 변환
  const gradeToLevel = (grade9) => {
    if (grade9 <= 2) return '상';
    if (grade9 <= 4) return '중';
    return '하';
  };

  // 학년 카테고리 변환
  const getGradeCategory = (studentGrade) => {
    if (!studentGrade) return '중등';
    const gradeStr = studentGrade.toString().toLowerCase();
    if (gradeStr.includes('초') || gradeStr.includes('elementary')) return '초등';
    if (gradeStr.includes('고') || gradeStr.includes('high')) return '고등';
    return '중등';
  };

  // 진도 상태 판단
  const getProgressStatus = (testType) => {
    if (testType === 'TRI') return '선행';
    return '정규';
  };

  // 학생 조건에 맞는 전략 찾기
  const findStrategy = (categoryData, grade9, studentGrade, testType) => {
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
    const strategy = findStrategy(categoryData, data.grade9, submission?.grade, submission?.test_type);
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
              <span className="section-title-icon">📋</span>
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
              <span className="section-title-icon">📊</span>
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
              <span className="section-title-icon">📈</span>
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
              <span className="section-title-icon">📉</span>
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
              <span className="section-title-icon">✏️</span>
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
                <span className="section-title-icon">⚠️</span>
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
              <span className="section-title-icon">🏫</span>
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
              <span className="section-title-icon">📚</span>
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
              <span className="section-title-icon">📚</span>
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
              <span className="section-title-icon">📚</span>
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
                  <span className="section-title-icon">📝</span>
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
