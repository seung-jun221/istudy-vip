// src/pages/ConsultingPage.jsx - 진단검사 플로우 통합
import { useState } from 'react';
import { useConsulting } from '../context/ConsultingContext';
import PhoneVerification from '../components/consulting/PhoneVerification';
import ConsultingInfoForm from '../components/consulting/ConsultingInfoForm';
import DateSelector from '../components/consulting/DateSelector';
import TimeSelector from '../components/consulting/TimeSelector';
import ConsultingComplete from '../components/consulting/ConsultingComplete';
import ConsultingCheck from '../components/consulting/ConsultingCheck';
import ConsultingResult from '../components/consulting/ConsultingResult';
// ⭐ 진단검사 컴포넌트 import
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

  const {
    createConsultingReservation,
    selectedDate,
    selectedTime,
    selectedLocation,
    loadAvailableDates,
    // ⭐ 진단검사 관련
    loadAvailableTestDates,
    selectedTestDate,
    selectedTestTime,
    testTimeSlots,
    createTestReservation,
    showToast, // ⭐ Toast 메시지용
  } = useConsulting();

  // ========================================
  // 컨설팅 예약 플로우 (기존)
  // ========================================

  // 설명회 예약자 플로우
  const handleAttendeeNext = async (phoneNumber, attendeeData) => {
    setPhone(phoneNumber);
    setUserInfo(attendeeData);

    // 지역이 이미 선택되어 있으므로 바로 날짜 로드
    await loadAvailableDates(attendeeData.location);

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
        isSeminarAttendee: userInfo.isSeminarAttendee || false,
        linkedSeminarId: userInfo.linkedSeminarId || null,
        privacyConsent: userInfo.isSeminarAttendee ? null : 'Y',
      });

      const reservationWithSlot = {
        ...reservation,
        consulting_slots: {
          date: selectedDate,
          time: selectedTime + ':00',
          location: selectedLocation,
        },
      };

      setCompletedReservation(reservationWithSlot);
      setStep('complete');
    } catch (error) {
      console.error('예약 실패:', error);
    }
  };

  // ========================================
  // ⭐ 진단검사 예약 플로우 (신규)
  // ========================================

  // 진단검사 예약 시작 (컨설팅 완료 → 진단검사 날짜 선택)
  const handleStartTestReservation = async () => {
    // 컨설팅 날짜보다 이전 날짜만 로드
    await loadAvailableTestDates(
      selectedLocation,
      completedReservation.consulting_slots.date
    );
    setStep('test-date');
  };

  // 진단검사 날짜 선택 완료
  const handleTestDateNext = () => {
    setStep('test-time');
  };

  // 진단검사 시간 선택 완료 → 예약 생성
  const handleTestTimeNext = async () => {
    try {
      // ⭐ 선택한 시간의 슬롯 정보 찾기
      const selectedSlot = testTimeSlots.find((slot) => {
        const slotTime = slot.time.slice(0, 5); // "10:00:00" → "10:00"
        return slotTime === selectedTestTime;
      });

      console.log('선택한 시간:', selectedTestTime);
      console.log('찾은 슬롯:', selectedSlot);
      console.log('전체 슬롯:', testTimeSlots);

      if (!selectedSlot) {
        showToast('선택한 시간 슬롯을 찾을 수 없습니다.', 'error');
        return;
      }

      const testReservation = await createTestReservation({
        slotId: selectedSlot.id,
        consultingReservationId: completedReservation.id,
        parentPhone: phone,
        studentName: userInfo.studentName,
        location: selectedLocation,
      });

      const testReservationWithSlot = {
        ...testReservation,
        test_slots: {
          date: selectedTestDate,
          time: selectedTestTime + ':00',
          location: selectedLocation,
        },
      };

      setCompletedTestReservation(testReservationWithSlot);
      setStep('test-complete');
    } catch (error) {
      console.error('진단검사 예약 실패:', error);
      showToast('진단검사 예약 처리 중 오류가 발생했습니다.', 'error');
    }
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

        {/* 개인정보 입력 (미예약자만) */}
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

            {/* 예약자 정보 표시 - 심플한 회색 박스 */}
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

            {/* 예약 정보 요약 */}
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
                  <strong>지역:</strong> {selectedLocation}
                </div>
              </div>
            </div>

            <TimeSelector
              onNext={handleTimeNext}
              onBack={() => setStep('date')}
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

        {/* ⭐ 진단검사 날짜 선택 (신규) */}
        {step === 'test-date' && (
          <div className="card">
            <h1 className="mb-6">진단검사 예약하기</h1>

            <TestDateSelector
              consultingDate={completedReservation.consulting_slots.date}
              onNext={handleTestDateNext}
              onBack={() => setStep('complete')}
            />
          </div>
        )}

        {/* ⭐ 진단검사 시간 선택 (신규) */}
        {step === 'test-time' && (
          <div className="card">
            <h1 className="mb-6">진단검사 예약하기</h1>

            {/* 예약 정보 요약 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm space-y-1">
                <div>
                  <strong>학생명:</strong> {userInfo?.studentName}
                </div>
                <div>
                  <strong>지역:</strong> {selectedLocation}
                </div>
              </div>
            </div>

            <TestTimeSelector
              onNext={handleTestTimeNext}
              onBack={() => setStep('test-date')}
            />
          </div>
        )}

        {/* ⭐ 진단검사 예약 완료 (신규) */}
        {step === 'test-complete' && (
          <div className="card">
            <TestComplete
              testReservation={completedTestReservation}
              consultingReservation={completedReservation}
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
            />
          </div>
        )}
      </div>
    </div>
  );
}
