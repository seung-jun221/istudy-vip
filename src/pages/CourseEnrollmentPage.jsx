import { useState } from 'react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { supabase } from '../utils/supabase';
import { formatPhone, validatePhone } from '../utils/format';

const COURSE_OPTIONS = [
  {
    value: 1,
    label: '초등 교과반 바로 입학 희망 (주2회 / 초4~초6 교과 진행반)',
  },
  {
    value: 2,
    label: '중등과정 입문 방학특강 → 9월 정규반 or 주1회 수리탐구반 수강희망',
  },
  {
    value: 3,
    label: '중등심화 방학특강 → 9월 정규반 or 주1회 수리탐구반 수강희망',
  },
  {
    value: 4,
    label: '고등 교과반 바로 입학 희망 (정규반 or 주1회 수리탐구반)',
  },
];

export default function CourseEnrollmentPage() {
  const [step, setStep] = useState('form');
  const [submitting, setSubmitting] = useState(false);
  const [completedEnrollment, setCompletedEnrollment] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    studentName: '',
    parentPhone: '',
    school: '',
    grade: '',
    mathLevel: '',
    courseOption: '',
    notes: '',
    privacyConsent: false,
  });

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;
    if (value.length >= 4 && value.length <= 7) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length >= 8) {
      formatted =
        value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }
    setFormData((prev) => ({ ...prev, parentPhone: formatted }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.studentName.trim().length < 2) {
      setError('학생명을 정확히 입력해주세요.');
      return;
    }
    if (!validatePhone(formData.parentPhone)) {
      setError('올바른 학부모 연락처를 입력해주세요.');
      return;
    }
    if (formData.school.trim().length < 2) {
      setError('학교를 정확히 입력해주세요.');
      return;
    }
    if (!formData.grade) {
      setError('학년을 선택해주세요.');
      return;
    }
    if (formData.mathLevel.trim().length < 2) {
      setError('수학 선행정도를 입력해주세요.');
      return;
    }
    if (!formData.courseOption) {
      setError('희망 수강 옵션을 선택해주세요.');
      return;
    }
    if (!formData.privacyConsent) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: dbError } = await supabase
        .from('course_enrollments')
        .insert([
          {
            student_name: formData.studentName.trim(),
            parent_phone: formatPhone(formData.parentPhone),
            school: formData.school.trim(),
            grade: formData.grade,
            math_level: formData.mathLevel.trim(),
            course_option: parseInt(formData.courseOption, 10),
            notes: formData.notes.trim() || null,
            privacy_consent: 'Y',
            status: '신청',
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setCompletedEnrollment(data);
      setStep('complete');
    } catch (err) {
      console.error('수강신청 저장 실패:', err);
      setError('신청 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      studentName: '',
      parentPhone: '',
      school: '',
      grade: '',
      mathLevel: '',
      courseOption: '',
      notes: '',
      privacyConsent: false,
    });
    setCompletedEnrollment(null);
    setError('');
    setStep('form');
  };

  if (step === 'complete' && completedEnrollment) {
    const chosen = COURSE_OPTIONS.find(
      (o) => o.value === completedEnrollment.course_option
    );
    return (
      <div className="container">
        <div className="card">
          <div className="text-center space-y-6">
            <div className="text-6xl">✅</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                수강신청이 완료되었습니다
              </h2>
              <p className="text-gray-600">
                학원에서 곧 개별 연락드리겠습니다.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-600">학생명</span>
                <span className="font-semibold">
                  {completedEnrollment.student_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">학부모 연락처</span>
                <span className="font-semibold">
                  {completedEnrollment.parent_phone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">학년</span>
                <span className="font-semibold">
                  {completedEnrollment.grade}
                </span>
              </div>
              <div className="border-t pt-3">
                <p className="text-gray-600 mb-1">희망 수강</p>
                <p className="font-semibold text-sm">{chosen?.label}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              <p className="font-semibold text-sm">📌 안내사항</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 학원에서 접수 확인 후 개별 연락드립니다.</li>
                <li>• 수업 시간 및 반 배정은 상담 후 확정됩니다.</li>
                <li>• 문의: 사직캠퍼스로 연락주세요.</li>
              </ul>
            </div>

            <Button onClick={handleReset} variant="secondary">
              추가 신청하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title-area">
          <img
            src="/assets/images/istudy-logo.png"
            alt="i.study"
            className="logo"
          />
          <h1>수리탐구 사직점</h1>
        </div>
        <h2>7월 수강신청</h2>
        <p className="select-guide">
          아래 정보를 입력해주시면 학원에서 개별 연락드립니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="학생명"
            value={formData.studentName}
            onChange={(e) => handleChange('studentName', e.target.value)}
            placeholder="홍길동"
            required
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              학부모 연락처 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.parentPhone}
              onChange={handlePhoneChange}
              placeholder="010-0000-0000"
              maxLength="13"
              className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-primary"
              required
            />
          </div>

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

          <Input
            label="수학 선행정도"
            value={formData.mathLevel}
            onChange={(e) => handleChange('mathLevel', e.target.value)}
            placeholder="예: 중3 (고1 선행 중)"
            required
          />

          {/* 희망 수강 옵션 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              희망 수강 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {COURSE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.courseOption === String(opt.value)
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="courseOption"
                    value={opt.value}
                    checked={formData.courseOption === String(opt.value)}
                    onChange={(e) =>
                      handleChange('courseOption', e.target.value)
                    }
                    className="mt-1 flex-shrink-0"
                  />
                  <span className="text-sm leading-relaxed">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 문의사항 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              문의사항 (선택)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="추가로 궁금하신 내용이 있다면 자유롭게 남겨주세요."
              rows={3}
              className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-primary resize-none"
            />
          </div>

          {/* 개인정보 수집 동의 */}
          <div className="privacy-section">
            <div className="privacy-title">개인정보 수집 및 이용 동의</div>

            <div className="privacy-content">
              <h4>1. 개인정보 수집 목적</h4>
              <p>- 수강신청 접수 및 학원 개별 안내</p>
              <p>- 수강 상담 및 반 배정 안내</p>

              <h4>2. 수집하는 개인정보 항목</h4>
              <table>
                <tbody>
                  <tr>
                    <th>필수항목</th>
                    <td>
                      학생명, 학부모 연락처, 학교, 학년, 수학 선행정도, 희망
                      수강
                    </td>
                  </tr>
                  <tr>
                    <th>선택항목</th>
                    <td>문의사항</td>
                  </tr>
                </tbody>
              </table>

              <h4>3. 개인정보 보유 및 이용기간</h4>
              <p>- 수집일로부터 1년간 보유</p>
              <p>
                - 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한
                기간 동안 보유
              </p>

              <h4>4. 동의 거부권 및 불이익</h4>
              <p>- 동의를 거부할 권리가 있으며, 거부 시 수강신청이 불가능합니다.</p>
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
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? '신청 중...' : '수강신청 하기'}
          </Button>
        </form>
      </div>
    </div>
  );
}
