/**
 * 맞춤 학습 전략 가이드 컴포넌트
 * 학생의 학년, 진도, 등급에 따른 맞춤형 학습 전략을 제공합니다.
 */
import './LearningStrategyGuide.css';

// 학습 전략 데이터 (수학 학습 전략 가이드 멘트 기준)
const STRATEGY_DATA = {
  // 선행 VS 심화
  advanceVsDeepen: {
    title: '선행 VS 심화',
    icon: '📚',
    strategies: [
      // 초등학생
      { grade: '초등', progress: '선행', level: '상', recommendation: '선행',
        content: '현재 진도 대비 선행이 잘 되어 있고, 성적도 우수합니다. 지금처럼 선행을 유지하되, 심화 문제도 병행하여 사고력을 키워주세요.' },
      { grade: '초등', progress: '선행', level: '중', recommendation: '심화',
        content: '선행은 되어 있지만, 개념 이해가 부족할 수 있습니다. 선행 속도를 늦추고 현재 진도의 심화 학습에 집중해주세요.' },
      { grade: '초등', progress: '선행', level: '하', recommendation: '심화',
        content: '선행보다 현재 학년 개념을 완벽히 다지는 것이 우선입니다. 기본 개념부터 차근차근 복습해주세요.' },
      { grade: '초등', progress: '정규', level: '상', recommendation: '선행',
        content: '현재 진도에서 우수한 성적을 보이고 있습니다. 선행 학습을 시작해도 좋은 시기입니다.' },
      { grade: '초등', progress: '정규', level: '중', recommendation: '심화',
        content: '현재 진도를 더 탄탄히 다지는 것이 중요합니다. 심화 문제로 응용력을 키워주세요.' },
      { grade: '초등', progress: '정규', level: '하', recommendation: '심화',
        content: '기본 개념이 부족합니다. 선행보다 현재 학년 내용을 완벽히 이해하는 데 집중해주세요.' },
      // 중학생
      { grade: '중등', progress: '선행', level: '상', recommendation: '선행',
        content: '선행 학습이 잘 진행되고 있습니다. 고등 수학 선행을 준비하되, 중학 심화도 놓치지 마세요.' },
      { grade: '중등', progress: '선행', level: '중', recommendation: '심화',
        content: '선행 진도는 나가고 있으나, 현재 개념 정립이 필요합니다. 속도보다 깊이에 집중해주세요.' },
      { grade: '중등', progress: '선행', level: '하', recommendation: '심화',
        content: '선행이 오히려 독이 될 수 있습니다. 중학 기본 개념을 확실히 다진 후 진행해주세요.' },
      { grade: '중등', progress: '정규', level: '상', recommendation: '선행',
        content: '현재 실력이 우수합니다. 다음 학년 선행을 시작하여 여유를 확보하세요.' },
      { grade: '중등', progress: '정규', level: '중', recommendation: '심화',
        content: '현재 진도에서 심화 학습으로 실력을 다지세요. 선행은 기본이 완성된 후 시작하세요.' },
      { grade: '중등', progress: '정규', level: '하', recommendation: '심화',
        content: '기본기 강화가 최우선입니다. 이전 학년 복습과 함께 현재 개념을 확실히 잡아주세요.' },
      // 고등학생
      { grade: '고등', progress: '선행', level: '상', recommendation: '선행',
        content: '선행 학습이 효과적으로 진행 중입니다. 수능 대비와 함께 심화까지 병행하세요.' },
      { grade: '고등', progress: '선행', level: '중', recommendation: '심화',
        content: '선행 진도보다 현재 단원의 완성도를 높이세요. 내신과 수능 모두를 위해 기본기가 중요합니다.' },
      { grade: '고등', progress: '선행', level: '하', recommendation: '심화',
        content: '선행을 멈추고 기본 개념 정립에 올인하세요. 기초가 없으면 고등 수학은 무너집니다.' },
      { grade: '고등', progress: '정규', level: '상', recommendation: '선행',
        content: '좋은 성적입니다. 다음 과정 선행으로 수능 준비 시간을 확보하세요.' },
      { grade: '고등', progress: '정규', level: '중', recommendation: '심화',
        content: '현재 단원 심화 학습이 필요합니다. 기출문제 풀이로 유형을 익히세요.' },
      { grade: '고등', progress: '정규', level: '하', recommendation: '심화',
        content: '기본 개념부터 다시 점검하세요. 개념 강의와 기본 문제 반복이 필요합니다.' }
    ]
  },

  // 수능 VS 내신
  csatVsSchool: {
    title: '수능 VS 내신',
    icon: '🎯',
    strategies: [
      { grade: '고등', progress: '선행', level: '상', recommendation: '수능',
        content: '내신과 수능 모두 잘 대비되어 있습니다. 수능 킬러 문항까지 도전하며 최상위권을 노리세요.' },
      { grade: '고등', progress: '선행', level: '중', recommendation: '균형',
        content: '내신 기간에는 내신에, 그 외에는 수능 대비에 집중하는 균형 전략이 필요합니다.' },
      { grade: '고등', progress: '선행', level: '하', recommendation: '내신',
        content: '먼저 내신 성적을 안정시키세요. 내신 기본기가 수능의 토대가 됩니다.' },
      { grade: '고등', progress: '정규', level: '상', recommendation: '수능',
        content: '내신 성적이 안정적이라면 수능 유형 학습에 더 비중을 두세요.' },
      { grade: '고등', progress: '정규', level: '중', recommendation: '균형',
        content: '내신과 수능 사이 적절한 균형이 중요합니다. 시기에 따라 비중을 조절하세요.' },
      { grade: '고등', progress: '정규', level: '하', recommendation: '내신',
        content: '학교 수업과 내신 대비에 우선 집중하세요. 기본 개념이 수능의 기초입니다.' },
      // 중등은 수능/내신 구분이 덜 중요
      { grade: '중등', progress: '선행', level: '상', recommendation: '수능',
        content: '지금부터 수능 유형에 익숙해지면 좋습니다. 수학 사고력을 기르는 문제에 도전하세요.' },
      { grade: '중등', progress: '선행', level: '중', recommendation: '내신',
        content: '중학교 내신을 탄탄히 하는 것이 고등 수학의 기초가 됩니다.' },
      { grade: '중등', progress: '선행', level: '하', recommendation: '내신',
        content: '현재 학교 진도에 맞춘 학습이 우선입니다. 기본기를 다지세요.' },
      { grade: '중등', progress: '정규', level: '상', recommendation: '수능',
        content: '수학적 사고력을 키우는 문제에 도전하세요. 향후 수능에 큰 도움이 됩니다.' },
      { grade: '중등', progress: '정규', level: '중', recommendation: '내신',
        content: '학교 시험 대비를 철저히 하세요. 내신 성적 관리가 중요합니다.' },
      { grade: '중등', progress: '정규', level: '하', recommendation: '내신',
        content: '기본 개념 이해에 집중하세요. 학교 수업을 충실히 따라가는 것이 먼저입니다.' }
    ]
  },

  // 문과 VS 이과
  artsVsScience: {
    title: '문과 VS 이과',
    icon: '🔬',
    strategies: [
      { grade: '고등', progress: '선행', level: '상', recommendation: '이과',
        content: '수학 실력이 우수합니다. 이과 진학 시 수학이 큰 강점이 될 수 있습니다.' },
      { grade: '고등', progress: '선행', level: '중', recommendation: '신중',
        content: '현재 수학 성적으로는 문/이과 선택에 신중해야 합니다. 관심 분야와 다른 과목 성적도 고려하세요.' },
      { grade: '고등', progress: '선행', level: '하', recommendation: '문과',
        content: '수학이 약점이라면 문과 선택을 고려해보세요. 단, 문과도 수학이 중요해지고 있습니다.' },
      { grade: '고등', progress: '정규', level: '상', recommendation: '이과',
        content: '수학 성적이 좋습니다. 이과 선택 시 유리할 수 있으나, 과학 과목도 함께 고려하세요.' },
      { grade: '고등', progress: '정규', level: '중', recommendation: '신중',
        content: '문/이과 선택은 성적뿐 아니라 진로 희망을 함께 고려해야 합니다.' },
      { grade: '고등', progress: '정규', level: '하', recommendation: '문과',
        content: '수학 기본기 강화가 필요합니다. 진로 선택 전 수학 실력을 먼저 끌어올리세요.' },
      { grade: '중등', progress: '선행', level: '상', recommendation: '이과',
        content: '수학에 소질이 있습니다. 이과 계열 진로를 탐색해보세요.' },
      { grade: '중등', progress: '선행', level: '중', recommendation: '탐색',
        content: '아직 결정하기 이릅니다. 다양한 분야를 탐색하며 적성을 찾아보세요.' },
      { grade: '중등', progress: '선행', level: '하', recommendation: '탐색',
        content: '수학 실력 향상에 집중하세요. 문/이과 선택은 고등학교에서 결정해도 됩니다.' },
      { grade: '중등', progress: '정규', level: '상', recommendation: '이과',
        content: '수학적 사고력이 좋습니다. 이과 쪽 진로도 충분히 가능합니다.' },
      { grade: '중등', progress: '정규', level: '중', recommendation: '탐색',
        content: '여러 분야를 경험해보며 흥미와 적성을 찾아가세요.' },
      { grade: '중등', progress: '정규', level: '하', recommendation: '탐색',
        content: '기본 실력을 먼저 키우세요. 진로는 차차 결정해도 됩니다.' }
    ]
  },

  // 학원 VS 과외
  academyVsTutor: {
    title: '학원 VS 과외',
    icon: '👨‍🏫',
    strategies: [
      { grade: '초등', progress: '선행', level: '상', recommendation: '학원',
        content: '학원의 체계적인 커리큘럼이 선행 유지에 효과적입니다. 그룹 내 경쟁도 동기 부여가 됩니다.' },
      { grade: '초등', progress: '선행', level: '중', recommendation: '과외',
        content: '개인 맞춤 지도가 필요합니다. 부족한 부분을 채워줄 과외가 효과적입니다.' },
      { grade: '초등', progress: '선행', level: '하', recommendation: '과외',
        content: '1:1 밀착 관리로 기초부터 다시 잡아야 합니다. 과외 선생님의 집중 케어가 필요합니다.' },
      { grade: '초등', progress: '정규', level: '상', recommendation: '학원',
        content: '학원에서 선행을 시작하기 좋은 시기입니다. 체계적인 진도 관리가 가능합니다.' },
      { grade: '초등', progress: '정규', level: '중', recommendation: '학원',
        content: '또래와 함께 학습하는 환경이 도움이 됩니다. 학원의 정규 과정을 추천합니다.' },
      { grade: '초등', progress: '정규', level: '하', recommendation: '과외',
        content: '기초 부족은 과외로 1:1 맞춤 학습이 효과적입니다.' },
      { grade: '중등', progress: '선행', level: '상', recommendation: '학원',
        content: '학원의 심화반에서 실력을 더 키울 수 있습니다.' },
      { grade: '중등', progress: '선행', level: '중', recommendation: '과외',
        content: '개인별 취약점 보완이 필요합니다. 과외로 맞춤 학습하세요.' },
      { grade: '중등', progress: '선행', level: '하', recommendation: '과외',
        content: '학원 진도를 따라가기 어렵다면 과외로 기초를 다지세요.' },
      { grade: '중등', progress: '정규', level: '상', recommendation: '학원',
        content: '학원에서 내신과 선행을 동시에 준비할 수 있습니다.' },
      { grade: '중등', progress: '정규', level: '중', recommendation: '학원',
        content: '정규 학원 수업으로 기본기를 다지세요.' },
      { grade: '중등', progress: '정규', level: '하', recommendation: '과외',
        content: '1:1 지도로 부족한 개념을 채워야 합니다.' },
      { grade: '고등', progress: '선행', level: '상', recommendation: '학원',
        content: '입시 전문 학원의 체계적인 관리가 효과적입니다.' },
      { grade: '고등', progress: '선행', level: '중', recommendation: '병행',
        content: '학원과 과외를 병행하여 약점을 보완하세요.' },
      { grade: '고등', progress: '선행', level: '하', recommendation: '과외',
        content: '과외로 집중 관리를 받으며 기초를 다지세요.' },
      { grade: '고등', progress: '정규', level: '상', recommendation: '학원',
        content: '입시 학원에서 내신과 수능을 체계적으로 준비하세요.' },
      { grade: '고등', progress: '정규', level: '중', recommendation: '병행',
        content: '학원 수업과 함께 취약 부분은 과외로 보충하세요.' },
      { grade: '고등', progress: '정규', level: '하', recommendation: '과외',
        content: '개인 맞춤 지도가 절실합니다. 과외 선생님과 기초부터 시작하세요.' }
    ]
  },

  // 일반 VS 몰입
  regularVsIntensive: {
    title: '일반 VS 몰입',
    icon: '⚡',
    strategies: [
      { grade: '초등', progress: '선행', level: '상', recommendation: '일반',
        content: '현재 학습량을 유지하세요. 꾸준한 학습이 중요한 시기입니다.' },
      { grade: '초등', progress: '선행', level: '중', recommendation: '일반',
        content: '무리한 몰입보다 꾸준한 일반 학습이 효과적입니다.' },
      { grade: '초등', progress: '선행', level: '하', recommendation: '몰입',
        content: '방학을 활용해 집중 학습으로 기초를 다지세요.' },
      { grade: '초등', progress: '정규', level: '상', recommendation: '일반',
        content: '현재 페이스를 유지하며 꾸준히 학습하세요.' },
      { grade: '초등', progress: '정규', level: '중', recommendation: '일반',
        content: '무리하지 말고 현재 수준에서 꾸준히 공부하세요.' },
      { grade: '초등', progress: '정규', level: '하', recommendation: '몰입',
        content: '단기간 집중 학습으로 뒤처진 부분을 만회하세요.' },
      { grade: '중등', progress: '선행', level: '상', recommendation: '일반',
        content: '꾸준한 학습 습관을 유지하세요. 번아웃 주의!' },
      { grade: '중등', progress: '선행', level: '중', recommendation: '일반',
        content: '일정한 학습량을 유지하며 약점을 보완하세요.' },
      { grade: '중등', progress: '선행', level: '하', recommendation: '몰입',
        content: '방학 집중 학습으로 기본기를 확실히 잡으세요.' },
      { grade: '중등', progress: '정규', level: '상', recommendation: '일반',
        content: '무리하지 않는 선에서 심화까지 도전하세요.' },
      { grade: '중등', progress: '정규', level: '중', recommendation: '일반',
        content: '규칙적인 학습 습관이 가장 중요합니다.' },
      { grade: '중등', progress: '정규', level: '하', recommendation: '몰입',
        content: '부족한 기초를 집중 학습으로 채워야 합니다.' },
      { grade: '고등', progress: '선행', level: '상', recommendation: '일반',
        content: '현재 학습 패턴을 유지하되, 수능 D-100부터 몰입 모드로 전환하세요.' },
      { grade: '고등', progress: '선행', level: '중', recommendation: '몰입',
        content: '남은 시간을 고려해 집중 학습이 필요합니다.' },
      { grade: '고등', progress: '선행', level: '하', recommendation: '몰입',
        content: '지금부터 집중 학습 모드로 전환하세요. 기초부터 빠르게 정리해야 합니다.' },
      { grade: '고등', progress: '정규', level: '상', recommendation: '일반',
        content: '수능까지 체력 안배가 중요합니다. 페이스 조절하세요.' },
      { grade: '고등', progress: '정규', level: '중', recommendation: '몰입',
        content: '성적 향상을 위해 학습량을 늘려야 할 때입니다.' },
      { grade: '고등', progress: '정규', level: '하', recommendation: '몰입',
        content: '시간이 부족합니다. 최대한 집중해서 기본기를 잡으세요.' }
    ]
  },

  // 일반 VS 특구 (학군)
  regularVsSpecial: {
    title: '일반 VS 특구',
    icon: '🏫',
    strategies: [
      { grade: '초등', progress: '선행', level: '상', recommendation: '특구고려',
        content: '학업 수준이 높습니다. 학군지 이동 시 더 좋은 환경에서 경쟁할 수 있습니다.' },
      { grade: '초등', progress: '선행', level: '중', recommendation: '일반유지',
        content: '현재 환경에서 실력을 더 키운 후 결정해도 늦지 않습니다.' },
      { grade: '초등', progress: '선행', level: '하', recommendation: '일반유지',
        content: '특구 이동보다 현재 환경에서 기초를 다지는 것이 우선입니다.' },
      { grade: '초등', progress: '정규', level: '상', recommendation: '특구고려',
        content: '실력이 좋습니다. 학군지에서 더 성장할 가능성이 있습니다.' },
      { grade: '초등', progress: '정규', level: '중', recommendation: '일반유지',
        content: '현재 환경에서 내실을 다지세요.' },
      { grade: '초등', progress: '정규', level: '하', recommendation: '일반유지',
        content: '환경보다 기본 실력 향상이 먼저입니다.' },
      { grade: '중등', progress: '선행', level: '상', recommendation: '특구고려',
        content: '고등학교 진학을 고려해 학군지 이동을 검토해볼 수 있습니다.' },
      { grade: '중등', progress: '선행', level: '중', recommendation: '일반유지',
        content: '이동보다 현재 환경에서 실력을 더 끌어올리세요.' },
      { grade: '중등', progress: '선행', level: '하', recommendation: '일반유지',
        content: '환경 변화보다 기초 학력 신장이 급선무입니다.' },
      { grade: '중등', progress: '정규', level: '상', recommendation: '특구고려',
        content: '좋은 고등학교 진학을 위해 학군 이동을 고려해볼 수 있습니다.' },
      { grade: '중등', progress: '정규', level: '중', recommendation: '일반유지',
        content: '현재 학교에서 최선을 다하세요. 결과로 증명하면 됩니다.' },
      { grade: '중등', progress: '정규', level: '하', recommendation: '일반유지',
        content: '학군보다 학습 습관과 기본기가 더 중요합니다.' },
      { grade: '고등', progress: '선행', level: '상', recommendation: '현유지',
        content: '고등학교에서는 전학보다 현재 환경에서 최선을 다하세요.' },
      { grade: '고등', progress: '선행', level: '중', recommendation: '현유지',
        content: '환경 변화보다 학습에 집중하세요.' },
      { grade: '고등', progress: '선행', level: '하', recommendation: '현유지',
        content: '전학은 득보다 실이 클 수 있습니다. 현재 환경에서 열심히 하세요.' },
      { grade: '고등', progress: '정규', level: '상', recommendation: '현유지',
        content: '어떤 환경이든 본인 실력이 가장 중요합니다. 꾸준히 노력하세요.' },
      { grade: '고등', progress: '정규', level: '중', recommendation: '현유지',
        content: '환경 탓하지 말고 주어진 상황에서 최선을 다하세요.' },
      { grade: '고등', progress: '정규', level: '하', recommendation: '현유지',
        content: '지금 자리에서 기본기를 다지는 것이 가장 중요합니다.' }
    ]
  }
};

// 등급을 레벨로 변환
const gradeToLevel = (grade9) => {
  if (grade9 <= 3) return '상';
  if (grade9 <= 6) return '중';
  return '하';
};

// 학년 문자열 변환
const getGradeCategory = (studentGrade) => {
  if (!studentGrade) return '중등';
  const gradeStr = studentGrade.toString().toLowerCase();
  if (gradeStr.includes('초') || gradeStr.includes('elementary')) return '초등';
  if (gradeStr.includes('고') || gradeStr.includes('high')) return '고등';
  return '중등';
};

// 진도 상태 판단 (테스트 유형 기준)
const getProgressStatus = (testType) => {
  // TRI(종합)는 선행으로, 나머지는 정규로 분류
  if (testType === 'TRI') return '선행';
  return '정규';
};

export default function LearningStrategyGuide({ grade9, studentGrade, testType }) {
  const level = gradeToLevel(grade9);
  const gradeCategory = getGradeCategory(studentGrade);
  const progressStatus = getProgressStatus(testType);

  // 학생 조건에 맞는 전략 찾기
  const findStrategy = (categoryData) => {
    return categoryData.strategies.find(s =>
      s.grade === gradeCategory &&
      s.progress === progressStatus &&
      s.level === level
    ) || categoryData.strategies.find(s =>
      s.grade === gradeCategory &&
      s.level === level
    ) || categoryData.strategies[0];
  };

  // 모든 6개 카테고리 표시
  const allCategories = [
    'advanceVsDeepen',
    'csatVsSchool',
    'artsVsScience',
    'academyVsTutor',
    'regularVsIntensive',
    'regularVsSpecial'
  ];

  const strategies = allCategories.map(key => ({
    category: STRATEGY_DATA[key],
    strategy: findStrategy(STRATEGY_DATA[key])
  }));

  return (
    <div className="learning-strategy-guide">
      <div className="strategy-grid">
        {strategies.map((item, index) => (
          <div key={index} className="strategy-card">
            <div className="strategy-header">
              <span className="strategy-tag">{item.category.title}</span>
              <span className="strategy-icon">{item.category.icon}</span>
            </div>
            <div className="strategy-body">
              <div className="strategy-recommendation">
                <span className="recommendation-label">추천:</span>
                <span className="recommendation-value">{item.strategy.recommendation}</span>
              </div>
              <p className="strategy-content">{item.strategy.content}</p>
            </div>
            <div className="strategy-footer">
              <span className="condition-badge">{gradeCategory}</span>
              <span className="condition-badge">{progressStatus}</span>
              <span className="condition-badge">{level}위권</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
