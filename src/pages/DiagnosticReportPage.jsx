import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFullResultById, getOrGenerateReport } from '../utils/diagnosticService';
import NormalDistributionChart from '../components/charts/NormalDistributionChart';
import TScoreBarChart from '../components/charts/TScoreBarChart';
import SchoolCompetitivenessChart from '../components/charts/SchoolCompetitivenessChart';
import LearningStrategyGuide from '../components/charts/LearningStrategyGuide';
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

      // 보고서 데이터 (동적 코멘트) 로드 - 없으면 자동 생성
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
      'DI': 'DI 진단검사',
      'MONO': 'MONO 진단검사',
      'TRI': 'TRI 진단검사'
    };
    return names[testType] || testType;
  };

  // 문항별 상세 정보 (배점표 기준)
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

  // 난이도 표시 함수
  const getDifficultyInfo = (difficulty) => {
    const info = {
      'LOW': { label: '⭐', text: '기본', color: '#4caf50' },
      'MID': { label: '⭐⭐', text: '중급', color: '#8bc34a' },
      'HIGH': { label: '⭐⭐⭐', text: '심화', color: '#ff9800' },
      'VERY_HIGH': { label: '⭐⭐⭐⭐', text: '고급', color: '#ff5722' },
      'EXTREME': { label: '⭐⭐⭐⭐⭐', text: '최고급', color: '#f44336' }
    };
    return info[difficulty] || { label: '⭐⭐', text: '중급', color: '#888' };
  };

  // 문항 내용 가져오기
  const getQuestionContent = (testType, questionNumber) => {
    return QUESTION_DATA[testType]?.[questionNumber]?.content || '-';
  };

  // 문항 배점 가져오기 (DB 데이터가 0인 경우 배점표에서 조회)
  const getQuestionScore = (testType, questionNumber, dbScore) => {
    if (dbScore && dbScore > 0) return dbScore;
    return QUESTION_DATA[testType]?.[questionNumber]?.score || 0;
  };

  // 검사 유형별 평균/표준편차 데이터 (진단검사 평균 표준편차.txt 기준)
  const getTestStats = (testType) => {
    const stats = {
      'MONO': { average: 45, stdDev: 22 },  // 평균 43-48점, 표준편차 20-24점
      'DI': { average: 47, stdDev: 20 },    // 평균 45-50점, 표준편차 18-22점
      'TRI': { average: 42, stdDev: 24 }    // 평균 40-45점, 표준편차 22-26점
    };
    return stats[testType] || { average: 45, stdDev: 20 };
  };

  // 예상 등급 계산 (9등급 기준으로 범위 표시)
  const getPredictedGrade = (grade9) => {
    if (grade9 <= 2) return `${grade9}~${Math.min(grade9 + 1, 3)}`;
    if (grade9 <= 4) return `${grade9 - 1}~${grade9}`;
    if (grade9 <= 6) return `${grade9}~${grade9 + 1}`;
    return `${grade9 - 1}~${grade9}`;
  };

  // T-Score 기반 평가 레벨 및 색상
  const getTScoreEvaluation = (tScore) => {
    if (tScore >= 70) return { label: '최상', color: '#e8f5e9', textColor: '#2e7d32' };
    if (tScore >= 60) return { label: '우수', color: '#e3f2fd', textColor: '#1565c0' };
    if (tScore >= 40) return { label: '보통', color: '#fff3e0', textColor: '#ef6c00' };
    if (tScore >= 30) return { label: '주의', color: '#fff8e1', textColor: '#f9a825' };
    return { label: '위험', color: '#ffebee', textColor: '#c62828' };
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

          {/* 정규분포 그래프 */}
          <NormalDistributionChart
            score={data.total_score}
            maxScore={data.max_score}
            average={getTestStats(submission?.test_type).average}
            stdDev={getTestStats(submission?.test_type).stdDev}
            predictedGrade={getPredictedGrade(data.grade9)}
          />
        </div>

        {/* 영역별 성적 */}
        <div className="report-section">
          <h2 className="section-title">영역별 성적</h2>
          <div className="area-table">
            <div className="table-header">
              <div className="col col-area">영역</div>
              <div className="col col-score">원점수</div>
              <div className="col col-tscore">T-Score</div>
              <div className="col col-percentile">백분위</div>
              <div className="col col-eval">평가</div>
            </div>
            {data.area_results.map((area, index) => {
              const evaluation = getTScoreEvaluation(area.tscore);
              const topPercentile = (100 - area.percentile).toFixed(0);
              return (
                <div key={index} className="table-row">
                  <div className="col col-area">
                    <strong>{area.areaName}</strong>
                  </div>
                  <div className="col col-score">
                    {area.earnedScore.toFixed(1)}/{area.totalScore.toFixed(1)}
                  </div>
                  <div className="col col-tscore" style={{ color: evaluation.textColor }}>
                    {area.tscore.toFixed(1)}
                  </div>
                  <div className="col col-percentile">{topPercentile}%</div>
                  <div className="col col-eval">
                    <span
                      className="eval-badge"
                      style={{
                        backgroundColor: evaluation.color,
                        color: evaluation.textColor
                      }}
                    >
                      {evaluation.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* T-Score 프로필 차트 */}
        <div className="report-section">
          <h2 className="section-title">자기주도 학습역량 주요 요인 프로파일</h2>
          <TScoreBarChart areaResults={data.area_results} />
        </div>

        {/* 고교 유형별 내신 경쟁력 분석 */}
        <div className="report-section">
          <h2 className="section-title">고교 유형별 내신 경쟁력 분석</h2>
          <SchoolCompetitivenessChart score={data.total_score} maxScore={data.max_score} />
        </div>

        {/* 맞춤 학습 전략 가이드 */}
        <div className="report-section">
          <h2 className="section-title">맞춤 학습 전략 가이드</h2>
          <LearningStrategyGuide
            grade9={data.grade9}
            studentGrade={submission?.grade}
            testType={submission?.test_type}
          />
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

          {/* 오답 문항 상세 분석 */}
          {data.question_results.filter(q => !q.isCorrect).length > 0 && (
            <div className="wrong-answers-section">
              <h3 className="wrong-answers-title">오답 문항 상세 분석</h3>
              <div className="wrong-answers-list">
                {data.question_results
                  .filter(q => !q.isCorrect)
                  .map((q, index) => {
                    const diffInfo = getDifficultyInfo(q.difficulty);
                    return (
                      <div key={index} className="wrong-answer-card">
                        <div className="wrong-answer-header">
                          <span className="wrong-answer-number">{q.questionNumber}번</span>
                          <span className="wrong-answer-area">{q.area}</span>
                        </div>
                        <div className="wrong-answer-content">
                          {getQuestionContent(submission?.test_type, q.questionNumber)}
                        </div>
                        <div className="wrong-answer-meta">
                          <div className="meta-item">
                            <span className="meta-label">난이도</span>
                            <span className="meta-value" style={{ color: diffInfo.color }}>
                              {diffInfo.label} {diffInfo.text}
                            </span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">배점</span>
                            <span className="meta-value">{getQuestionScore(submission?.test_type, q.questionNumber, q.score)}점</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* 학습 분석 및 코멘트 */}
        {report?.dynamic_comments?.area_comments && Object.keys(report.dynamic_comments.area_comments).length > 0 && (
          <div className="report-section">
            <h2 className="section-title">영역별 학습 분석</h2>
            <div className="comments-container">
              {Object.entries(report.dynamic_comments.area_comments)
                .filter(([area]) => !['종합 분석', '강점 영역', '약점 영역', '학습 우선순위', '난이도별 분석'].includes(area))
                .map(([area, commentData], index) => {
                  // 레벨을 대문자로 정규화하여 비교
                  const levelUpper = commentData.level?.toUpperCase();
                  const levelLabel = levelUpper === 'EXCELLENT' ? '우수' :
                                     levelUpper === 'GOOD' ? '양호' :
                                     levelUpper === 'AVERAGE' ? '보통' :
                                     levelUpper === 'WEAK' ? '미흡' :
                                     levelUpper === 'CRITICAL' ? '취약' : '보통';
                  return (
                    <div key={index} className="comment-card">
                      <div className="comment-header">
                        <span className="comment-area">{area}</span>
                        {commentData.level && (
                          <span className={`comment-level level-${commentData.level?.toLowerCase()}`}>
                            {levelLabel}
                          </span>
                        )}
                      </div>
                      <p className="comment-text">{commentData.comment || commentData}</p>
                      {commentData.learningTips && commentData.learningTips.length > 0 && (
                        <div className="learning-tips">
                          <strong>학습 팁:</strong>
                          <ul>
                            {commentData.learningTips.map((tip, tipIndex) => (
                              <li key={tipIndex}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 종합 분석 */}
        {report?.dynamic_comments?.area_comments && (
          <div className="report-section">
            <h2 className="section-title">종합 분석</h2>
            <div className="summary-comments">
              {report.dynamic_comments.area_comments['종합 분석'] && (
                <div className="summary-item-block">
                  <p>{typeof report.dynamic_comments.area_comments['종합 분석'] === 'object'
                      ? report.dynamic_comments.area_comments['종합 분석'].comment
                      : report.dynamic_comments.area_comments['종합 분석']}</p>
                </div>
              )}
              {report.dynamic_comments.area_comments['강점 영역'] && (
                <div className="summary-item-block strength">
                  <strong>강점 영역</strong>
                  <p>{typeof report.dynamic_comments.area_comments['강점 영역'] === 'object'
                      ? report.dynamic_comments.area_comments['강점 영역'].comment
                      : report.dynamic_comments.area_comments['강점 영역']}</p>
                </div>
              )}
              {report.dynamic_comments.area_comments['약점 영역'] && (
                <div className="summary-item-block weakness">
                  <strong>약점 영역</strong>
                  <p>{typeof report.dynamic_comments.area_comments['약점 영역'] === 'object'
                      ? report.dynamic_comments.area_comments['약점 영역'].comment
                      : report.dynamic_comments.area_comments['약점 영역']}</p>
                </div>
              )}
              {report.dynamic_comments.area_comments['학습 우선순위'] && (
                <div className="summary-item-block priority">
                  <strong>학습 우선순위</strong>
                  <p>{typeof report.dynamic_comments.area_comments['학습 우선순위'] === 'object'
                      ? report.dynamic_comments.area_comments['학습 우선순위'].comment
                      : report.dynamic_comments.area_comments['학습 우선순위']}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 학습 로드맵 */}
        {report?.dynamic_comments?.roadmap && (
          <div className="report-section">
            <h2 className="section-title">맞춤 학습 로드맵</h2>
            <div className="roadmap-container">
              {report.dynamic_comments.roadmap.phases?.map((phase, index) => (
                <div key={index} className="roadmap-phase">
                  <div className="phase-header">
                    <span className="phase-number">{index + 1}단계</span>
                    <span className="phase-title">{phase.title}</span>
                    {phase.duration && <span className="phase-duration">{phase.duration}</span>}
                  </div>
                  {phase.description && <p className="phase-description">{phase.description}</p>}
                  {phase.tasks && phase.tasks.length > 0 && (
                    <ul className="phase-tasks">
                      {phase.tasks.map((task, taskIndex) => (
                        <li key={taskIndex}>{task}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
