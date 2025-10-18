// src/pages/TestGuidePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import './TestGuidePage.css';

export default function TestGuidePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State 관리
  const [step, setStep] = useState('phone'); // phone, newForm, infoConfirm, testSelect, hmeGrade, download, transition
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null); // HME, MONO, TRI, MOCK
  const [selectedHMEGrade, setSelectedHMEGrade] = useState(null);
  const [seminars, setSeminars] = useState([]);
  const [checkboxes, setCheckboxes] = useState({
    check1: false,
    check2: false,
    check3: false,
    check4: false,
  });
  const [countdown, setCountdown] = useState(5);

  // 설명회 로드
  useEffect(() => {
    loadSeminars();
  }, []);

  // ⭐ URL 파라미터로 자동 인증
  useEffect(() => {
    const verifiedParam = searchParams.get('verified');
    const phoneParam = searchParams.get('phone');
    const nameParam = searchParams.get('name');

    if (verifiedParam === 'true' && phoneParam && nameParam) {
      handleAutoVerify(phoneParam, nameParam);
    }
  }, [searchParams]);

  // ⭐ 자동 인증 함수
  const handleAutoVerify = async (phone, name) => {
    setLoading(true);

    try {
      // ⭐ 1. 기존 다운로드 이력 먼저 확인
      const { data: existingTest } = await supabase
        .from('test_applications')
        .select('*')
        .eq('parent_phone', phone)
        .order('id', { ascending: false })
        .limit(1);

      if (existingTest && existingTest.length > 0) {
        const testInfo = existingTest[0];
        const downloadDate = new Date(
          testInfo.downloaded_at
        ).toLocaleDateString('ko-KR');

        if (
          window.confirm(
            `📌 이미 진단검사를 다운로드하신 이력이 있습니다.\n\n` +
              `학생명: ${testInfo.student_name}\n` +
              `다운로드 날짜: ${downloadDate}\n` +
              `검사 유형: ${testInfo.test_type}\n\n` +
              `다시 다운로드하시겠습니까?`
          )
        ) {
          setCurrentUser(testInfo);
          setStep('infoConfirm');
        }
        setLoading(false);
        return;
      }

      // ⭐ 2. 다운로드 이력이 없으면 컨설팅 예약 정보로 진행
      const { data: consultingReservations, error } = await supabase
        .from('consulting_reservations')
        .select('*')
        .eq('parent_phone', phone)
        .eq('student_name', name)
        .eq('status', 'confirmed')
        .order('id', { ascending: false }) // ⭐ created_at → id로 수정
        .limit(1);

      if (error) {
        console.warn('조회 중 오류:', error);
      }

      if (consultingReservations && consultingReservations.length > 0) {
        const userData = consultingReservations[0];

        // ✅ consulting_reservations에서 직접 math_level 사용
        // (컨설팅 예약 시 필수 입력이므로 항상 존재)
        const mathLevel = userData.math_level || '상담 시 확인';

        console.log('✅ 컨설팅 예약 정보:', {
          student_name: userData.student_name,
          math_level: mathLevel,
        });

        setCurrentUser({
          student_name: userData.student_name,
          parent_phone: phone,
          school: userData.school,
          grade: userData.grade,
          math_level: mathLevel,
        });

        setStep('testSelect');
      } else {
        showToast('컨설팅 예약 정보를 찾을 수 없습니다.');
        setStep('phone');
      }
    } catch (error) {
      console.error('자동 인증 실패:', error);
      showToast('인증 중 오류가 발생했습니다.');
      setStep('phone');
    } finally {
      setLoading(false);
    }
  };

  const loadSeminars = async () => {
    try {
      const { data, error } = await supabase
        .from('seminars')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setSeminars(data || []);
    } catch (error) {
      console.error('설명회 로드 실패:', error);
    }
  };

  // 전화번호 포맷
  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 10) {
      return `010-${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    return phone;
  };

  // Toast 메시지
  const showToast = (message, type = 'info') => {
    alert(message); // 간단한 구현, 나중에 Toast 컴포넌트로 교체 가능
  };

  // 본인 확인
  const handlePhoneVerify = async (e) => {
    e.preventDefault();
    const phone = e.target.phoneInput.value;
    const formattedPhone = formatPhone(phone);

    if (!formattedPhone || formattedPhone.length < 13) {
      showToast('올바른 전화번호를 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      // 1. 기존 다운로드 이력 확인
      const { data: existingTest } = await supabase
        .from('test_applications')
        .select('*')
        .eq('parent_phone', formattedPhone)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingTest && existingTest.length > 0) {
        const testInfo = existingTest[0];
        const downloadDate = new Date(
          testInfo.downloaded_at
        ).toLocaleDateString('ko-KR');

        if (
          window.confirm(
            `📌 이미 진단검사를 다운로드하신 이력이 있습니다.\n\n` +
              `학생명: ${testInfo.student_name}\n` +
              `다운로드 날짜: ${downloadDate}\n` +
              `검사 유형: ${testInfo.test_type}${
                testInfo.hme_grade ? ` (${testInfo.hme_grade})` : ''
              }\n\n` +
              `다시 다운로드하시겠습니까?`
          )
        ) {
          setCurrentUser(testInfo);
          setStep('infoConfirm');
        }
        setLoading(false);
        return;
      }

      // 2. 설명회 참석자 확인 (3가지 방법)
      const { data: attendedReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', formattedPhone)
        .eq('status', '참석');

      const { data: testReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', formattedPhone)
        .eq('post_checkin_choice', 'test');

      const { data: testApplications } = await supabase
        .from('test_applications')
        .select('*')
        .eq('parent_phone', formattedPhone);

      const hasTestApplication =
        (testApplications && testApplications.length > 0) ||
        (testReservations && testReservations.length > 0) ||
        (attendedReservations && attendedReservations.length > 0);

      if (!hasTestApplication) {
        showToast('설명회 참석 후 진단검사를 신청하신 분만 이용 가능합니다.');
        setLoading(false);
        return;
      }

      // 사용자 정보 설정
      const userData =
        attendedReservations?.[0] ||
        testReservations?.[0] ||
        testApplications?.[0];

      setCurrentUser({
        student_name: userData.student_name,
        parent_phone: formattedPhone,
        school: userData.school,
        grade: userData.grade,
        math_level: userData.math_level,
      });

      setStep('infoConfirm');
    } catch (error) {
      console.error('확인 실패:', error);
      showToast('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 신규 신청
  const handleNewApplication = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
      seminar_id: formData.get('seminar'),
      student_name: formData.get('name'),
      parent_phone: formatPhone(formData.get('phone')),
      school: formData.get('school'),
      grade: formData.get('grade'),
      math_level: formData.get('mathLevel'),
    };

    if (!data.seminar_id) {
      showToast('설명회를 선택해주세요');
      return;
    }

    setLoading(true);

    try {
      const { data: savedData, error } = await supabase
        .from('test_applications')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      setCurrentUser(savedData || data);
      setStep('infoConfirm');
    } catch (error) {
      console.error('신청 실패:', error);
      showToast('신청 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 시험 선택
  const handleTestSelect = (testType) => {
    setSelectedTest(testType);
    if (testType === 'HME') {
      setStep('hmeGrade');
    } else {
      setStep('download');
    }
  };

  // HME 학년 선택
  const handleHMEGradeSelect = (grade) => {
    setSelectedHMEGrade(grade);
    setTimeout(() => {
      setStep('download');
    }, 300);
  };

  // 다운로드 기록
  const handleDownload = async () => {
    if (!currentUser) return;

    try {
      // ⭐ test_type 값 결정 (HME일 경우 학년 포함)
      const testTypeValue =
        selectedTest === 'HME' && selectedHMEGrade
          ? `${selectedTest}_${selectedHMEGrade}` // 예: "HME_중2"
          : selectedTest; // 예: "MONO", "TRI", "MOCK"

      // ⭐ 1. 기존 레코드 확인
      const { data: existingRecords } = await supabase
        .from('test_applications')
        .select('id')
        .eq('parent_phone', currentUser.parent_phone)
        .eq('test_type', testTypeValue);

      const insertData = {
        parent_phone: currentUser.parent_phone,
        student_name: currentUser.student_name,
        school: currentUser.school || '미입력',
        grade: currentUser.grade || '미입력',
        math_level: currentUser.math_level || '미입력',
        test_type: testTypeValue, // ⭐ 합쳐진 값
        downloaded_at: new Date().toISOString(),
      };

      // ⭐ 2. 이미 같은 시험을 다운로드한 이력이 있으면 UPDATE
      if (existingRecords && existingRecords.length > 0) {
        const { error } = await supabase
          .from('test_applications')
          .update({
            downloaded_at: new Date().toISOString(),
          })
          .eq('id', existingRecords[0].id);

        if (error) throw error;
      } else {
        // ⭐ 3. 없으면 INSERT
        const { error } = await supabase
          .from('test_applications')
          .insert([insertData]);

        if (error) throw error;
      }

      showToast('다운로드가 완료되었습니다!', 'success');
      setStep('transition');
    } catch (error) {
      console.error('다운로드 기록 실패:', error);
      showToast('다운로드 기록 중 오류가 발생했습니다.');
    }
  };

  // 컨설팅 전환 카운트다운
  useEffect(() => {
    if (step === 'transition') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/consulting');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, navigate]);

  // 체크박스 모두 체크 확인
  const allChecked = Object.values(checkboxes).every((v) => v);

  // PDF 다운로드 링크
  const getPDFLink = () => {
    if (selectedTest === 'HME') {
      return `/pdfs/HME_${selectedHMEGrade}.pdf`;
    } else if (selectedTest === 'MONO') {
      return '/pdfs/MONO.pdf';
    } else if (selectedTest === 'TRI') {
      return '/pdfs/TRI.pdf';
    } else if (selectedTest === 'MOCK') {
      return '/pdfs/고1_6월_모의고사.pdf';
    }
    return '#';
  };

  const getSolutionLink = () => {
    if (selectedTest === 'HME') {
      return `/pdfs/HME_${selectedHMEGrade}_solution.pdf`;
    } else if (selectedTest === 'MOCK') {
      return '/pdfs/고1_6월_모의고사_해설.pdf';
    }
    return null;
  };

  // 시험 이름
  const getTestName = () => {
    if (selectedTest === 'HME') {
      return `HME 학력평가 - ${selectedHMEGrade}`;
    } else if (selectedTest === 'MONO') {
      return 'MONO 진단검사';
    } else if (selectedTest === 'TRI') {
      return 'TRI 진단검사';
    } else if (selectedTest === 'MOCK') {
      return '고1 6월 모의고사';
    }
    return '-';
  };

  // 렌더링
  return (
    <div className="test-guide-container">
      <div className="test-guide-header">
        <h1>수학의 아침 X i.study [수리탐구]</h1>
        <p>진단검사 다운로드</p>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>처리 중...</p>
        </div>
      )}

      {/* STEP: 전화번호 확인 */}
      {step === 'phone' && (
        <div className="card">
          <div className="step-indicator">
            <div className="step active">1</div>
            <div className="step-line"></div>
            <div className="step">2</div>
            <div className="step-line"></div>
            <div className="step">3</div>
          </div>

          <h3>본인 확인</h3>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            설명회 참석 후 진단검사를 신청하신 분만 이용 가능합니다.
          </p>

          <form onSubmit={handlePhoneVerify}>
            <div className="form-group">
              <label>학부모 연락처</label>
              <input
                type="tel"
                name="phoneInput"
                placeholder="010-0000-0000"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              확인
            </button>
          </form>

          <div className="divider">
            <span>또는</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              진단검사를 처음 신청하시나요?
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => setStep('newForm')}
            >
              신규 신청하기
            </button>
          </div>
        </div>
      )}

      {/* STEP: 신규 신청 */}
      {step === 'newForm' && (
        <div className="card">
          <button className="btn btn-back" onClick={() => setStep('phone')}>
            ← 뒤로
          </button>
          <h3>진단검사 신청</h3>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            정확한 진단을 위해 정보를 입력해주세요.
          </p>

          <form onSubmit={handleNewApplication}>
            <div className="form-group">
              <label>
                참석하신 설명회 <span style={{ color: 'red' }}>*</span>
              </label>
              <select name="seminar" required>
                <option value="">설명회를 선택해주세요</option>
                {seminars.map((seminar) => {
                  const date = new Date(seminar.date);
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                  const timeStr = seminar.time
                    ? ` ${seminar.time.slice(0, 5)}`
                    : '';
                  return (
                    <option key={seminar.id} value={seminar.id}>
                      {dateStr}
                      {timeStr} - {seminar.location || seminar.title} 설명회
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>학생명</label>
              <input type="text" name="name" required />
            </div>

            <div className="form-group">
              <label>학부모 연락처</label>
              <input
                type="tel"
                name="phone"
                placeholder="010-0000-0000"
                required
              />
            </div>

            <div className="form-group">
              <label>학교</label>
              <input type="text" name="school" required />
            </div>

            <div className="form-group">
              <label>학년</label>
              <select name="grade" required>
                <option value="">선택하세요</option>
                {[
                  '초1',
                  '초2',
                  '초3',
                  '초4',
                  '초5',
                  '초6',
                  '중1',
                  '중2',
                  '중3',
                  '고1',
                  '고2',
                  '고3',
                ].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade.includes('초')
                      ? '초등학교'
                      : grade.includes('중')
                      ? '중학교'
                      : '고등학교'}{' '}
                    {grade.slice(-1)}학년
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>수학 선행정도</label>
              <input
                type="text"
                name="mathLevel"
                placeholder="예: 중2-1 심화 완료"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              다음
            </button>
          </form>
        </div>
      )}

      {/* STEP: 정보 확인 */}
      {step === 'infoConfirm' && currentUser && (
        <div className="card">
          <div className="step-indicator">
            <div className="step completed">✓</div>
            <div className="step-line completed"></div>
            <div className="step active">2</div>
            <div className="step-line"></div>
            <div className="step">3</div>
          </div>

          <h3>신청 정보 확인</h3>

          <div className="info-display">
            <div className="info-item">
              <span className="info-label">학생명:</span>
              <span className="info-value">{currentUser.student_name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">학교:</span>
              <span className="info-value">{currentUser.school}</span>
            </div>
            <div className="info-item">
              <span className="info-label">학년:</span>
              <span className="info-value">{currentUser.grade}</span>
            </div>
            <div className="info-item">
              <span className="info-label">수학 선행:</span>
              <span className="info-value">{currentUser.math_level}</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setStep('testSelect')}
          >
            시험지 선택하기
          </button>
        </div>
      )}

      {/* STEP: 시험 선택 */}
      {step === 'testSelect' && (
        <div className="card">
          <div className="step-indicator">
            <div className="step completed">✓</div>
            <div className="step-line completed"></div>
            <div className="step active">2</div>
            <div className="step-line"></div>
            <div className="step">3</div>
          </div>

          <h3>진단검사 선택</h3>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            학생의 현재 수준에 맞는 시험지를 선택해주세요.
          </p>

          <div className="warning-box" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>
              ⚠️ 자체 진단검사(MONO/TRI) 선택 시 주의사항
            </h4>
            <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
              <li>정답 및 풀이집이 제공되지 않습니다</li>
              <li>작성한 시험지를 컨설팅 시 반드시 지참하세요</li>
              <li>현장에서 채점 후 즉시 분석 진행</li>
            </ul>
          </div>

          <div className="test-selection-grid">
            {/* HME */}
            <div className="test-card" onClick={() => handleTestSelect('HME')}>
              <span className="test-badge badge-recommended">추천</span>
              <div className="test-title">HME 학력평가</div>
              <div className="test-features">
                <div className="feature-item">
                  <span className="feature-icon check">✅</span> 답안지 제공
                </div>
                <div className="feature-item">
                  <span className="feature-icon check">✅</span> 풀이집 제공
                </div>
                <div className="feature-item">
                  <span className="feature-icon info">📚</span> 대상: 초등 ~
                  중등 기초
                </div>
              </div>
              <button className="btn btn-primary">HME 선택하기 →</button>
            </div>

            {/* MONO */}
            <div className="test-card" onClick={() => handleTestSelect('MONO')}>
              <span className="test-badge badge-advanced">심화</span>
              <div className="test-title">MONO 진단검사</div>
              <div className="test-features">
                <div className="feature-item">
                  <span className="feature-icon warn">⚠️</span> 답안지 미제공
                </div>
                <div className="feature-item">
                  <span className="feature-icon warn">⚠️</span> 현장 채점 필수
                </div>
                <div className="feature-item">
                  <span className="feature-icon info">📚</span> 대상: 중1-1 심화
                  완료
                </div>
              </div>
              <button className="btn btn-primary">MONO 선택하기 →</button>
            </div>

            {/* TRI */}
            <div className="test-card" onClick={() => handleTestSelect('TRI')}>
              <span className="test-badge badge-highest">최상위</span>
              <div className="test-title">TRI 진단검사</div>
              <div className="test-features">
                <div className="feature-item">
                  <span className="feature-icon warn">⚠️</span> 답안지 미제공
                </div>
                <div className="feature-item">
                  <span className="feature-icon warn">⚠️</span> 공통수학1 포함
                </div>
                <div className="feature-item">
                  <span className="feature-icon info">📚</span> 대상: 중3-1 심화
                  완료
                </div>
              </div>
              <button className="btn btn-primary">TRI 선택하기 →</button>
            </div>

            {/* MOCK */}
            <div className="test-card" onClick={() => handleTestSelect('MOCK')}>
              <span className="test-badge badge-mock">모의고사</span>
              <div className="test-title">고1 6월 모의고사</div>
              <div className="test-features">
                <div className="feature-item">
                  <span className="feature-icon check">✅</span> 답안지 제공
                </div>
                <div className="feature-item">
                  <span className="feature-icon check">✅</span> 해설 제공
                </div>
                <div className="feature-item">
                  <span className="feature-icon info">📚</span> 대상: 고1 대비
                </div>
              </div>
              <button className="btn btn-primary">MOCK 선택하기 →</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: HME 학년 선택 */}
      {step === 'hmeGrade' && (
        <div className="card">
          <button
            className="btn btn-back"
            onClick={() => setStep('testSelect')}
          >
            ← 뒤로
          </button>

          <h3>HME 학년 선택</h3>
          <p style={{ marginBottom: '10px', color: '#666' }}>
            현재 학년이 아닌, 실력에 맞는 단계를 선택해주세요.
          </p>

          <div className="info-box">
            <strong>선택 기준</strong>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>현재 학년보다 높은 단계 선택 권장</li>
              <li>선행 진도에 맞춰 선택</li>
              <li>확실하지 않으면 낮은 단계부터 시작</li>
            </ul>
          </div>

          <h4 style={{ marginBottom: '10px' }}>초등부</h4>
          <div className="grade-grid">
            {['초1', '초2', '초3', '초4', '초5', '초6'].map((grade) => (
              <button
                key={grade}
                className={`grade-btn ${
                  selectedHMEGrade === grade ? 'selected' : ''
                }`}
                onClick={() => handleHMEGradeSelect(grade)}
              >
                {grade}
              </button>
            ))}
          </div>

          <h4 style={{ margin: '20px 0 10px' }}>중등부</h4>
          <div className="grade-grid">
            {['중1', '중2', '중3'].map((grade) => (
              <button
                key={grade}
                className={`grade-btn ${
                  selectedHMEGrade === grade ? 'selected' : ''
                }`}
                onClick={() => handleHMEGradeSelect(grade)}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: 다운로드 */}
      {step === 'download' && (
        <div className="card">
          <div className="step-indicator">
            <div className="step completed">✓</div>
            <div className="step-line completed"></div>
            <div className="step completed">✓</div>
            <div className="step-line completed"></div>
            <div className="step active">3</div>
          </div>

          <h3>시험지 다운로드</h3>

          <div className="info-display">
            <div className="info-item">
              <span className="info-label">선택한 시험:</span>
              <span className="info-value">{getTestName()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">학생명:</span>
              <span className="info-value">
                {currentUser?.student_name || '-'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">학년:</span>
              <span className="info-value">{currentUser?.grade || '-'}</span>
            </div>
          </div>

          {/* MONO/TRI 체크리스트 */}
          {(selectedTest === 'MONO' || selectedTest === 'TRI') && (
            <div style={{ marginTop: '30px' }}>
              <div className="warning-box">
                <h4 style={{ marginBottom: '15px' }}>📌 진단검사 응시 안내</h4>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: '10px',
                  }}
                >
                  본 진단검사는 과정 성취도 확인이 아닌,{' '}
                  <strong>고등과정 진행 시 이해도를 예측</strong>하는
                  검사입니다. 생소한 문제라도 끝까지 고민해보세요.
                </p>
              </div>

              <h4 style={{ margin: '20px 0 15px' }}>응시 전 확인사항</h4>
              <div className="checklist">
                {Object.keys(checkboxes).map((key, index) => (
                  <div key={key} className="checklist-item">
                    <input
                      type="checkbox"
                      id={key}
                      checked={checkboxes[key]}
                      onChange={(e) =>
                        setCheckboxes({
                          ...checkboxes,
                          [key]: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor={key}>
                      {index === 0 && '답안지가 제공되지 않음을 이해했습니다'}
                      {index === 1 &&
                        '작성한 시험지를 컨설팅 시 지참해야 함을 이해했습니다'}
                      {index === 2 && '90분 시간제한을 지킬 것을 약속합니다'}
                      {index === 3 && '외부 도움 없이 혼자 풀 것을 약속합니다'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="download-section" style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '10px' }}>📥 시험지 다운로드</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              아래 버튼을 클릭하여 시험지를 다운로드하세요
            </p>
            <div className="download-buttons">
              <a
                href={getPDFLink()}
                className="download-btn"
                download
                onClick={handleDownload}
                style={{
                  display:
                    (selectedTest === 'MONO' || selectedTest === 'TRI') &&
                    !allChecked
                      ? 'none'
                      : 'inline-block',
                }}
              >
                📄 시험지 다운로드
              </a>
              {getSolutionLink() && (
                <a
                  href={getSolutionLink()}
                  className="download-btn solution"
                  download
                >
                  📝 풀이집 다운로드
                </a>
              )}
            </div>
          </div>

          <div className="info-box" style={{ marginTop: '30px' }}>
            <h4 style={{ marginBottom: '10px' }}>✅ 다음 단계 안내</h4>
            <ol style={{ marginLeft: '20px', lineHeight: '1.8' }}>
              <li>진단검사를 정해진 시간 내에 응시합니다</li>
              <li>컨설팅 예약 링크가 문자로 발송됩니다</li>
              <li>컨설팅 시 작성한 시험지를 지참합니다</li>
              <li>현장에서 채점 및 분석을 진행합니다</li>
            </ol>
          </div>
        </div>
      )}

      {/* STEP: 컨설팅 전환 */}
      {step === 'transition' && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#333',
                marginBottom: '10px',
              }}
            >
              진단검사 다운로드 완료!
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: '#666',
                marginBottom: '30px',
                lineHeight: '1.6',
              }}
            >
              수고하셨습니다!
              <br />
              진단검사 완료 후 전문 컨설팅을 통해
              <br />
              맞춤형 학습 로드맵을 제공받으세요.
            </p>

            <div className="countdown-box">
              <p
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '10px',
                }}
              >
                컨설팅 예약 페이지로 이동합니다
              </p>
              <div className="countdown-number">{countdown}</div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => navigate('/consulting')}
              style={{ marginTop: '20px' }}
            >
              바로 이동하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
