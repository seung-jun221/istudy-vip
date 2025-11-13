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
          <div className="header-content">
            <div className="header-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="header-text">
              <h1 className="diagnostic-title">i.study 수학 진단검사</h1>
              <p className="diagnostic-subtitle">
                온라인 진단검사를 통해 현재 실력을 정확히 파악하고, 맞춤형 학습 전략을 제공받으세요
              </p>
            </div>
          </div>
          <div className="header-decoration"></div>
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
                      <div className="step-check">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
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
