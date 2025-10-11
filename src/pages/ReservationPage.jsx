import { useState } from 'react';
import { useReservation } from '../context/ReservationContext';
import { formatDate, formatTime } from '../utils/format'; // 이 줄 추가!
import SeminarSelector from '../components/reservation/SeminarSelector';
import PhoneInput from '../components/reservation/PhoneInput';
import StudentInfoForm from '../components/reservation/StudentInfoForm';
import ReservationComplete from '../components/reservation/ReservationComplete';
import Button from '../components/common/Button';
import { supabase } from '../utils/supabase';

export default function ReservationPage() {
  const { selectedSeminar, showToast } = useReservation();
  const [step, setStep] = useState('home'); // home, phone, info, complete
  const [phone, setPhone] = useState('');
  const [previousInfo, setPreviousInfo] = useState(null);
  const [completedReservation, setCompletedReservation] = useState(null);

  const handleProceedToReservation = () => {
    if (!selectedSeminar) {
      showToast('설명회를 먼저 선택해주세요.', 'error');
      return;
    }
    setStep('phone');
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

  const handleHome = () => {
    setStep('home');
    setPhone('');
    setPreviousInfo(null);
    setCompletedReservation(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 홈 화면 */}
        {step === 'home' && (
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <div className="text-center mb-6">
              <img
                src="/assets/images/istudy-logo.png"
                alt="i.study"
                className="h-8 mx-auto mb-2"
              />
              <h2 className="text-2xl font-bold text-primary mb-2">
                VIP 학부모 설명회
              </h2>
              <p className="text-gray-600 text-sm">설명회 참석 예약 시스템</p>
              <div className="w-full h-px bg-gray-200 mt-4"></div>
            </div>

            {selectedSeminar && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-sm mb-1 text-primary">
                  {selectedSeminar.title} 선택됨
                </p>
              </div>
            )}

            <SeminarSelector />

            {selectedSeminar && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="font-semibold text-sm mb-1">
                  강남점 VIP 설명회 - 테스트
                </p>
                <ul className="text-sm text-gray-700 space-y-1 mt-2">
                  <li>
                    • 일시: {formatDate(selectedSeminar.date)}{' '}
                    {formatTime(selectedSeminar.time)}
                  </li>
                  <li>• 장소: {selectedSeminar.location}</li>
                  <li>• 대상: 초/중등 학부모님</li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  ※ 설명회 참석 후 개별 맞춤 컨설팅이 가능합니다.
                </p>
              </div>
            )}

            <Button
              onClick={handleProceedToReservation}
              disabled={!selectedSeminar}
            >
              설명회 예약하기
            </Button>

            {!selectedSeminar && (
              <button
                className="w-full py-3 border-2 border-primary text-primary rounded-lg hover:bg-blue-50 transition-all"
                disabled
              >
                예약 확인하기
              </button>
            )}
          </div>
        )}

        {/* 전화번호 입력 */}
        {step === 'phone' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <button
              onClick={handleHome}
              className="text-gray-600 hover:text-gray-800 mb-4"
            >
              ← 뒤로
            </button>

            <h2 className="text-2xl font-bold mb-2">
              {selectedSeminar?.isFull
                ? '대기예약 신청하기'
                : '설명회 예약하기'}
            </h2>
            <p className="text-gray-600 mb-6">
              학부모님 연락처를 입력해주세요.
            </p>

            <PhoneInput
              onNext={handlePhoneNext}
              onLoadPrevious={handleLoadPrevious}
            />
          </div>
        )}

        {/* 개인정보 입력 */}
        {step === 'info' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-2">
              {selectedSeminar?.isFull
                ? '대기예약 신청하기'
                : '설명회 예약하기'}
            </h2>
            <p className="text-gray-600 mb-6">참석자 정보를 입력해주세요.</p>

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
          <div className="bg-white rounded-xl shadow-lg p-8">
            <ReservationComplete
              reservation={completedReservation}
              onHome={handleHome}
            />
          </div>
        )}
      </div>
    </div>
  );
}
