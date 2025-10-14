import { useState } from 'react';
import { useConsulting } from '../context/ConsultingContext';
import PhoneVerification from '../components/consulting/PhoneVerification';
import DateSelector from '../components/consulting/DateSelector';
import TimeSelector from '../components/consulting/TimeSelector';
import ConsultingComplete from '../components/consulting/ConsultingComplete';
import ConsultingCheck from '../components/consulting/ConsultingCheck';
import ConsultingResult from '../components/consulting/ConsultingResult';

export default function ConsultingPage() {
  const [step, setStep] = useState('home');
  const [phone, setPhone] = useState('');
  const [studentName, setStudentName] = useState('');
  const [completedReservation, setCompletedReservation] = useState(null);
  const [checkedReservation, setCheckedReservation] = useState(null);

  const { createConsultingReservation, selectedDate, selectedTime } =
    useConsulting();

  const handlePhoneNext = (phoneNumber) => {
    setPhone(phoneNumber);
    setStep('date');
  };

  const handleDateNext = () => {
    setStep('time');
  };

  const handleTimeNext = () => {
    setStep('confirm');
  };

  const handleConfirm = async (name, school, grade) => {
    try {
      const reservation = await createConsultingReservation({
        parentPhone: phone,
        studentName: name,
        school: school,
        grade: grade,
      });

      // consulting_slots 정보 추가 (완료 화면에 필요)
      const reservationWithSlot = {
        ...reservation,
        consulting_slots: {
          date: selectedDate,
          time: selectedTime + ':00',
        },
      };

      setCompletedReservation(reservationWithSlot);
      setStep('complete');
    } catch (error) {
      console.error('예약 실패:', error);
    }
  };

  const handleCheckResult = (reservation) => {
    setCheckedReservation(reservation);
    setStep('result');
  };

  const handleHome = () => {
    setStep('home');
    setPhone('');
    setStudentName('');
    setCompletedReservation(null);
    setCheckedReservation(null);
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
                • <strong>컨설팅 시간:</strong> 화요일 / 목요일 10:30~14:00
                <br />• <strong>소요 시간:</strong> 약 30분
                <br />• <strong>장소:</strong> 수학의 아침 학원
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

            <PhoneVerification onNext={handlePhoneNext} />
          </div>
        )}

        {/* 날짜 선택 */}
        {step === 'date' && (
          <div className="card">
            <h1>컨설팅 예약하기</h1>

            <DateSelector
              onNext={handleDateNext}
              onBack={() => setStep('phone')}
            />
          </div>
        )}

        {/* 시간 선택 */}
        {step === 'time' && (
          <div className="card">
            <h1>컨설팅 예약하기</h1>

            <TimeSelector
              onNext={handleTimeNext}
              onBack={() => setStep('date')}
            />
          </div>
        )}

        {/* 정보 확인 */}
        {step === 'confirm' && (
          <div className="card">
            <h1>컨설팅 예약하기</h1>
            <h2>참석자 정보 입력</h2>

            <ConfirmForm
              phone={phone}
              onBack={() => setStep('time')}
              onConfirm={handleConfirm}
            />
          </div>
        )}

        {/* 예약 완료 */}
        {step === 'complete' && (
          <div className="card">
            <ConsultingComplete
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

// 정보 확인 폼 컴포넌트
function ConfirmForm({ phone, onBack, onConfirm }) {
  const [formData, setFormData] = useState({
    studentName: '',
    school: '',
    grade: '',
  });

  const { showToast } = useConsulting();

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.studentName.length < 2) {
      showToast('학생명을 정확히 입력해주세요.', 'error');
      return;
    }

    if (formData.school.length < 2) {
      showToast('학교를 정확히 입력해주세요.', 'error');
      return;
    }

    if (!formData.grade) {
      showToast('학년을 선택해주세요.', 'error');
      return;
    }

    onConfirm(formData.studentName, formData.school, formData.grade);
  };

  return (
    <div onSubmit={handleSubmit} className="space-y-4">
      <div className="form-group">
        <label>
          학생명 <span className="required-mark">*</span>
        </label>
        <input
          type="text"
          value={formData.studentName}
          onChange={(e) => handleChange('studentName', e.target.value)}
          placeholder="홍길동"
          required
        />
      </div>

      <div className="form-group">
        <label>학부모 연락처</label>
        <input type="tel" value={phone} disabled />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label>
            학교 <span className="required-mark">*</span>
          </label>
          <input
            type="text"
            value={formData.school}
            onChange={(e) => handleChange('school', e.target.value)}
            placeholder="○○중학교"
            required
          />
        </div>

        <div className="form-group">
          <label>
            학년 <span className="required-mark">*</span>
          </label>
          <select
            value={formData.grade}
            onChange={(e) => handleChange('grade', e.target.value)}
            required
          >
            <option value="">선택</option>
            <option value="초1">초1</option>
            <option value="초2">초2</option>
            <option value="초3">초3</option>
            <option value="초4">초4</option>
            <option value="초5">초5</option>
            <option value="초6">초6</option>
            <option value="중1">중1</option>
            <option value="중2">중2</option>
            <option value="중3">중3</option>
            <option value="고1">고1</option>
            <option value="고2">고2</option>
            <option value="고3">고3</option>
          </select>
        </div>
      </div>

      <div className="btn-group">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          ← 뒤로
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
        >
          예약 확정
        </button>
      </div>
    </div>
  );
}
