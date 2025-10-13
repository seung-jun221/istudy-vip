import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useReservation } from '../../context/ReservationContext';
import { supabase, hashPassword } from '../../utils/supabase';

export default function StudentInfoForm({
  phone,
  previousInfo,
  onBack,
  onComplete,
}) {
  const { selectedSeminar, showToast, setLoading } = useReservation();

  const [formData, setFormData] = useState({
    studentName: previousInfo?.student_name || '',
    school: previousInfo?.school || '',
    grade: previousInfo?.grade || '',
    mathLevel: previousInfo?.math_level || '',
    password: '',
    privacyConsent: false,
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 유효성 검사
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

    if (formData.mathLevel.length < 2) {
      showToast('수학 선행정도를 입력해주세요.', 'error');
      return;
    }

    if (formData.password.length !== 6) {
      showToast('비밀번호는 6자리 숫자여야 합니다.', 'error');
      return;
    }

    if (!formData.privacyConsent) {
      showToast('개인정보 수집 및 이용에 동의해주세요.', 'error');
      return;
    }

    setLoading(true);

    try {
      // 🔥 중복 체크 추가!
      const { data: existing, error: existingError } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', phone)
        .eq('seminar_id', selectedSeminar.id)
        .in('status', ['예약', '대기']);

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        showToast('이미 해당 설명회에 예약이 존재합니다.', 'error');
        setLoading(false);
        return;
      }

      // 예약 데이터 생성
      const reservationData = {
        reservation_id: 'R' + Date.now(),
        seminar_id: selectedSeminar.id,
        student_name: formData.studentName,
        parent_phone: phone,
        school: formData.school,
        grade: formData.grade,
        math_level: formData.mathLevel,
        password: hashPassword(formData.password),
        privacy_consent: 'Y',
        status: selectedSeminar.isFull ? '대기' : '예약',
      };

      const { data, error } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single();

      if (error) throw error;

      showToast('예약이 완료되었습니다!', 'success');
      onComplete(data);
    } catch (error) {
      console.error('예약 실패:', error);
      showToast('예약 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {previousInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-700 text-sm">
            ✅ 학교와 학년 정보를 불러왔습니다. 확인 후 수정 가능합니다.
          </p>
        </div>
      )}

      <Input
        label="학생명"
        value={formData.studentName}
        onChange={(e) => handleChange('studentName', e.target.value)}
        placeholder="홍길동"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="학교"
          value={formData.school}
          onChange={(e) => handleChange('school', e.target.value)}
          placeholder="○○중학교"
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
            <option value="중1">중1</option>
            <option value="중2">중2</option>
            <option value="중3">중3</option>
            <option value="고1">고1</option>
            <option value="고2">고2</option>
            <option value="고3">고3</option>
          </select>
        </div>
      </div>

      <Input
        label="수학 선행정도"
        value={formData.mathLevel}
        onChange={(e) => handleChange('mathLevel', e.target.value)}
        placeholder="예: 중3 (고1 선행 중)"
        required
      />

      <Input
        label="비밀번호 (숫자 6자리)"
        type="password"
        value={formData.password}
        onChange={(e) =>
          handleChange(
            'password',
            e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
          )
        }
        placeholder="000000"
        maxLength={6}
        required
      />

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm">개인정보 수집 및 이용 동의</h3>
        <div className="text-xs text-gray-600 space-y-2">
          <p>• 수집 목적: 설명회 참석 신청 및 관리</p>
          <p>• 수집 항목: 학생명, 학부모 연락처, 학교, 학년, 수학 선행정도</p>
          <p>• 보유 기간: 수집일로부터 1년</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.privacyConsent}
            onChange={(e) => handleChange('privacyConsent', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">
            <strong>[필수]</strong> 위 개인정보 수집 및 이용에 동의합니다.
          </span>
        </label>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-yellow-800 text-sm">
          ⚠️ 비밀번호는 예약 확인 및 취소 시 필요합니다. 안전한 곳에
          기록해두세요.
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
        <Button type="submit">
          {selectedSeminar?.isFull ? '대기예약 신청' : '예약 확정'}
        </Button>
      </div>
    </form>
  );
}
