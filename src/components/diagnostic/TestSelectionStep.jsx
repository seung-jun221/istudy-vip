import { useDiagnostic } from '../../context/DiagnosticContext';
import Button from '../common/Button';
import './TestSelectionStep.css';

export default function TestSelectionStep() {
  const { tests, selectedTest, setSelectedTest, setCurrentStep, showToast } = useDiagnostic();

  const handleSelectTest = (test) => {
    setSelectedTest(test);
  };

  const handleNext = () => {
    if (!selectedTest) {
      showToast('시험을 선택해주세요.', 'error');
      return;
    }
    setCurrentStep('answer-input');
  };

  const handleBack = () => {
    setCurrentStep('info');
  };

  const testInfo = {
    MONO: {
      grade: '중1-1',
      description: '수와 연산, 식의 계산, 방정식, 함수',
      emoji: '📗',
      color: '#4caf50'
    },
    DI: {
      grade: '중2-1',
      description: '실수와 연산, 식의 계산, 일차부등식, 연립방정식',
      emoji: '📘',
      color: '#2196f3'
    },
    TRI: {
      grade: '중3-1 + 공통수학1',
      description: '다항식, 이차방정식, 이차함수',
      emoji: '📙',
      color: '#ff9800'
    }
  };

  return (
    <div className="test-selection-step">
      <h2 className="step-title">진단검사 선택</h2>
      <p className="step-description">
        본인의 학년에 맞는 진단검사를 선택해주세요. (총 25문항, 100점)
      </p>

      <div className="test-grid">
        {tests.map((test) => {
          const info = testInfo[test.test_type];
          const isSelected = selectedTest?.id === test.id;

          return (
            <button
              key={test.id}
              className={`test-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectTest(test)}
            >
              <div className="test-emoji" style={{ backgroundColor: `${info.color}20` }}>
                {info.emoji}
              </div>
              <h3 className="test-name">{test.test_type} 진단검사</h3>
              <div className="test-grade" style={{ color: info.color }}>
                {info.grade}
              </div>
              <div className="test-info">
                <span>📝 {test.total_questions}문항</span>
                <span>📊 {test.total_score}점</span>
              </div>
              {isSelected && (
                <div className="selected-badge">
                  ✓ 선택됨
                </div>
              )}
            </button>
          );
        })}
      </div>

      {tests.length === 0 && (
        <div className="empty-state">
          <p>현재 이용 가능한 진단검사가 없습니다.</p>
        </div>
      )}

      <div className="button-group">
        <Button variant="secondary" onClick={handleBack}>
          ← 이전
        </Button>
        <Button onClick={handleNext} disabled={!selectedTest}>
          다음 단계 →
        </Button>
      </div>
    </div>
  );
}
