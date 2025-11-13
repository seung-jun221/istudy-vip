import { useDiagnostic } from '../context/DiagnosticContext';
import StudentInfoStep from '../components/diagnostic/StudentInfoStep';
import TestSelectionStep from '../components/diagnostic/TestSelectionStep';
import AnswerInputStep from '../components/diagnostic/AnswerInputStep';
import ResultStep from '../components/diagnostic/ResultStep';
import './DiagnosticTestPage.css';

export default function DiagnosticTestPage() {
  const { currentStep } = useDiagnostic();

  return (
    <div className="diagnostic-page">
      <div className="diagnostic-container">
        {/* 헤더 */}
        <header className="diagnostic-header">
          <h1 className="diagnostic-title">📝 i.study 수학 진단검사</h1>
          <p className="diagnostic-subtitle">
            온라인 진단검사를 통해 현재 실력을 정확히 파악하고, 맞춤형 학습 전략을 제공받으세요.
          </p>
        </header>

        {/* 진행 단계 표시 */}
        <div className="progress-bar">
          <div className={`progress-step ${currentStep === 'info' ? 'active' : currentStep !== 'info' ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">학생 정보</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep === 'test-select' ? 'active' : currentStep === 'answer-input' || currentStep === 'result' ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">시험 선택</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep === 'answer-input' ? 'active' : currentStep === 'result' ? 'completed' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">답안 입력</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${currentStep === 'result' ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-label">결과 확인</div>
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
