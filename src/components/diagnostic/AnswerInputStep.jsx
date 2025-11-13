import { useState } from 'react';
import { useDiagnostic } from '../../context/DiagnosticContext';
import Button from '../common/Button';
import './AnswerInputStep.css';

export default function AnswerInputStep() {
  const { selectedTest, answers, setAnswers, setCurrentStep, submitAnswers } = useDiagnostic();
  const [currentPage, setCurrentPage] = useState(1);

  const questionsPerPage = 5;
  const totalPages = 5; // 25 문항 ÷ 5 = 5 페이지

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleBack = () => {
    setCurrentStep('test-select');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getCurrentQuestions = () => {
    const start = (currentPage - 1) * questionsPerPage;
    const end = start + questionsPerPage;
    return answers.slice(start, end).map((answer, i) => ({
      number: start + i + 1,
      answer: answer
    }));
  };

  const getFilledCount = () => {
    return answers.filter(a => a && a.trim() !== '').length;
  };

  const isPageFilled = (page) => {
    const start = (page - 1) * questionsPerPage;
    const end = start + questionsPerPage;
    return answers.slice(start, end).every(a => a && a.trim() !== '');
  };

  return (
    <div className="answer-input-step">
      <div className="answer-header">
        <h2 className="step-title">답안 입력</h2>
        <p className="step-description">
          {selectedTest?.test_name} - 총 25문항
        </p>
        <div className="progress-info">
          <div className="filled-count">
            입력 완료: <strong>{getFilledCount()}</strong> / 25
          </div>
          <div className="progress-percentage">
            {Math.round((getFilledCount() / 25) * 100)}%
          </div>
        </div>
      </div>

      {/* 페이지 네비게이션 */}
      <div className="page-navigation">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`page-button ${currentPage === page ? 'active' : ''} ${isPageFilled(page) ? 'filled' : ''}`}
            onClick={() => handlePageChange(page)}
          >
            <span className="page-number">{page}</span>
            <span className="page-range">
              {(page - 1) * questionsPerPage + 1}~{page * questionsPerPage}
            </span>
          </button>
        ))}
      </div>

      {/* 답안 입력 폼 */}
      <div className="answer-grid">
        {getCurrentQuestions().map((q) => (
          <div key={q.number} className="answer-item">
            <label className="answer-label">
              문항 {q.number}
            </label>
            <input
              type="text"
              className="answer-input"
              value={q.answer}
              onChange={(e) => handleAnswerChange(q.number - 1, e.target.value)}
              placeholder="답 입력"
              maxLength={20}
            />
          </div>
        ))}
      </div>

      {/* 페이지 이동 버튼 */}
      <div className="page-controls">
        <Button
          variant="secondary"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          ← 이전 페이지
        </Button>
        <div className="page-indicator">
          {currentPage} / {totalPages}
        </div>
        <Button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          다음 페이지 →
        </Button>
      </div>

      {/* 하단 버튼 */}
      <div className="button-group">
        <Button variant="secondary" onClick={handleBack}>
          ← 시험 다시 선택
        </Button>
        <Button
          onClick={submitAnswers}
          disabled={getFilledCount() < 25}
          className="submit-button"
        >
          제출하기 ({getFilledCount()}/25)
        </Button>
      </div>

      {getFilledCount() < 25 && (
        <p className="warning-text">
          ⚠️ 모든 문항에 답을 입력해야 제출할 수 있습니다.
        </p>
      )}
    </div>
  );
}
