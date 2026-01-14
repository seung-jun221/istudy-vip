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

  // PDF 출력
  const handlePrint = () => {
    window.print();
  };

  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  // 시험 유형 이름
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
      'LOW': { label: '⭐', text: '기본', color: '#4A7C59' },
      'MID': { label: '⭐⭐', text: '중급', color: '#66BB6A' },
      'HIGH': { label: '⭐⭐⭐', text: '심화', color: '#C49A3F' },
      'VERY_HIGH': { label: '⭐⭐⭐⭐', text: '고급', color: '#FF7043' },
      'EXTREME': { label: '⭐⭐⭐⭐⭐', text: '최고급', color: '#A85454' }
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

  // 검사 유형별 평균/표준편차 데이터
  const getTestStats = (testType) => {
    const stats = {
      'MONO': { average: 45, stdDev: 22 },
      'DI': { average: 47, stdDev: 20 },
      'TRI': { average: 42, stdDev: 24 }
    };
    return stats[testType] || { average: 45, stdDev: 20 };
  };

  // 예상 등급 계산
  const getPredictedGrade = (grade9) => {
    if (grade9 <= 2) return `${grade9}~${Math.min(grade9 + 1, 3)}`;
    if (grade9 <= 4) return `${grade9 - 1}~${grade9}`;
    if (grade9 <= 6) return `${grade9}~${grade9 + 1}`;
    return `${grade9 - 1}~${grade9}`;
  };

  // T-Score 기반 평가 레벨
  const getTScoreEvaluation = (tScore) => {
    if (tScore >= 70) return { label: '최상', className: 'excellent' };
    if (tScore >= 60) return { label: '우수', className: 'good' };
    if (tScore >= 40) return { label: '보통', className: 'average' };
    if (tScore >= 30) return { label: '주의', className: 'weak' };
    return { label: '위험', className: 'critical' };
  };

  // 5등급 색상
  const get5GradeColor = (grade) => {
    const colors = { 1: '#4A7C59', 2: '#66BB6A', 3: '#C49A3F', 4: '#FF7043', 5: '#A85454' };
    return colors[grade] || '#999';
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

  return (
    <div className="report-page">
      {/* PDF 출력 버튼 */}
      <div className="print-button-container">
        <button className="print-button" onClick={handlePrint}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
          </svg>
          PDF 출력
        </button>
      </div>

      <div className="report-document">
        {/* ========================================
            표지 (Cover Page)
            ======================================== */}
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

        {/* ========================================
            간지 1: 성적 분석
            ======================================== */}
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

        {/* ========================================
            성적 분석 페이지 1: 종합 성적
            ======================================== */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            {/* 학생 정보 */}
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

            {/* 종합 성적 */}
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

              {/* 정규분포 그래프 */}
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
              <span className="page-number">1</span>
            </div>
          </div>
        </div>

        {/* ========================================
            성적 분석 페이지 2: 영역별 성적
            ======================================== */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            {/* 영역별 성적 */}
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

            {/* T-Score 프로필 차트 */}
            <div className="chart-container">
              <div className="chart-title">자기주도 학습역량 주요 요인 프로파일</div>
              <TScoreBarChart areaResults={data.area_results} />
            </div>

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">2</span>
            </div>
          </div>
        </div>

        {/* ========================================
            성적 분석 페이지 3: 난이도별 정답률 & 문항별 결과
            ======================================== */}
        <div className="page content-page">
          <div className="page-content">
            <div className="page-header">
              <span className="page-header-logo">i.STUDY</span>
              <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
            </div>

            {/* 난이도별 정답률 */}
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
                      <div
                        className={`difficulty-bar-fill ${classNames[diff.difficulty]}`}
                        style={{ width: `${diff.correctRate}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 문항별 결과 */}
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
              <span className="page-number">3</span>
            </div>
          </div>
        </div>

        {/* ========================================
            오답 문항 분석 (오답이 있는 경우에만)
            ======================================== */}
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
                <span className="page-number">4</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            간지 2: 경쟁력 분석
            ======================================== */}
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

        {/* ========================================
            경쟁력 분석 페이지
            ======================================== */}
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

            <div className="section-title">
              <span className="section-title-icon">🎯</span>
              <span className="section-title-text">맞춤 학습 전략 가이드</span>
              <div className="section-title-line"></div>
            </div>

            <LearningStrategyGuide
              grade9={data.grade9}
              studentGrade={submission?.grade}
              testType={submission?.test_type}
            />

            <div className="page-footer">
              <span>i.study 수리탐구 진단검사</span>
              <span className="page-number">{wrongAnswers.length > 0 ? '5' : '4'}</span>
            </div>
          </div>
        </div>

        {/* ========================================
            간지 3: 학습 분석
            ======================================== */}
        {report?.dynamic_comments?.area_comments && (
          <>
            <div className="page divider-page">
              <div className="divider-number">03</div>
              <h2 className="divider-title">학습 분석</h2>
              <p className="divider-subtitle">LEARNING ANALYSIS</p>
              <div className="divider-gold-line"></div>
              <p className="divider-description">
                영역별 학습 분석과 종합 평가를 통해<br/>
                효과적인 학습 방향을 안내합니다.
              </p>
            </div>

            {/* ========================================
                학습 분석 페이지
                ======================================== */}
            <div className="page content-page">
              <div className="page-content">
                <div className="page-header">
                  <span className="page-header-logo">i.STUDY</span>
                  <span className="page-header-info">{submission?.student_name} | {getTestTypeName(submission?.test_type)}</span>
                </div>

                {/* 영역별 학습 분석 */}
                <div className="section-title">
                  <span className="section-title-icon">📚</span>
                  <span className="section-title-text">영역별 학습 분석</span>
                  <div className="section-title-line"></div>
                </div>

                <div className="comments-grid">
                  {Object.entries(report.dynamic_comments.area_comments)
                    .filter(([area]) => !['종합 분석', '강점 영역', '약점 영역', '학습 우선순위', '난이도별 분석'].includes(area))
                    .slice(0, 4)
                    .map(([area, commentData], index) => {
                      const levelUpper = commentData.level?.toUpperCase();
                      const levelLabel = levelUpper === 'EXCELLENT' ? '우수' :
                                        levelUpper === 'GOOD' ? '양호' :
                                        levelUpper === 'AVERAGE' ? '보통' :
                                        levelUpper === 'WEAK' ? '미흡' :
                                        levelUpper === 'CRITICAL' ? '취약' : '보통';
                      const levelClass = levelUpper?.toLowerCase() || 'average';
                      return (
                        <div key={index} className="comment-card">
                          <div className="comment-header">
                            <span className="comment-area">{area}</span>
                            {commentData.level && (
                              <span className={`comment-level ${levelClass}`}>
                                {levelLabel}
                              </span>
                            )}
                          </div>
                          <p className="comment-text">{commentData.comment || commentData}</p>
                        </div>
                      );
                    })}
                </div>

                <div className="page-footer">
                  <span>i.study 수리탐구 진단검사</span>
                  <span className="page-number">{wrongAnswers.length > 0 ? '6' : '5'}</span>
                </div>
              </div>
            </div>

            {/* ========================================
                종합 분석 페이지
                ======================================== */}
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

                {/* 학습 로드맵 */}
                {report.dynamic_comments?.roadmap?.phases && (
                  <>
                    <div className="section-title" style={{ marginTop: '30px' }}>
                      <span className="section-title-icon">🗺️</span>
                      <span className="section-title-text">맞춤 학습 로드맵</span>
                      <div className="section-title-line"></div>
                    </div>

                    <div className="roadmap-container">
                      <div className="roadmap-line"></div>
                      {report.dynamic_comments.roadmap.phases.map((phase, index) => (
                        <div key={index} className="roadmap-phase">
                          <div className="roadmap-dot"></div>
                          <div className="roadmap-phase-header">
                            <span className="roadmap-phase-number">{index + 1}단계</span>
                            <span className="roadmap-phase-title">{phase.title}</span>
                            {phase.duration && <span className="roadmap-phase-duration">{phase.duration}</span>}
                          </div>
                          {phase.description && <p className="roadmap-phase-description">{phase.description}</p>}
                          {phase.tasks && phase.tasks.length > 0 && (
                            <ul className="roadmap-tasks">
                              {phase.tasks.slice(0, 3).map((task, taskIndex) => (
                                <li key={taskIndex}>{task}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="page-footer">
                  <span>i.study 수리탐구 진단검사</span>
                  <span className="page-number">{wrongAnswers.length > 0 ? '7' : '6'}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================
            마지막 페이지 - 안내
            ======================================== */}
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
