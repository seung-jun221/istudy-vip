import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFullResultById } from '../utils/diagnosticService';
import './DiagnosticReportPage.css';

export default function DiagnosticReportPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
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
    } catch (err) {
      console.error('결과 조회 실패:', err);
      setError('결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const get5GradeColor = (grade) => {
    const colors = {
      1: '#4caf50',
      2: '#8bc34a',
      3: '#ffc107',
      4: '#ff9800',
      5: '#f44336'
    };
    return colors[grade] || '#999';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getTestTypeName = (testType) => {
    const names = {
      'DI': '연산 진단검사',
      'MONO': '단원 진단검사',
      'TRI': '종합 진단검사'
    };
    return names[testType] || testType;
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
          <h2>⚠️ 오류</h2>
          <p>{error || '결과를 불러올 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  const { submission } = data;

  return (
    <div className="report-page">
      <div className="report-container">
        {/* 헤더 */}
        <div className="report-header">
          <h1 className="report-title">i.study 수리탐구 진단검사 결과 보고서</h1>
          <p className="report-subtitle">Mathematical Reasoning Diagnostic Test Report</p>
        </div>

        {/* 학생 정보 */}
        <div className="report-section">
          <h2 className="section-title">학생 정보</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">이름</span>
              <span className="info-value">{submission?.student_name || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">학년</span>
              <span className="info-value">{submission?.grade || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">학교</span>
              <span className="info-value">{submission?.school || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">선행정도</span>
              <span className="info-value">{submission?.math_level || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">검사 유형</span>
              <span className="info-value">{getTestTypeName(submission?.test_type)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">검사 일자</span>
              <span className="info-value">{formatDate(submission?.submitted_at)}</span>
            </div>
          </div>
        </div>

        {/* 종합 성적 */}
        <div className="report-section">
          <h2 className="section-title">종합 성적</h2>
          <div className="score-grid">
            <div className="score-card primary">
              <div className="score-label">총점</div>
              <div className="score-value-large">
                {data.total_score.toFixed(1)}
                <span className="score-unit">점</span>
              </div>
              <div className="score-max">/ {data.max_score}점</div>
            </div>
            <div className="score-card">
              <div className="score-label">백분위</div>
              <div className="score-value-large">{data.percentile.toFixed(1)}<span className="score-unit">%</span></div>
              <div className="score-desc">상위 {(100 - data.percentile).toFixed(1)}%</div>
            </div>
            <div className="score-card">
              <div className="score-label">9등급제</div>
              <div className="score-value-large">{data.grade9}<span className="score-unit">등급</span></div>
              <div className="score-desc">현행 수능 기준</div>
            </div>
            <div className="score-card">
              <div className="score-label">5등급제 (2028)</div>
              <div className="score-value-large" style={{ color: get5GradeColor(data.grade5) }}>
                {data.grade5}<span className="score-unit">등급</span>
              </div>
              <div className="score-desc">2028 개편 수능 기준</div>
            </div>
          </div>
        </div>

        {/* 영역별 성적 */}
        <div className="report-section">
          <h2 className="section-title">영역별 성적</h2>
          <div className="area-table">
            <div className="table-header">
              <div className="col col-area">영역</div>
              <div className="col col-score">득점</div>
              <div className="col col-correct">정답수</div>
              <div className="col col-rate">정답률</div>
              <div className="col col-tscore">T-Score</div>
              <div className="col col-percentile">백분위</div>
            </div>
            {data.area_results.map((area, index) => (
              <div key={index} className="table-row">
                <div className="col col-area">
                  <strong>{area.areaName}</strong>
                </div>
                <div className="col col-score">
                  {area.earnedScore.toFixed(1)} / {area.totalScore.toFixed(1)}
                </div>
                <div className="col col-correct">
                  {area.correctCount} / {area.totalCount}
                </div>
                <div className="col col-rate">
                  <div className="rate-bar">
                    <div className="rate-fill" style={{ width: `${area.correctRate}%` }}></div>
                    <span className="rate-text">{area.correctRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="col col-tscore">{area.tscore.toFixed(1)}</div>
                <div className="col col-percentile">{area.percentile.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* 난이도별 정답률 */}
        <div className="report-section">
          <h2 className="section-title">난이도별 정답률</h2>
          <div className="difficulty-grid">
            {data.difficulty_results.map((diff, index) => {
              const labels = { LOW: '하난도', MID: '중난도', HIGH: '고난도' };
              const colors = { LOW: '#4caf50', MID: '#ff9800', HIGH: '#f44336' };
              return (
                <div key={index} className="difficulty-card">
                  <div className="difficulty-header">
                    <div className="difficulty-badge" style={{ background: colors[diff.difficulty] }}>
                      {labels[diff.difficulty]}
                    </div>
                    <div className="difficulty-rate">{diff.correctRate.toFixed(1)}%</div>
                  </div>
                  <div className="difficulty-stats">
                    <div className="stat-item">
                      <span>정답</span>
                      <strong>{diff.correctCount} / {diff.totalCount}</strong>
                    </div>
                    <div className="stat-item">
                      <span>득점</span>
                      <strong>{diff.earnedScore.toFixed(1)} / {diff.totalScore.toFixed(1)}</strong>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${diff.correctRate}%`, background: colors[diff.difficulty] }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 문항별 결과 */}
        <div className="report-section">
          <h2 className="section-title">문항별 결과</h2>
          <div className="question-grid">
            {data.question_results.map((q, index) => (
              <div key={index} className={`question-item ${q.isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="question-number">{q.questionNumber}</div>
                <div className="question-result">{q.isCorrect ? '○' : '✕'}</div>
              </div>
            ))}
          </div>
          <div className="question-summary">
            <div className="summary-item">
              <span className="summary-label">정답</span>
              <span className="summary-value correct-text">
                {data.question_results.filter(q => q.isCorrect).length}개
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">오답</span>
              <span className="summary-value incorrect-text">
                {data.question_results.filter(q => !q.isCorrect).length}개
              </span>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="report-footer">
          <p className="footer-text">
            본 결과는 i.study 수리탐구 진단검사 시스템을 통해 자동 생성되었습니다.
          </p>
          <p className="footer-text">
            상세한 학습 분석 및 맞춤형 커리큘럼 상담을 원하시면 담당 선생님께 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
