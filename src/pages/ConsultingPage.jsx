// src/pages/ConsultingPage.jsx - 진단검사 플로우 통합 (완성본)
import { useState } from 'react';
import { supabase } from '../utils/supabase'; // ⭐ 이 줄 추가!
import { useConsulting } from '../context/ConsultingContext';
import PhoneVerification from '../components/consulting/PhoneVerification';
import ConsultingInfoForm from '../components/consulting/ConsultingInfoForm';
import DateSelector from '../components/consulting/DateSelector';
import TimeSelector from '../components/consulting/TimeSelector';
import ConsultingComplete from '../components/consulting/ConsultingComplete';
import ConsultingCheck from '../components/consulting/ConsultingCheck';
import ConsultingResult from '../components/consulting/ConsultingResult';
// ⭐ 진단검사 컴포넌트 import
import TestMethodSelector from '../components/consulting/TestMethodSelector';
import TestDateSelector from '../components/consulting/TestDateSelector';
import TestTimeSelector from '../components/consulting/TestTimeSelector';
import TestComplete from '../components/consulting/TestComplete';

export default function ConsultingPage() {
  const [step, setStep] = useState('home');
  const [phone, setPhone] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [completedReservation, setCompletedReservation] = useState(null);
  const [checkedReservation, setCheckedReservation] = useState(null);
  // ⭐ 진단검사 예약 정보
  const [completedTestReservation, setCompletedTestReservation] =
    useState(null);
  // ⭐ 진단검사 마감 동의
  const [agreed, setAgreed] = useState(false);
  // ⭐ 진단검사 가능 날짜 미리보기
  const [testPreviewDates, setTestPreviewDates] = useState([]);

  const {
    createConsultingReservation,
    selectedDate,
    selectedTime,
    selectedLocation,
    setSelectedSeminarId,
    loadAvailableDates,
    // ⭐ 진단검사 관련
    loadTestMethod,
    loadAvailableTestDates,
    availableTestDates, // ⭐ 추가
    selectedTestDate,
    selectedTestTime,
    testTimeSlots,
    loadTestTimeSlots,
    createTestReservation,
    showToast,
  } = useConsulting();

  // ========================================
  // 컨설팅 예약 플로우 (기존)
  // ========================================

  // 설명회 예약자 플로우
  const handleAttendeeNext = async (phoneNumber, attendeeData) => {
    setPhone(phoneNumber);
    setUserInfo(attendeeData);

    // 설명회 ID 설정 (시간 슬롯 조회에 사용)
    setSelectedSeminarId(attendeeData.linkedSeminarId);

    // ⭐ 진단검사 방식 및 가능 날짜 미리 로드
    try {
      const testMethodResult = await loadTestMethod(attendeeData.location);

      // onsite(학원 방문)인 경우만 날짜 미리보기 제공
      if (testMethodResult === 'onsite') {
        const today = new Date().toISOString().split('T')[0];

        // 모든 진단검사 가능 날짜/시간 조회 (컨설팅 날짜 제약 없이)
        const { data: testSlots } = await supabase
          .from('test_slots')
          .select('date, time')
          .eq('location', attendeeData.location)
          .eq('status', 'active')
          .gte('date', today)
          .order('date', { ascending: true })
          .order('time', { ascending: true });

        if (testSlots && testSlots.length > 0) {
          // 날짜와 시간 모두 포함
          setTestPreviewDates(testSlots);
        }
      }
    } catch (error) {
      console.error('진단검사 일정 로드 실패:', error);
      // 에러가 나도 예약 플로우는 계속 진행
    }

    // 캠페인 ID로 날짜 로드 (location이 아닌 linked_seminar_id 사용)
    await loadAvailableDates(attendeeData.linkedSeminarId, true);

    setStep('date');
  };

  // 미예약자 플로우
  const handlePhoneNext = (phoneNumber) => {
    setPhone(phoneNumber);
    setUserInfo(null);
    setStep('info');
  };

  // 개인정보 입력 완료
  const handleInfoNext = async (infoData) => {
    setUserInfo(infoData);

    // ⭐ 진단검사 방식 및 가능 날짜 미리 로드
    try {
      const testMethodResult = await loadTestMethod(infoData.location);

      // onsite(학원 방문)인 경우만 날짜 미리보기 제공
      if (testMethodResult === 'onsite') {
        const today = new Date().toISOString().split('T')[0];

        // 모든 진단검사 가능 날짜/시간 조회 (컨설팅 날짜 제약 없이)
        const { data: testSlots } = await supabase
          .from('test_slots')
          .select('date, time')
          .eq('location', infoData.location)
          .eq('status', 'active')
          .gte('date', today)
          .order('date', { ascending: true })
          .order('time', { ascending: true });

        if (testSlots && testSlots.length > 0) {
          // 날짜와 시간 모두 포함
          setTestPreviewDates(testSlots);
        }
      }
    } catch (error) {
      console.error('진단검사 일정 로드 실패:', error);
      // 에러가 나도 예약 플로우는 계속 진행
    }

    // 지역이 선택되어 있으므로 날짜 로드
    await loadAvailableDates(infoData.location);

    setStep('date');
  };

  const handleDateNext = () => {
    setStep('time');
  };

  const handleTimeNext = async () => {
    try {
      const reservation = await createConsultingReservation({
        parentPhone: phone,
        studentName: userInfo.studentName,
        school: userInfo.school,
        grade: userInfo.grade,
        mathLevel: userInfo.mathLevel,
        password: userInfo.password, // ⭐ 비밀번호 추가
        isSeminarAttendee: userInfo.isSeminarAttendee || false,
        linkedSeminarId: userInfo.linkedSeminarId || null,
        privacyConsent: userInfo.isSeminarAttendee ? null : 'Y',
        // ⭐ 동의 정보 추가
        testDeadlineAgreed: agreed,
        testDeadlineAgreedAt: agreed ? new Date().toISOString() : null,
      });

      // reservation 객체에 이미 consulting_slots가 join되어 있으므로 그대로 사용
      // (실제 DB location 값이 포함되어 있음)
      setCompletedReservation(reservation);
      setStep('complete');
    } catch (error) {
      console.error('예약 실패:', error);
    }
  };

  // ========================================
  // ⭐ 진단검사 예약 플로우 (신규)
  // ========================================

  // 진단검사 예약 시작 (컨설팅 완료 → 진단검사 방식 선택 or 날짜 선택)
  const handleStartTestReservation = async () => {
    // 예약 정보가 있는지 확인
    const reservation = completedReservation || checkedReservation;

    if (!reservation) {
      showToast('예약 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    const location = reservation.consulting_slots.location;
    const consultingDate = reservation.consulting_slots.date;

    // 사용자 정보 설정 (없는 경우)
    if (!userInfo) {
      setUserInfo({
        studentName: reservation.student_name,
        school: reservation.school,
        grade: reservation.grade,
        location: location,
      });
    }

    // 전화번호 설정 (없는 경우)
    if (!phone) {
      setPhone(reservation.parent_phone);
    }

    // completedReservation 설정 (없는 경우)
    if (!completedReservation) {
      setCompletedReservation(reservation);
    }

    // ⭐ campaign의 test_method 확인
    const seminarId = reservation.linked_seminar_id;
    let testMethod = 'home'; // 기본값

    if (seminarId) {
      const { data: campaign } = await supabase
        .from('seminars')
        .select('test_method')
        .eq('id', seminarId)
        .single();

      testMethod = campaign?.test_method || 'home';
    }

    // test_method에 따라 분기
    if (testMethod === 'both') {
      // 방문/가정 선택 화면으로
      await loadAvailableTestDates(location, consultingDate);
      setStep('test-method-select');
    } else if (testMethod === 'onsite') {
      // 바로 방문 테스트 날짜 선택으로
      await loadAvailableTestDates(location, consultingDate);
      setStep('test-date');
    } else {
      // 가정 테스트 - TestGuide 페이지로 리다이렉트
      window.location.href = `/test-guide?phone=${encodeURIComponent(
        reservation.parent_phone
      )}&name=${encodeURIComponent(reservation.student_name)}&verified=true`;
    }
  };

  // 진단검사 날짜 선택 완료
  const handleTestDateNext = async () => {
    // TestDateSelector에서 이미 loadTestTimeSlots를 호출했으므로
    // 여기서는 그냥 step만 변경
    setStep('test-time');
  };

  // 진단검사 시간 선택 완료 → 예약 생성
  const handleTestTimeNext = async () => {
    try {
      const reservation = completedReservation || checkedReservation;
      const location = reservation.consulting_slots.location;

      // ⭐ 이미 진단검사 예약이 있는지 확인
      const { data: existingTest } = await supabase
        .from('test_reservations')
        .select('id')
        .eq('consulting_reservation_id', reservation.id)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (existingTest) {
        showToast('이미 진단검사 예약이 완료되었습니다.', 'warning');
        // 기존 예약 정보 로드
        const { data: testReservation } = await supabase
          .from('test_reservations')
          .select('*, test_slots(*)')
          .eq('id', existingTest.id)
          .single();

        setCompletedTestReservation(testReservation);
        setStep('test-complete');
        return;
      }

      // ⭐ 선택한 시간의 슬롯 정보 찾기
      const selectedSlot = testTimeSlots.find((slot) => {
        const slotTime = slot.time.slice(0, 5);
        return slotTime === selectedTestTime;
      });

      if (!selectedSlot) {
        showToast('선택한 시간 슬롯을 찾을 수 없습니다.', 'error');
        return;
      }

      const testReservation = await createTestReservation({
        slotId: selectedSlot.id,
        consultingReservationId: reservation.id,
        parentPhone: phone,
        studentName: userInfo.studentName,
        location: location,
      });

      const testReservationWithSlot = {
        ...testReservation,
        test_slots: {
          date: selectedTestDate,
          time: selectedTestTime + ':00',
          location: location,
        },
      };

      setCompletedTestReservation(testReservationWithSlot);
      setStep('test-complete');
    } catch (error) {
      console.error('진단검사 예약 실패:', error);
      showToast('진단검사 예약 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 진단검사 방식 선택: 방문 선택
  const handleSelectOnsite = () => {
    setStep('test-date');
  };

  // 진단검사 방식 선택: 가정 선택
  const handleSelectHome = () => {
    const reservation = completedReservation || checkedReservation;
    window.location.href = `/test-guide?phone=${encodeURIComponent(
      reservation.parent_phone
    )}&name=${encodeURIComponent(reservation.student_name)}&verified=true`;
  };

  // ========================================
  // 공통 핸들러
  // ========================================

  const handleCheckResult = (reservation) => {
    setCheckedReservation(reservation);
    setStep('result');
  };

  const handleHome = () => {
    setStep('home');
    setPhone('');
    setUserInfo(null);
    setCompletedReservation(null);
    setCheckedReservation(null);
    setCompletedTestReservation(null);
  };

  const handleCheckReservation = () => {
    setStep('check');
  };

  // ========================================
  // 렌더링
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 홈 화면 */}
        {step === 'home' && (
          <div className="card">
            <div className="title-area">
              <img
                src="/assets/images/istudy-logo.png"
                alt="i.study"
                className="logo"
              />
              <h1>수학의 아침 X i.study</h1>
            </div>

            <h2>개별 컨설팅 예약</h2>

            <div className="info-box" style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
                • <strong>컨설팅 시간:</strong> 지역별 상이
                <br />• <strong>소요 시간:</strong> 약 30분
                <br />• <strong>장소:</strong> 선택하신 학원
              </p>
            </div>

            <button
              onClick={() => setStep('phone')}
              className="btn btn-primary"
              style={{ marginBottom: '10px' }}
            >
              컨설팅 예약하기
            </button>

            <button
              onClick={handleCheckReservation}
              className="btn btn-secondary"
            >
              예약 확인/취소
            </button>
          </div>
        )}

        {/* 전화번호 입력 */}
        {step === 'phone' && (
          <div className="card">
            <button onClick={handleHome} className="btn-back">
              ← 뒤로
            </button>

            <h1>컨설팅 예약하기</h1>
            <h2>본인 확인</h2>

            <PhoneVerification
              onNext={handlePhoneNext}
              onAttendeeNext={handleAttendeeNext}
            />
          </div>
        )}

        {/* 개인정보 입력 (미예약자) */}
        {step === 'info' && (
          <div className="card">
            <h1>컨설팅 예약하기</h1>
            <h2>참석자 정보 입력</h2>

            <ConsultingInfoForm
              phone={phone}
              onNext={handleInfoNext}
              onBack={() => setStep('phone')}
            />
          </div>
        )}

        {/* 컨설팅 날짜 선택 */}
        {step === 'date' && (
          <div className="card">
            <h1 className="mb-6">컨설팅 예약하기</h1>

            {userInfo?.isSeminarAttendee && (
              <div style={{ maxWidth: '800px', margin: '0 auto 1.5rem auto' }}>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">✅</span>
                    <span className="font-bold text-gray-800">
                      설명회 예약자 전용
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ml-7">
                    <strong>{userInfo.location}</strong> 전용 컨설팅 날짜만
                    표시됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* ⭐ 진단검사 일정 안내 (모든 사용자에게 표시) */}
            {testPreviewDates.length > 0 && (
              <div style={{ maxWidth: '800px', margin: '0 auto 1.5rem auto' }}>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📝</span>
                    <span className="font-bold text-blue-800">
                      진단검사 일정 안내 (소요시간: 80분)
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    컨설팅을 위해 사전 진단검사가 필수입니다.<br />
                    <strong className="text-blue-700">진단검사는 컨설팅 날짜 이전에 완료</strong>해야 하므로,<br />
                    아래 진단검사 가능 일정을 확인하여 컨설팅 날짜를 선택해주세요.
                  </p>
                  <div className="bg-white rounded p-3 mt-2">
                    <p className="text-xs text-gray-600 mb-2">진단검사 가능 일정:</p>
                    <div className="space-y-1">
                      {testPreviewDates.slice(0, 5).map((slot, index) => {
                        const dateObj = new Date(slot.date);
                        const month = dateObj.getMonth() + 1;
                        const day = dateObj.getDate();
                        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                        const dayName = dayNames[dateObj.getDay()];
                        const timeStr = slot.time.slice(0, 5);

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {month}/{day}({dayName}) {timeStr}
                            </span>
                          </div>
                        );
                      })}
                      {testPreviewDates.length > 5 && (
                        <p className="text-xs text-gray-500 mt-1">
                          외 {testPreviewDates.length - 5}개 일정 더 있음
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 컨설팅 날짜를 먼저 선택하시면, 그 이전 날짜에 진단검사 예약이 가능합니다.
                  </p>
                </div>
              </div>
            )}

            <DateSelector
              onNext={handleDateNext}
              onBack={() =>
                setStep(userInfo?.isSeminarAttendee ? 'phone' : 'info')
              }
            />
          </div>
        )}

        {/* 컨설팅 시간 선택 */}
        {step === 'time' && (
          <div className="card">
            <h1>컨설팅 예약하기</h1>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm space-y-1">
                <div>
                  <strong>학생명:</strong> {userInfo?.studentName}
                </div>
                <div>
                  <strong>학교:</strong> {userInfo?.school}
                </div>
                <div>
                  <strong>학년:</strong> {userInfo?.grade}
                </div>
                <div>
                  <strong>수학 선행정도:</strong> {userInfo?.mathLevel || '상담 시 확인'}
                </div>
                <div>
                  <strong>지역:</strong> {selectedLocation}
                </div>
              </div>
            </div>

            <TimeSelector
              onNext={handleTimeNext}
              onBack={() => setStep('date')}
              agreed={agreed}
              onAgreeChange={setAgreed}
            />
          </div>
        )}

        {/* 컨설팅 예약 완료 */}
        {step === 'complete' && (
          <div className="card">
            <ConsultingComplete
              reservation={completedReservation}
              onHome={handleHome}
              onTestReservation={handleStartTestReservation}
            />
          </div>
        )}

        {/* ⭐ 진단검사 방식 선택 */}
        {step === 'test-method-select' && (
          <div className="card">
            <h1 className="mb-6">진단검사 예약하기</h1>

            <TestMethodSelector
              testSlotsAvailable={availableTestDates.length > 0}
              onSelectOnsite={handleSelectOnsite}
              onSelectHome={handleSelectHome}
              onBack={() => setStep('complete')}
            />
          </div>
        )}

        {/* ⭐ 진단검사 날짜 선택 */}
        {step === 'test-date' && (
          <div className="card">
            <h1 className="mb-6">진단검사 예약하기</h1>

            <TestDateSelector
              consultingDate={
                (completedReservation || checkedReservation)?.consulting_slots
                  ?.date
              }
              location={
                (completedReservation || checkedReservation)?.consulting_slots
                  ?.location
              }
              onNext={handleTestDateNext}
              onBack={() => setStep('complete')}
            />
          </div>
        )}

        {/* ⭐ 진단검사 시간 선택 */}
        {step === 'test-time' && (
          <div className="card">
            <h1 className="mb-6">진단검사 예약하기</h1>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm space-y-1">
                <div>
                  <strong>학생명:</strong> {userInfo?.studentName}
                </div>
                <div>
                  <strong>지역:</strong>{' '}
                  {(completedReservation || checkedReservation)
                    ?.consulting_slots?.location || selectedLocation}
                </div>
              </div>
            </div>

            <TestTimeSelector
              onNext={handleTestTimeNext}
              onBack={() => setStep('test-date')}
            />
          </div>
        )}

        {/* ⭐ 진단검사 예약 완료 */}
        {step === 'test-complete' && (
          <div className="card">
            <TestComplete
              testReservation={completedTestReservation}
              consultingReservation={completedReservation || checkedReservation}
              onHome={handleHome}
            />
          </div>
        )}

        {/* 예약 확인 */}
        {step === 'check' && (
          <div className="card">
            <button onClick={handleHome} className="btn-back">
              ← 뒤로
            </button>

            <h1>예약 확인/취소</h1>

            <ConsultingCheck onBack={handleHome} onResult={handleCheckResult} />
          </div>
        )}

        {/* 예약 조회 결과 */}
        {step === 'result' && (
          <div className="card">
            <ConsultingResult
              reservation={checkedReservation}
              onBack={() => setStep('check')}
              onHome={handleHome}
              onStartTestReservation={handleStartTestReservation}
            />
          </div>
        )}
      </div>
    </div>
  );
}
