import { useState, useEffect } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

export default function ConsultingInfoForm({ phone, onNext, onBack }) {
  const {
    showToast,
    availableLocations,
    loadAvailableLocations,
    setSelectedLocation,
  } = useConsulting();

  const [formData, setFormData] = useState({
    studentName: '',
    school: '',
    grade: '',
    mathLevel: '',
    location: '',
    privacyConsent: false,
  });

  useEffect(() => {
    loadAvailableLocations();
  }, []);

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

    if (formData.mathLevel.length < 2) {
      showToast('수학 선행정도를 입력해주세요.', 'error');
      return;
    }

    if (!formData.location) {
      showToast('컨설팅 지역을 선택해주세요.', 'error');
      return;
    }

    if (!formData.privacyConsent) {
      showToast('개인정보 수집 및 이용에 동의해주세요.', 'error');
      return;
    }

    // Context에 지역 설정
    setSelectedLocation(formData.location);

    // 다음 단계로 (날짜 선택)
    onNext({
      studentName: formData.studentName,
      school: formData.school,
      grade: formData.grade,
      mathLevel: formData.mathLevel,
      location: formData.location,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-gray-600 mb-4">
        컨설팅 예약을 위해 정보를 입력해주세요.
      </p>

      {/* 학생명 */}
      <Input
        label="학생명"
        value={formData.studentName}
        onChange={(e) => handleChange('studentName', e.target.value)}
        placeholder="홍길동"
        required
      />

      {/* 학부모 연락처 (읽기 전용) */}
      <Input label="학부모 연락처" value={phone} readOnly disabled />

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

      {/* 컨설팅 지역 선택 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          컨설팅 지역 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-primary"
          required
        >
          <option value="">선택하세요</option>
          {availableLocations.map((loc) => (
            <option key={loc.location} value={loc.location}>
              {loc.location} ({loc.availableDateCount}개 날짜 예약 가능)
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          선택하신 지역의 예약 가능한 날짜만 표시됩니다.
        </p>
      </div>

      {/* 개인정보 수집 동의 섹션 */}
      <div className="privacy-section">
        <div className="privacy-title">개인정보 수집 및 이용 동의</div>

        <div className="privacy-content">
          <h4>1. 개인정보 수집 목적</h4>
          <p>- 컨설팅 예약 신청 및 관리</p>
          <p>- 컨설팅 관련 안내 사항 전달</p>

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
          <p>- 다만, 동의를 거부할 경우 컨설팅 예약이 불가능합니다.</p>
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
