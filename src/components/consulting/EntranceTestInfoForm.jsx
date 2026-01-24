// src/components/consulting/EntranceTestInfoForm.jsx
// 입학테스트 전용 개인정보 입력 폼 (설명회 미참석자용)
import { useState, useEffect } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { validatePhone, validateName } from '../../utils/format';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase, hashPassword } from '../../utils/supabase';

export default function EntranceTestInfoForm({ onNext, onBack }) {
  const { showToast, setLoading } = useConsulting();

  const [formData, setFormData] = useState({
    studentName: '',
    parentPhone: '',
    school: '',
    grade: '',
    mathLevel: '',
    location: '',
    password: '',
    passwordConfirm: '',
    privacyConsent: false,
  });

  const [availableLocations, setAvailableLocations] = useState([]);
  const [errors, setErrors] = useState({});

  // 입학테스트 가능한 지역 로드
  useEffect(() => {
    loadAvailableLocations();
  }, []);

  const loadAvailableLocations = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // test_slots에서 예약 가능한 지역 조회
      const { data: slots, error } = await supabase
        .from('test_slots')
        .select('location')
        .eq('status', 'active')
        .gte('date', today);

      if (error) throw error;

      // 고유한 지역 목록 추출
      const uniqueLocations = [...new Set(slots?.map(s => s.location) || [])];
      setAvailableLocations(uniqueLocations.map(loc => ({
        value: loc,
        label: loc,
      })));
    } catch (error) {
      console.error('지역 로드 실패:', error);
      showToast('지역 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  const gradeOptions = [
    { value: '', label: '학년 선택' },
    { value: '초5', label: '초등학교 5학년' },
    { value: '초6', label: '초등학교 6학년' },
    { value: '중1', label: '중학교 1학년' },
    { value: '중2', label: '중학교 2학년' },
    { value: '중3', label: '중학교 3학년' },
    { value: '고1', label: '고등학교 1학년' },
    { value: '고2', label: '고등학교 2학년' },
    { value: '고3', label: '고등학교 3학년' },
  ];

  const mathLevelOptions = [
    { value: '', label: '수학 선행 정도 선택' },
    { value: '현행', label: '현행 (학교 진도)' },
    { value: '1학기 선행', label: '1학기 선행' },
    { value: '1년 선행', label: '1년 선행' },
    { value: '2년 이상 선행', label: '2년 이상 선행' },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // 에러 클리어
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length >= 4 && value.length <= 7) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length >= 8) {
      formatted = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }

    setFormData(prev => ({ ...prev, parentPhone: formatted }));
    if (errors.parentPhone) {
      setErrors(prev => ({ ...prev, parentPhone: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!validateName(formData.studentName)) {
      newErrors.studentName = '학생 이름을 정확히 입력해주세요.';
    }
    if (!validatePhone(formData.parentPhone)) {
      newErrors.parentPhone = '올바른 연락처를 입력해주세요.';
    }
    if (!formData.school.trim()) {
      newErrors.school = '학교명을 입력해주세요.';
    }
    if (!formData.grade) {
      newErrors.grade = '학년을 선택해주세요.';
    }
    if (!formData.location) {
      newErrors.location = '지역을 선택해주세요.';
    }
    if (!formData.password || formData.password.length < 4) {
      newErrors.password = '비밀번호는 4자리 이상 입력해주세요.';
    }
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }
    if (!formData.privacyConsent) {
      newErrors.privacyConsent = '개인정보 수집에 동의해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showToast('입력 정보를 확인해주세요.', 'error');
      return;
    }

    setLoading(true);

    try {
      // 중복 예약 확인 (같은 연락처로 미래 입학테스트 예약이 있는지)
      const today = new Date().toISOString().split('T')[0];

      const { data: existingReservations, error: checkError } = await supabase
        .from('test_reservations')
        .select('*, test_slots!inner(*)')
        .eq('parent_phone', formData.parentPhone)
        .eq('reservation_type', 'entrance_test')
        .in('status', ['confirmed', '예약'])
        .gte('test_slots.date', today);

      if (checkError) throw checkError;

      if (existingReservations && existingReservations.length > 0) {
        const existing = existingReservations[0];
        const slot = existing.test_slots;
        const date = new Date(slot.date);
        const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
        const timeStr = slot.time.slice(0, 5);

        showToast(`이미 ${dateStr} ${timeStr}에 입학테스트 예약이 있습니다.`, 'warning', 5000);
        setLoading(false);
        return;
      }

      // 다음 단계로 진행
      onNext({
        studentName: formData.studentName,
        parentPhone: formData.parentPhone,
        school: formData.school,
        grade: formData.grade,
        mathLevel: formData.mathLevel || '상담 시 확인',
        location: formData.location,
        password: hashPassword(formData.password),
        privacyConsent: 'Y',
      });
    } catch (error) {
      console.error('정보 확인 실패:', error);
      showToast('정보 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="info-box" style={{
        background: '#eff6ff',
        border: '1px solid #93c5fd',
        marginBottom: '20px'
      }}>
        <p style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
          <strong>📝 입학테스트 안내</strong><br />
          • 소요시간: 약 80분<br />
          • 컨설팅은 테스트 결과 확인 후 학원에서 개별 연락드립니다.
        </p>
      </div>

      <Input
        label="학생 이름"
        name="studentName"
        value={formData.studentName}
        onChange={handleChange}
        placeholder="학생 이름을 입력해주세요"
        required
        error={errors.studentName}
      />

      <Input
        label="학부모 연락처"
        name="parentPhone"
        type="tel"
        value={formData.parentPhone}
        onChange={handlePhoneChange}
        placeholder="010-0000-0000"
        required
        error={errors.parentPhone}
      />

      <Input
        label="학교명"
        name="school"
        value={formData.school}
        onChange={handleChange}
        placeholder="예: OO중학교"
        required
        error={errors.school}
      />

      <Select
        label="학년"
        name="grade"
        value={formData.grade}
        onChange={handleChange}
        options={gradeOptions}
        required
        error={errors.grade}
      />

      <Select
        label="수학 선행 정도"
        name="mathLevel"
        value={formData.mathLevel}
        onChange={handleChange}
        options={mathLevelOptions}
      />

      <Select
        label="희망 지역"
        name="location"
        value={formData.location}
        onChange={handleChange}
        options={[
          { value: '', label: '지역 선택' },
          ...availableLocations,
        ]}
        required
        error={errors.location}
      />

      <Input
        label="예약 비밀번호"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="예약 확인/취소 시 사용"
        required
        error={errors.password}
      />

      <Input
        label="비밀번호 확인"
        name="passwordConfirm"
        type="password"
        value={formData.passwordConfirm}
        onChange={handleChange}
        placeholder="비밀번호를 다시 입력해주세요"
        required
        error={errors.passwordConfirm}
      />

      <div className="mt-4">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="privacyConsent"
            checked={formData.privacyConsent}
            onChange={handleChange}
            className="mt-1"
          />
          <span className="text-sm text-gray-600">
            개인정보 수집 및 이용에 동의합니다. (필수)
            <br />
            <span className="text-xs text-gray-400">
              수집항목: 학생명, 연락처, 학교, 학년 / 이용목적: 입학테스트 예약 및 안내
            </span>
          </span>
        </label>
        {errors.privacyConsent && (
          <p className="text-red-500 text-xs mt-1">{errors.privacyConsent}</p>
        )}
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="secondary" onClick={onBack} style={{ flex: 1 }}>
          뒤로
        </Button>
        <Button onClick={handleSubmit} style={{ flex: 2 }}>
          다음
        </Button>
      </div>
    </div>
  );
}
