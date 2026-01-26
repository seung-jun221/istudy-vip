import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import {
  getActiveDiagnosticTests,
  submitManualGrading,
  submitCTManualGrading,
} from '../../utils/diagnosticService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { CT_TEST_CONFIG, calculateCTResults } from '../../data/ctTestConfig';
import './DiagnosticGrading.css';

export default function DiagnosticGrading() {
  const { showToast } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  // 시험 목록
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);

  // 전달받은 학생 정보 확인
  const passedStudentInfo = location.state;

  // 학생 정보
  const [studentInfo, setStudentInfo] = useState({
    studentName: passedStudentInfo?.studentName || '',
    parentPhone: passedStudentInfo?.parentPhone || '',
    school: passedStudentInfo?.school || '',
    grade: passedStudentInfo?.grade || '',
    mathLevel: passedStudentInfo?.mathLevel || '',
  });

  // 문항별 O/X (null: 미선택, true: O, false: X) - MONO/DI/TRI용
  const [questionResults, setQuestionResults] = useState(Array(25).fill(null));

  // CT 전용: 문항별 득점 (0.5점 단위)
  const [ctScores, setCtScores] = useState({});

  // UI 상태 - 학생 정보가 전달되었으면 시험 선택 단계부터 시작
  const [currentStep, setCurrentStep] = useState(passedStudentInfo ? 'test-select' : 'info'); // 'info' | 'test-select' | 'grading' | 'result'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // CT 테스트 여부 확인
  const isCTTest = selectedTest?.test_type === 'CT';

  // 시험 목록 로드
  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const testsData = await getActiveDiagnosticTests();
      setTests(testsData);
    } catch (error) {
      console.error('시험 목록 로드 실패:', error);
      showToast('시험 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  const handleStudentInfoChange = (field, value) => {
    setStudentInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextFromInfo = () => {
    // 유효성 검사
    if (studentInfo.studentName.length < 2) {
      showToast('학생명을 정확히 입력해주세요.', 'error');
      return;
    }

    if (!/^010\d{8}$/.test(studentInfo.parentPhone.replace(/-/g, ''))) {
      showToast('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    if (!studentInfo.grade) {
      showToast('학년을 선택해주세요.', 'error');
      return;
    }

    setCurrentStep('test-select');
  };

  const handleSelectTest = (test) => {
    setSelectedTest(test);
    // 테스트 유형에 따라 상태 초기화
    if (test.test_type === 'CT') {
      setCtScores({});
    } else {
      setQuestionResults(Array(25).fill(null));
    }
    setCurrentStep('grading');
  };

  // CT 전용: 점수 입력 핸들러
  const handleCtScoreChange = (questionNum, value) => {
    const question = CT_TEST_CONFIG.questions.find(q => q.num === questionNum);
    if (!question) return;

    let score = parseFloat(value) || 0;

    // 범위 및 단위 검증
    if (score < 0) score = 0;
    if (score > question.maxScore) score = question.maxScore;

    // 0.5점 단위로 반올림
    score = Math.round(score * 2) / 2;

    setCtScores(prev => ({ ...prev, [questionNum]: score }));
  };

  // CT 전용: 총점 계산
  const getCtTotalScore = () => {
    return Object.values(ctScores).reduce((sum, score) => sum + (score || 0), 0);
  };

  // CT 전용: 입력 완료 개수
  const getCtFilledCount = () => {
    return Object.keys(ctScores).filter(key => ctScores[key] !== undefined && ctScores[key] !== '').length;
  };

  const handleQuestionToggle = (index) => {
    const newResults = [...questionResults];
    if (newResults[index] === null) {
      newResults[index] = true; // 미선택 → O
    } else if (newResults[index] === true) {
      newResults[index] = false; // O → X
    } else {
      newResults[index] = null; // X → 미선택
    }
    setQuestionResults(newResults);
  };

  const handleMarkAllCorrect = () => {
    setQuestionResults(Array(25).fill(true));
    showToast('모든 문항을 정답으로 표시했습니다.', 'success');
  };

  const handleMarkAllWrong = () => {
    setQuestionResults(Array(25).fill(false));
    showToast('모든 문항을 오답으로 표시했습니다.', 'success');
  };

  const handleSubmit = async () => {
    // CT 테스트와 일반 테스트 분기 처리
    if (isCTTest) {
      // CT: 모든 문항 점수 입력 확인
      const filledCount = getCtFilledCount();
      if (filledCount < 10) {
        showToast(
          `${10 - filledCount}개 문항의 점수가 입력되지 않았습니다. 모두 입력해주세요.`,
          'error'
        );
        return;
      }
    } else {
      // 일반: 모든 문항이 채점되었는지 확인
      const unmarked = questionResults.filter((r) => r === null).length;
      if (unmarked > 0) {
        showToast(
          `${unmarked}개 문항이 아직 채점되지 않았습니다. 모두 채점해주세요.`,
          'error'
        );
        return;
      }
    }

    setLoading(true);

    try {
      let request;

      if (isCTTest) {
        // CT 전용 요청 형식
        const ctResults = calculateCTResults(ctScores);
        request = {
          student_name: studentInfo.studentName,
          parent_phone: studentInfo.parentPhone,
          school: studentInfo.school,
          grade: studentInfo.grade,
          math_level: studentInfo.mathLevel,
          test_type: 'CT',
          scoring_method: 'partial',
          question_scores: ctScores,
          total_score: ctResults.totalScore,
          t_score: ctResults.tScore,
          percentile: ctResults.percentile,
          grade9: ctResults.grade9,
          grade5: ctResults.grade5,
          area_stats: ctResults.areaStats,
          difficulty_stats: ctResults.difficultyStats,
        };
      } else {
        // 일반 테스트 요청 형식
        request = {
          student_name: studentInfo.studentName,
          parent_phone: studentInfo.parentPhone,
          school: studentInfo.school,
          grade: studentInfo.grade,
          math_level: studentInfo.mathLevel,
          test_type: selectedTest.test_type,
          question_results: questionResults.map((isCorrect, index) => ({
            questionNumber: index + 1,
            isCorrect: isCorrect === true,
          })),
        };
      }

      const response = isCTTest
        ? await submitCTManualGrading(request)
        : await submitManualGrading(request);

      if (response.success) {
        setResult(response.result);
        setCurrentStep('result');
        showToast('수동 채점이 완료되었습니다!', 'success');
      } else {
        showToast(response.error || '채점에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('수동 채점 실패:', error);
      showToast('채점 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getMarkedCount = () => {
    return questionResults.filter((r) => r !== null).length;
  };

  const getCorrectCount = () => {
    return questionResults.filter((r) => r === true).length;
  };

  const testInfo = {
    CT: { name: 'CT 개념구조화 테스트', grade: '초5-1 이상', emoji: '📒', color: '#C49A3F', questions: 10, totalScore: 100, scoringMethod: 'partial' },
    MONO: { name: 'MONO 진단검사', grade: '중1-1', emoji: '📗', color: '#4caf50', questions: 25, totalScore: 100, scoringMethod: 'ox' },
    DI: { name: 'DI 진단검사', grade: '중2-1', emoji: '📘', color: '#2196f3', questions: 25, totalScore: 100, scoringMethod: 'ox' },
    TRI: { name: 'TRI 진단검사', grade: '중3-1 + 공통수학1', emoji: '📙', color: '#ff9800', questions: 25, totalScore: 100, scoringMethod: 'ox' },
  };

  const steps = [
    { id: 'info', label: '학생 정보', icon: '👤' },
    { id: 'test-select', label: '시험 선택', icon: '📋' },
    { id: 'grading', label: '채점', icon: '✏️' },
    { id: 'result', label: '완료', icon: '✓' }
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
    <div className="diagnostic-grading-page">
      <div className="grading-container">
        {/* 헤더 */}
        <header className="grading-header">
          <div className="header-top">
            <Button
              variant="secondary"
              onClick={() => navigate('/admin/campaigns')}
              className="back-button"
            >
              ← 관리자 페이지로
            </Button>
          </div>
          <h1 className="grading-title">📋 진단검사 수동 채점</h1>
          <p className="grading-subtitle">
            학생이 지필로 응시한 진단검사를 수동으로 채점할 수 있습니다
          </p>
        </header>

        {/* 진행 단계 */}
        <div className="progress-section">
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

        {/* Step 1: 학생 정보 입력 */}
        {currentStep === 'info' && (
          <div className="grading-step">
            <h2 className="step-title">학생 정보 입력</h2>
            <form className="info-form" onSubmit={(e) => { e.preventDefault(); handleNextFromInfo(); }}>
              <Input
                label="학생명"
                value={studentInfo.studentName}
                onChange={(e) => handleStudentInfoChange('studentName', e.target.value)}
                placeholder="홍길동"
                required
              />

              <Input
                label="학부모 연락처"
                value={studentInfo.parentPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  handleStudentInfoChange('parentPhone', value);
                }}
                placeholder="01012345678"
                maxLength={11}
                required
              />

              <Input
                label="학교"
                value={studentInfo.school}
                onChange={(e) => handleStudentInfoChange('school', e.target.value)}
                placeholder="○○중학교"
              />

              <div className="form-group">
                <label className="form-label">학년 <span className="required">*</span></label>
                <select
                  value={studentInfo.grade}
                  onChange={(e) => handleStudentInfoChange('grade', e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">선택</option>
                  <option value="초1">초등학교 1학년</option>
                  <option value="초2">초등학교 2학년</option>
                  <option value="초3">초등학교 3학년</option>
                  <option value="초4">초등학교 4학년</option>
                  <option value="초5">초등학교 5학년</option>
                  <option value="초6">초등학교 6학년</option>
                  <option value="중1">중학교 1학년</option>
                  <option value="중2">중학교 2학년</option>
                  <option value="중3">중학교 3학년</option>
                  <option value="고1">고등학교 1학년</option>
                  <option value="고2">고등학교 2학년</option>
                  <option value="고3">고등학교 3학년</option>
                </select>
              </div>

              <Input
                label="수학 선행정도"
                value={studentInfo.mathLevel}
                onChange={(e) => handleStudentInfoChange('mathLevel', e.target.value)}
                placeholder="예: 중3 (고1 선행 중)"
              />

              <Button type="submit">다음 단계 →</Button>
            </form>
          </div>
        )}

        {/* Step 2: 시험 선택 */}
        {currentStep === 'test-select' && (
          <div className="grading-step">
            <h2 className="step-title">시험 선택</h2>
            <div className="test-grid">
              {tests.map((test) => {
                const info = testInfo[test.test_type];
                return (
                  <button
                    key={test.id}
                    className="test-card"
                    onClick={() => handleSelectTest(test)}
                  >
                    <div className="test-emoji" style={{ backgroundColor: `${info.color}20` }}>
                      {info.emoji}
                    </div>
                    <h3 className="test-name">{info.name}</h3>
                    <div className="test-grade" style={{ color: info.color }}>
                      {info.grade}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button variant="secondary" onClick={() => setCurrentStep('info')}>
              ← 이전
            </Button>
          </div>
        )}

        {/* Step 3: 채점 */}
        {currentStep === 'grading' && (
          <div className="grading-step">
            {isCTTest ? (
              /* CT 전용 채점 UI */
              <>
                <div className="grading-header-info">
                  <h2 className="step-title">채점: {testInfo.CT.name}</h2>
                  <div className="grading-stats">
                    <span>입력 완료: {getCtFilledCount()}/10</span>
                    <span>총점: {getCtTotalScore().toFixed(1)}점 / 100점</span>
                  </div>
                </div>

                <p className="ct-notice">
                  서술형 문항입니다. 각 문항별 득점을 0.5점 단위로 입력하세요.
                </p>

                <div className="ct-scoring-table">
                  <table>
                    <thead>
                      <tr>
                        <th>문항</th>
                        <th>영역</th>
                        <th>내용</th>
                        <th>배점</th>
                        <th>득점</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CT_TEST_CONFIG.questions.map((q) => (
                        <tr key={q.num} className={ctScores[q.num] !== undefined ? 'filled' : ''}>
                          <td className="q-num">CT.{String(q.num).padStart(2, '0')}</td>
                          <td className="q-area">{q.area}</td>
                          <td className="q-topic">{q.topic}</td>
                          <td className="q-max">{q.maxScore}점</td>
                          <td className="q-score">
                            <input
                              type="number"
                              min="0"
                              max={q.maxScore}
                              step="0.5"
                              value={ctScores[q.num] ?? ''}
                              onChange={(e) => handleCtScoreChange(q.num, e.target.value)}
                              placeholder="점수"
                              className="score-input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3"><strong>총점</strong></td>
                        <td>100점</td>
                        <td><strong>{getCtTotalScore().toFixed(1)}점</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="button-group">
                  <Button variant="secondary" onClick={() => setCurrentStep('test-select')}>
                    ← 시험 다시 선택
                  </Button>
                  <Button onClick={handleSubmit} disabled={getCtFilledCount() < 10 || loading}>
                    {loading ? '채점 중...' : `제출하기 (${getCtFilledCount()}/10)`}
                  </Button>
                </div>
              </>
            ) : (
              /* 일반 테스트 O/X 채점 UI */
              <>
                <div className="grading-header-info">
                  <h2 className="step-title">채점: {selectedTest ? testInfo[selectedTest.test_type].name : ''}</h2>
                  <div className="grading-stats">
                    <span>채점 완료: {getMarkedCount()}/25</span>
                    <span>정답: {getCorrectCount()}</span>
                    <span>오답: {getMarkedCount() - getCorrectCount()}</span>
                  </div>
                </div>

                <div className="quick-actions">
                  <Button variant="secondary" onClick={handleMarkAllCorrect}>
                    전체 정답 표시
                  </Button>
                  <Button variant="secondary" onClick={handleMarkAllWrong}>
                    전체 오답 표시
                  </Button>
                </div>

                <div className="question-grid">
                  {questionResults.map((result, index) => (
                    <button
                      key={index}
                      className={`question-button ${
                        result === null ? 'unmarked' : result === true ? 'correct' : 'wrong'
                      }`}
                      onClick={() => handleQuestionToggle(index)}
                    >
                      <div className="question-number">{index + 1}</div>
                      <div className="question-mark">
                        {result === null ? '?' : result === true ? 'O' : 'X'}
                      </div>
                    </button>
                  ))}
                </div>

                <p className="hint-text">
                  💡 문항을 클릭하여 정답(O)/오답(X)을 표시하세요. (미선택 → O → X 순환)
                </p>

                <div className="button-group">
                  <Button variant="secondary" onClick={() => setCurrentStep('test-select')}>
                    ← 시험 다시 선택
                  </Button>
                  <Button onClick={handleSubmit} disabled={getMarkedCount() < 25 || loading}>
                    {loading ? '채점 중...' : `제출하기 (${getMarkedCount()}/25)`}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: 결과 */}
        {currentStep === 'result' && result && (
          <div className="grading-step">
            <div className="success-badge">✓ 수동 채점 완료</div>
            <h2 className="step-title">채점 결과</h2>

            <div className="result-summary">
              <div className="result-item">
                <div className="result-label">학생명</div>
                <div className="result-value">{studentInfo.studentName}</div>
              </div>
              <div className="result-item">
                <div className="result-label">총점</div>
                <div className="result-value">{result.total_score.toFixed(1)}점</div>
              </div>
              <div className="result-item">
                <div className="result-label">백분위</div>
                <div className="result-value">{result.percentile.toFixed(1)}%</div>
              </div>
              <div className="result-item">
                <div className="result-label">등급</div>
                <div className="result-value">{result.grade9}등급 / {result.grade5}등급</div>
              </div>
            </div>

            <div className="info-box">
              <p>✅ 채점 결과가 저장되었습니다.</p>
              <p>📧 학생에게 결과 보고서가 발송됩니다.</p>
            </div>

            <div className="button-group">
              <Button onClick={() => navigate('/admin/campaigns')}>← 대시보드로 돌아가기</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
