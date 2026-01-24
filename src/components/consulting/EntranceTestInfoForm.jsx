// src/components/consulting/EntranceTestInfoForm.jsx
// 입학테스트 전용 개인정보 입력 폼 (설명회 미참석자용)
import { useState, useEffect } from 'react';
import Input from '../common/Input';
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
    privacyConsent: false,
  });

  const [availableLocations, setAvailableLocations] = useState([]);

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
      setAvailableLocations(uniqueLocations);
    } catch (error) {
      console.error('지역 로드 실패:', error);
      showToast('지역 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 유효성 검사
    if (!validateName(formData.studentName)) {
      showToast('학생명을 정확히 입력해주세요.', 'error');
      return;
    }

    if (!validatePhone(formData.parentPhone)) {
      showToast('올바른 연락처를 입력해주세요.', 'error');
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

    if (!formData.location) {
      showToast('희망 지역을 선택해주세요.', 'error');
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
        mathLevel: formData.mathLevel,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-gray-600 mb-4">
        입학테스트 예약을 위해 정보를 입력해주세요.
      </p>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
          <strong>📝 입학테스트 안내</strong><br />
          • 소요시간: 약 80분<br />
          • 컨설팅은 테스트 결과 확인 후 학원에서 개별 연락드립니다.
        </p>
      </div>

      {/* 학생명 */}
      <Input
        label="학생명"
        value={formData.studentName}
        onChange={(e) => handleChange('studentName', e.target.value)}
        placeholder="홍길동"
        required
      />

      {/* 학부모 연락처 */}
      <Input
        label="학부모 연락처"
        type="tel"
        value={formData.parentPhone}
        onChange={handlePhoneChange}
        placeholder="010-0000-0000"
        required
      />

      {/* 학교 & 학년 */}
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
      </div>

      {/* 수학 선행정도 */}
      <Input
        label="수학 선행정도"
        value={formData.mathLevel}
        onChange={(e) => handleChange('mathLevel', e.target.value)}
        placeholder="예: 중3 (고1 선행 중)"
        required
      />

      {/* 희망 지역 선택 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          희망 지역 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-primary"
          required
        >
          <option value="">선택하세요</option>
          {availableLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* 비밀번호 */}
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

      {/* 개인정보 수집 동의 섹션 */}
      <div className="privacy-section">
        <div className="privacy-title">개인정보 수집 및 이용 동의</div>

        <div className="privacy-content">
          <h4>1. 개인정보 수집 목적</h4>
          <p>- 입학테스트 예약 신청 및 관리</p>
          <p>- 테스트 관련 안내 사항 전달</p>
          <p>- 테스트 결과 기반 컨설팅 안내</p>

          <h4>2. 수집하는 개인정보 항목</h4>
          <table>
            <tbody>
              <tr>
                <th>필수항목</th>
                <td>학생명, 학부모 연락처, 학교, 학년, 수학 선행정도</td>
              </tr>
            </tbody>
          </table>

          <h4>3. 개인정보 보유 및 이용기간</h4>
          <p>- 수집일로부터 1년간 보유</p>
          <p>
            - 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간
            동안 보유
          </p>

          <h4>4. 개인정보 제3자 제공</h4>
          <p>- 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
          <p>- 단, 이용자의 동의가 있거나 법령에 의한 경우는 예외로 합니다.</p>

          <h4>5. 동의 거부권 및 불이익</h4>
          <p>- 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다.</p>
          <p>- 다만, 동의를 거부할 경우 입학테스트 예약이 불가능합니다.</p>
        </div>

        <div className="checkbox-group">
          <input
            type="checkbox"
            id="privacyConsent"
            checked={formData.privacyConsent}
            onChange={(e) => handleChange('privacyConsent', e.target.checked)}
          />
          <label htmlFor="privacyConsent" className="checkbox-label">
            <strong>[필수]</strong> 위 개인정보 수집 및 이용에 동의합니다.
          </label>
        </div>

        <div className="privacy-notice">
          ※ 만 14세 미만 아동의 경우 법정대리인의 동의가 필요합니다.
        </div>
      </div>

      {/* 비밀번호 경고 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-yellow-800 text-sm">
          ⚠️ 비밀번호는 예약 확인 및 취소 시 필요합니다. 안전한 곳에
          기록해두세요.
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
        <Button type="submit">날짜 선택하기</Button>
      </div>
    </form>
  );
}
