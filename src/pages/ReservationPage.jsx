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
    setStep('check');
  };

  const handlePhoneNext = (phoneNumber) => {
    setPhone(phoneNumber);
    setStep('info');
  };

  const handleLoadPrevious = async (phoneNumber) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', phoneNumber)
        .order('registered_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setPreviousInfo(data);
        showToast('이전 정보를 불러왔습니다.', 'success');
        setPhone(phoneNumber);
        setStep('info');
      }
    } catch (error) {
      showToast('이전 정보가 없습니다.', 'info');
      setPhone(phoneNumber);
      setStep('info');
    }
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
    setPreviousInfo(null);
    setCompletedReservation(null);
    setCheckedReservation(null);
  };

  return (
    <div className="container">
      {/* 홈 화면 */}
      {step === 'home' && (
        <div className="card">
          <img
            src="/assets/images/istudy-logo.png"
            alt="i.study"
            className="logo"
          />

          <h1>VIP 학부모 설명회</h1>
          <h2>설명회 참석 예약 시스템</h2>

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

          <div className="btn-group">
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

          <h1>
            {selectedSeminar?.isFull ? '대기예약 신청하기' : '설명회 예약하기'}
          </h1>
          <h2
            style={{
              borderBottom: 'none',
              paddingBottom: '10px',
              marginBottom: '20px',
            }}
          >
            학부모님 연락처를 입력해주세요
          </h2>

          <PhoneInput
            onNext={handlePhoneNext}
            onLoadPrevious={handleLoadPrevious}
          />
        </div>
      )}

      {/* 개인정보 입력 */}
      {step === 'info' && (
        <div className="card">
          <h1>
            {selectedSeminar?.isFull ? '대기예약 신청하기' : '설명회 예약하기'}
          </h1>
          <h2
            style={{
              borderBottom: 'none',
              paddingBottom: '10px',
              marginBottom: '20px',
            }}
          >
            참석자 정보를 입력해주세요
          </h2>

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
          <h2
            style={{
              borderBottom: 'none',
              paddingBottom: '10px',
              marginBottom: '20px',
            }}
          >
            예약 정보를 입력해주세요
          </h2>

          <ReservationCheck onBack={handleHome} onResult={handleCheckResult} />
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
