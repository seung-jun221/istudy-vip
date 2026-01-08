import { useDiagnostic } from '../context/DiagnosticContext';
import StudentInfoStep from '../components/diagnostic/StudentInfoStep';
import TestSelectionStep from '../components/diagnostic/TestSelectionStep';
import AnswerInputStep from '../components/diagnostic/AnswerInputStep';
import ResultStep from '../components/diagnostic/ResultStep';
import './DiagnosticTestPage.css';

export default function DiagnosticTestPage() {
  const { currentStep } = useDiagnostic();

  const steps = [
    { id: 'info', label: '학생 정보', icon: '👤' },
    { id: 'test-select', label: '시험 선택', icon: '📋' },
    { id: 'answer-input', label: '답안 입력', icon: '✏️' },
    { id: 'result', label: '결과 확인', icon: '📊' }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  const getStepStatus = (stepIndex) => {
    const currentIndex = getCurrentStepIndex();
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="diagnostic-page">
      <div className="diagnostic-container">
        {/* 헤더 */}
        <header className="diagnostic-header">
          <h1 className="diagnostic-title">📝 i.study 수학 진단검사</h1>
          <p className="diagnostic-subtitle">
            온라인 진단검사를 통해 현재 실력을 정확히 파악하고, 맞춤형 학습 전략을 제공받으세요
          </p>
        </header>

        {/* 진행 단계 표시 */}
        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${(getCurrentStepIndex() / (steps.length - 1)) * 100}%` }}
              ></div>
            </div>
            <div className="progress-steps">
              {steps.map((step, index) => (
                <div key={step.id} className="progress-step-wrapper">
                  <div className={`progress-step ${getStepStatus(index)}`}>
                    <div className="step-indicator">
                      <div className="step-number">{index + 1}</div>
                      <div className="step-check">✓</div>
                    </div>
                    <div className="step-label">
                      <span className="step-icon">{step.icon}</span>
                      <span className="step-text">{step.label}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 단계별 컨텐츠 */}
        <div className="diagnostic-content">
          {currentStep === 'info' && <StudentInfoStep />}
          {currentStep === 'test-select' && <TestSelectionStep />}
          {currentStep === 'answer-input' && <AnswerInputStep />}
          {currentStep === 'result' && <ResultStep />}
        </div>
      </div>
    </div>
  );
}
