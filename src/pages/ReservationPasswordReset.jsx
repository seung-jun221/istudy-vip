import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { validatePhone } from '../utils/format';
import { supabase, hashPassword } from '../utils/supabase';

export default function ReservationPasswordReset() {
  const navigate = useNavigate();
  const [step, setStep] = useState('verify'); // 'verify' or 'reset'
  const [loading, setLoading] = useState(false);
  const [reservationId, setReservationId] = useState(null);

  const [formData, setFormData] = useState({
    phone: '',
    studentName: '',
    grade: '',
    school: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length >= 4 && value.length <= 7) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length >= 8) {
      formatted =
        value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }

    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!validatePhone(formData.phone)) {
      alert('올바른 전화번호를 입력해주세요.');
      return;
    }

    if (formData.studentName.length < 2) {
      alert('학생 이름을 정확히 입력해주세요.');
      return;
    }

    if (!formData.grade) {
      alert('학년을 선택해주세요.');
      return;
    }

    if (formData.school.length < 2) {
      alert('학교 이름을 정확히 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      // 4개 필드가 모두 일치하는 예약 조회
      const { data, error } = await supabase
        .from('reservations')
        .select('id')
        .eq('parent_phone', formData.phone)
        .eq('student_name', formData.studentName)
        .eq('grade', formData.grade)
        .eq('school', formData.school)
        .neq('status', '취소')
        .order('registered_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        alert('입력한 정보와 일치하는 예약을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      setReservationId(data.id);
      setStep('reset');
    } catch (error) {
      console.error('예약 조회 실패:', error);
      alert('예약 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length !== 6) {
      alert('비밀번호는 6자리 숫자여야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ password: hashPassword(newPassword) })
        .eq('id', reservationId);

      if (error) throw error;

      alert('비밀번호가 성공적으로 변경되었습니다.');
      navigate('/reservation');
    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
      alert('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="title-area">
          <img
            src="/assets/images/istudy-logo.png"
            alt="i.study"
            className="logo"
          />
          <h1>VIP 학부모 설명회</h1>
        </div>

        {step === 'verify' ? (
          <>
            <h2>비밀번호 재설정</h2>
            <p className="text-gray-600 mb-6">
              예약 정보를 입력하여 본인 확인을 진행합니다.
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                label="학부모 연락처"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
                required
              />

              <Input
                label="학생 이름 (전체)"
                value={formData.studentName}
                onChange={(e) => handleChange('studentName', e.target.value)}
                placeholder="홍길동"
                required
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  학년 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) => handleChange('grade', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-primary"
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
                label="학교 이름 (전체)"
                value={formData.school}
                onChange={(e) => handleChange('school', e.target.value)}
                placeholder="○○중학교"
                required
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  ⚠️ 입력한 정보가 모두 일치해야 비밀번호를 재설정할 수
                  있습니다.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/reservation')}
                >
                  ← 취소
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? '확인중...' : '본인 확인'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2>새 비밀번호 설정</h2>
            <p className="text-gray-600 mb-6">
              사용하실 새 비밀번호를 입력해주세요.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                label="새 비밀번호 (숫자 6자리)"
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                required
              />

              <Input
                label="비밀번호 확인"
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                  )
                }
                placeholder="000000"
                maxLength={6}
                required
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  ✅ 본인 확인이 완료되었습니다. 새 비밀번호를 설정해주세요.
                </p>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? '변경중...' : '비밀번호 변경'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
