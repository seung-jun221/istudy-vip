import { useDiagnostic } from '../../context/DiagnosticContext';
import Button from '../common/Button';
import './ResultStep.css';

export default function ResultStep() {
  const { submissionResult, resetForm } = useDiagnostic();

  if (!submissionResult || !submissionResult.result) {
    return (
      <div className="result-step">
        <div className="empty-result">
          <p>결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { result, submission } = submissionResult;
  const attemptNumber = submission?.attempt_number || 1;
  const isRetake = attemptNumber > 1;

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

  // area_results 정규화 함수 (객체/배열 형식 모두 지원)
  const normalizeAreaResults = (areaResults) => {
    if (!areaResults) return [];
    if (Array.isArray(areaResults)) return areaResults;
    return Object.entries(areaResults).map(([areaName, stats]) => ({
      areaName,
      totalScore: stats.max || stats.totalScore || 0,
      earnedScore: stats.earned || stats.earnedScore || 0,
      correctCount: stats.correctCount || 0,
      totalCount: stats.totalCount || 0,
      correctRate: stats.rate || stats.correctRate || 0,
      tscore: stats.tscore || 50,
      percentile: stats.percentile || stats.rate || 50,
    }));
  };

  return (
    <div className="result-step">
      <div className="result-header">
        <div className="success-badge">✓ 채점 완료</div>
        <h2 className="result-title">진단검사 결과</h2>
        <p className="result-subtitle">
          채점이 완료되었습니다. 자세한 분석 보고서는 이메일로 발송됩니다.
        </p>
        {isRetake && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: '#e3f2fd',
              border: '1px solid #90caf9',
              borderRadius: '8px',
              color: '#1557b0',
              fontSize: '13.5px',
              lineHeight: 1.5,
            }}
          >
            📌 이전 진단검사 이력이 확인되어 이번 응시는{' '}
            <strong>{attemptNumber}회차</strong>로 기록되었습니다.
          </div>
        )}
      </div>

      {/* 종합 성적 */}
      <div className="result-section overall-score">
        <h3 className="section-title">📊 종합 성적</h3>
        <div className="score-grid">
          <div className="score-item main-score">
            <div className="score-label">총점</div>
            <div className="score-value">
              {result.total_score.toFixed(1)}점
              <span className="max-score">/ {result.max_score}</span>
            </div>
          </div>
          <div className="score-item">
            <div className="score-label">백분위</div>
            <div className="score-value">{result.percentile.toFixed(1)}%</div>
          </div>
          <div className="score-item">
            <div className="score-label">9등급제</div>
            <div className="score-value">{result.grade9}등급</div>
          </div>
          <div className="score-item">
            <div className="score-label">5등급제 (2028)</div>
            <div
              className="score-value grade5"
              style={{ color: get5GradeColor(result.grade5) }}
            >
              {result.grade5}등급
            </div>
          </div>
        </div>
      </div>

      {/* 영역별 성적 */}
      <div className="result-section">
        <h3 className="section-title">📈 영역별 성적</h3>
        <div className="area-list">
          {normalizeAreaResults(result.area_results).map((area, index) => (
            <div key={index} className="area-item">
              <div className="area-header">
                <div className="area-name">{area.areaName}</div>
                <div className="area-score">
                  {area.earnedScore.toFixed(1)} / {area.totalScore.toFixed(1)}점
                </div>
              </div>
              <div className="area-stats">
                <div className="stat">
                  <span className="stat-label">정답률</span>
                  <span className="stat-value">{area.correctRate.toFixed(1)}%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">정답수</span>
                  <span className="stat-value">
                    {area.correctCount}/{area.totalCount}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">T-Score</span>
                  <span className="stat-value">{area.tscore.toFixed(1)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">백분위</span>
                  <span className="stat-value">{area.percentile.toFixed(1)}%</span>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${area.correctRate}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 난이도별 정답률 */}
      <div className="result-section">
        <h3 className="section-title">🎯 난이도별 정답률</h3>
        <div className="difficulty-list">
          {result.difficulty_results.map((diff, index) => {
            const labels = { LOW: '하난도', MID: '중난도', HIGH: '고난도' };
            return (
              <div key={index} className="difficulty-item">
                <div className="difficulty-header">
                  <div className="difficulty-name">{labels[diff.difficulty]}</div>
                  <div className="difficulty-rate">
                    {diff.correctRate.toFixed(1)}%
                  </div>
                </div>
                <div className="difficulty-detail">
                  {diff.correctCount}/{diff.totalCount} 문항 정답
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${diff.correctRate}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="info-box">
        <h4 className="info-title">📧 상세 분석 보고서</h4>
        <p className="info-text">
          - 7페이지 분량의 상세 분석 보고서가 이메일로 발송됩니다.
        </p>
        <p className="info-text">
          - 영역별 상세 분석, 학습 전략 가이드, 3개월 학습 로드맵이 포함됩니다.
        </p>
        <p className="info-text">
          - 보고서는 1~2시간 내에 발송됩니다.
        </p>
      </div>

      {/* 버튼 */}
      <div className="button-group">
        <Button onClick={resetForm}>
          새로운 진단검사 시작하기
        </Button>
      </div>
    </div>
  );
}
