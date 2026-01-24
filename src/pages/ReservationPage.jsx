import { useState } from 'react';
import { useReservation } from '../context/ReservationContext';
import { formatDate, formatTime } from '../utils/format';
import SeminarSelector from '../components/reservation/SeminarSelector';
import PhoneInput from '../components/reservation/PhoneInput';
import StudentInfoForm from '../components/reservation/StudentInfoForm';
import ReservationComplete from '../components/reservation/ReservationComplete';
import ReservationCheck from '../components/reservation/ReservationCheck';
import ReservationResult from '../components/reservation/ReservationResult';
import { supabase } from '../utils/supabase';

export default function ReservationPage() {
  const { selectedSeminar, showToast } = useReservation();
  const [step, setStep] = useState('home');
  const [phone, setPhone] = useState('');
  const [checkPhone, setCheckPhone] = useState(''); // 예약 확인용 전화번호
  const [previousInfo, setPreviousInfo] = useState(null);
  const [completedReservation, setCompletedReservation] = useState(null);
  const [checkedReservation, setCheckedReservation] = useState(null);

  const handleProceedToReservation = () => {
    if (!selectedSeminar) {
      showToast('설명회를 먼저 선택해주세요.', 'error');
      return;
    }
    setStep('phone');
  };

  const handleCheckReservation = () => {
    setCheckPhone(''); // 초기화
    setStep('check');
  };

  // 예약 확인 페이지로 이동 (전화번호 자동 입력)
  const handleNavigateToCheck = (phoneNumber) => {
    setCheckPhone(phoneNumber);
    setStep('check');
    showToast('예약 확인 페이지로 이동합니다.', 'info');
  };

  const handlePhoneNext = (phoneNumber) => {
    setPhone(phoneNumber);
    setPreviousInfo(null); // 초기화
    setStep('info');
  };

  const handleComplete = (reservation) => {
    setCompletedReservation(reservation);
    setStep('complete');
  };

  const handleCheckResult = (reservation) => {
    setCheckedReservation(reservation);
    setStep('result');
  };

  const handleHome = () => {
    setStep('home');
    setPhone('');
    setCheckPhone('');
    setPreviousInfo(null);
    setCompletedReservation(null);
    setCheckedReservation(null);
  };

  return (
    <div className="container">
      {/* 홈 화면 */}
      {step === 'home' && (
        <div className="card">
          <div className="title-area">
            <img
              src="/assets/images/istudy-logo.png"
              alt="i.study"
              className="logo"
            />
            <h1>VIP 학부모 설명회</h1>
          </div>
          <h2>설명회 참석 예약 시스템</h2>

          {/* 사직 직영점 오픈 안내 */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #1e3a5f',
            padding: '24px 20px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#1e3a5f',
              letterSpacing: '2px',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              NEW BRANCH
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1e3a5f',
              marginBottom: '4px',
            }}>
              부산 사직 직영점
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '16px',
            }}>
              2026. 03. 02 OPEN
            </div>
            <div style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
            }}>
              <div style={{ fontSize: '13px', color: '#4b5563' }}>
                사직역 3번출구 도보 1분
              </div>
              <div style={{ fontSize: '13px', color: '#4b5563' }}>
                051-715-1580
              </div>
            </div>
          </div>

          {/* 설명회 마감 안내 */}
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#92400e',
              margin: 0,
            }}>
              🎉 1회~9회차 설명회 전석 마감!!
            </p>
            <p style={{
              fontSize: '12px',
              color: '#b45309',
              margin: '4px 0 0 0',
            }}>
              성원에 감사합니다.
            </p>
          </div>

          <p className="select-guide">참석하실 설명회를 선택해주세요</p>

          <SeminarSelector />

          {selectedSeminar && (
            <div className="info-box">
              <p>
                <strong>{selectedSeminar.title}</strong>
              </p>
              <ul>
                <li>
                  일시: {formatDate(selectedSeminar.date)}{' '}
                  {formatTime(selectedSeminar.time)}
                </li>
                <li>장소: {selectedSeminar.location}</li>
                <li>대상: 초/중등 학부모님</li>
              </ul>
              <p style={{ fontSize: '13px', marginTop: '10px', color: '#666' }}>
                ※ 설명회 참석 후 개별 맞춤 컨설팅이 가능합니다.
              </p>
            </div>
          )}

          <div className="btn-group" id="reservation-actions">
            <button
              onClick={handleProceedToReservation}
              disabled={!selectedSeminar}
              className="btn btn-primary"
            >
              설명회 예약하기
            </button>

            <button
              onClick={handleCheckReservation}
              className="btn btn-secondary"
            >
              예약 확인하기
            </button>
          </div>
        </div>
      )}

      {/* 전화번호 입력 */}
      {step === 'phone' && (
        <div className="card">
          <button onClick={handleHome} className="btn-back">
            ← 뒤로
          </button>

          <h2 id="phoneTitle">
            {selectedSeminar?.isFull ? '대기예약 신청하기' : '설명회 예약하기'}
          </h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            학부모님 연락처를 입력해주세요.
          </p>

          <PhoneInput
            onNext={handlePhoneNext}
            onNavigateToCheck={handleNavigateToCheck}
          />
        </div>
      )}

      {/* 개인정보 입력 */}
      {step === 'info' && (
        <div className="card">
          <h1>
            {selectedSeminar?.isFull ? '대기예약 신청하기' : '설명회 예약하기'}
          </h1>
          <h2>참석자 정보를 입력해주세요</h2>

          <StudentInfoForm
            phone={phone}
            previousInfo={previousInfo}
            onBack={() => setStep('phone')}
            onComplete={handleComplete}
          />
        </div>
      )}

      {/* 예약 완료 */}
      {step === 'complete' && (
        <div className="card">
          <ReservationComplete
            reservation={completedReservation}
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

          <h1>예약 확인하기</h1>
          <h2>예약 정보를 입력해주세요</h2>

          <ReservationCheck
            onBack={handleHome}
            onResult={handleCheckResult}
            prefilledPhone={checkPhone}
          />
        </div>
      )}

      {/* 예약 조회 결과 */}
      {step === 'result' && (
        <div className="card">
          <ReservationResult
            reservation={checkedReservation}
            onBack={() => setStep('check')}
            onHome={handleHome}
          />
        </div>
      )}
    </div>
  );
}
