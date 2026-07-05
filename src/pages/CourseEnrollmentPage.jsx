import { useState } from 'react';
import Input from '../components/common/Input';
import { supabase } from '../utils/supabase';
import { formatPhone, validatePhone } from '../utils/format';

// 4개 과정 상세 데이터 (자연스러운 줄글 설명)
const COURSES = [
  {
    id: 1,
    number: '①',
    name: '초등 교과반',
    subtitle: '바로 입학 희망',
    progressRange: '초4-2 ~ 초6-2 진행 중',
    description:
      '초4-2 ~ 초6-2 진행 중인 학생을 위한 주 2회 교과 진행반입니다. 학년 교과 진도를 사고력 중심으로 학습하며, 중등 진입 시 자연스럽게 상위 과정으로 연계됩니다.',
    meta: null,
  },
  {
    id: 2,
    number: '②',
    name: '중등수학 입문특강',
    subtitle: '프리모노 → 9월 정규반 or 주1회 수리탐구반',
    progressRange: '초6-1 ~ 중1-2 진행 중',
    description:
      "초6-1 ~ 중1-2 진행 중인 학생을 위한 여름 방학특강입니다. 중1-1 핵심 기본개념(약수·소수 → 정수·유리수 → 일차식)을 단순 계산이 아닌 '수의 구조를 읽는 사고력' 중심으로 잡아줍니다. 수료 후 9월 모노 정규과정 또는 주1회 수리탐구반으로 이어집니다.",
    meta: '이시용 대표 직강 · 매주 월 12:00~15:00 · 4회 · 28만원',
  },
  {
    id: 3,
    number: '③',
    name: '고등연계 중등심화특강',
    subtitle: '모노 방부함 → 9월 정규반 or 주1회 수리탐구반',
    progressRange: '중2-1 ~ 중3-2 진행 중',
    description:
      '중2-1 ~ 중3-2 진행 중인 학생을 위한 여름 방학특강입니다. 방정식·부등식·함수의 기본을 넘어 항등식·특수한 해·절댓값 등 고등 연계 수준까지 개념을 깊이 있게 완성합니다. 수료 후 9월 다이(DI) 정규과정 또는 주1회 수리탐구반으로 이어집니다.',
    meta: '이시용 대표 직강 · 매주 월·수 12:00~15:00 · 6회 · 42만원',
  },
  {
    id: 4,
    number: '④',
    name: '고등 교과반',
    subtitle: '바로 입학 희망',
    progressRange: '고1(공통수학1) 이상 진행 중',
    description:
      '고1(공통수학1) 이상 진행 중인 학생을 위한 과정입니다. 교과 진도와 수리탐구를 병행하는 정규반, 또는 주1회 수리탐구반 중에서 현재 진도와 목표에 맞춰 반이 배정됩니다.',
    meta: null,
  },
];

const PROGRESS_GUIDE = [
  { range: '초4-2 ~ 초6-2', course: '① 초등 교과반' },
  { range: '초6-1 ~ 중1-2', course: '② 중등수학 입문특강 (프리모노)' },
  { range: '중2-1 ~ 중3-2', course: '③ 고등연계 중등심화특강 (모노 방부함)' },
  { range: '고1(공통수학1) 이상', course: '④ 고등 교과반' },
];

// ⑤번은 정보 카드는 없이 폼 라디오에만 노출되는 상담 요청 옵션
const CONSULT_OPTION = {
  id: 5,
  number: '⑤',
  name: '우리 아이에게 맞는 과정을 상담받고 싶어요',
  subtitle: '상담 후 결정',
};

const CENTER_PHONE = '051-715-1580';

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 완료 화면
  if (step === 'complete' && completedEnrollment) {
    const chosen =
      COURSES.find((c) => c.id === completedEnrollment.course_option) ||
      (completedEnrollment.course_option === CONSULT_OPTION.id
        ? CONSULT_OPTION
        : null);
    return (
      <div className="container">
        <div className="card">
          <div className="text-center space-y-6">
            <div className="text-6xl">✅</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                신청이 완료되었습니다
              </h2>
              <p className="text-gray-600">
                선택하신 과정으로 학원에서 곧<br />
                연락드려 상세 안내해 드리겠습니다.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 space-y-3 text-left">
              <div>
                <div className="text-sm text-gray-600 mb-1">신청하신 과정</div>
                <div className="font-semibold text-gray-900">
                  {chosen?.number} {chosen?.name}
                  {chosen?.subtitle && (
                    <div className="text-sm font-normal text-gray-600 mt-0.5">
                      {chosen.subtitle}
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">학생명</span>
                  <span className="font-semibold">
                    {completedEnrollment.student_name}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-600">학부모 연락처</span>
                  <span className="font-semibold">
                    {completedEnrollment.parent_phone}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              <p className="font-semibold text-sm">📌 안내사항</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 학원에서 접수 확인 후 개별 연락드립니다.</li>
                <li>• 수업 시간 및 반 배정은 상담 후 확정됩니다.</li>
                <li>
                  • 문의:{' '}
                  <a
                    href={`tel:${CENTER_PHONE}`}
                    style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    {CENTER_PHONE}
                  </a>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              추가 신청하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 신청 페이지
  return (
    <div className="container">
      {/* 헤더 */}
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
        <p className="select-guide" style={{ lineHeight: 1.7 }}>
          설명회에 참석해 주셔서 감사합니다.<br />
          아래에서 우리 아이에게 맞는 과정을 확인하고 신청해 주세요.
        </p>
      </div>

      {/* 진도별 길잡이 */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: 'var(--color-primary-dark)' }}>
          진도별 길잡이
        </h3>
        <p style={{ fontSize: '13.5px', color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          우리 아이 현재 진도를 확인하고, 맞는 과정을 선택하세요.
        </p>

        <div
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.3fr',
              background: 'var(--color-primary-light)',
              padding: '10px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--color-primary-dark)',
              letterSpacing: '0.3px',
            }}
          >
            <div>현재 진도</div>
            <div>추천 과정</div>
          </div>
          {PROGRESS_GUIDE.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.3fr',
                padding: '12px 14px',
                fontSize: '13.5px',
                borderTop: idx === 0 ? 'none' : '1px solid #f0f0f0',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, color: '#333' }}>{row.range} 진행 중</div>
              <div style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{row.course}</div>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: '12.5px',
            color: '#666',
            margin: '14px 0 0',
            lineHeight: 1.6,
            padding: '10px 14px',
            background: '#f8f9fa',
            borderRadius: '8px',
            borderLeft: '3px solid var(--color-primary)',
          }}
        >
          진도가 겹치는 경우 두 과정 모두 신청 가능하며, 학원에서 상담 후 가장
          적합한 과정으로 안내드립니다.
        </p>
      </div>

      {/* 4개 과정 상세 (읽기 전용 카드) */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-primary-dark)' }}>
          4가지 과정 안내
        </h3>
        <p style={{ fontSize: '13.5px', color: '#666', margin: '0 0 20px', lineHeight: 1.6 }}>
          내용을 확인하신 후, 하단 신청 폼에서 원하는 과정을 선택해주세요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {COURSES.map((course, idx) => (
            <div
              key={course.id}
              style={{
                paddingBottom: idx === COURSES.length - 1 ? 0 : '20px',
                borderBottom: idx === COURSES.length - 1 ? 'none' : '1px solid #f0f0f0',
              }}
            >
              {/* 상단: 번호 + 이름 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                >
                  {course.number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: '#1a1a1a',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {course.name}
                  </h4>
                  {course.subtitle && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#666',
                        marginTop: '2px',
                        lineHeight: 1.4,
                      }}
                    >
                      {course.subtitle}
                    </div>
                  )}
                </div>
              </div>

              {/* 진도 뱃지 */}
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary-dark)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}
              >
                {course.progressRange}
              </div>

              {/* 본문 설명 (줄글) */}
              <p
                style={{
                  fontSize: '14px',
                  color: '#333',
                  margin: 0,
                  lineHeight: 1.75,
                }}
              >
                {course.description}
              </p>

              {/* 일정·수강료 (특강만) */}
              {course.meta && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#f8f9fa',
                    borderLeft: '3px solid var(--color-primary)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#555',
                    lineHeight: 1.6,
                  }}
                >
                  {course.meta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 신청 폼 */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px', color: 'var(--color-primary-dark)' }}>
          신청 정보 입력
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 희망 수강 (라디오) — 최상단 배치로 무엇 신청하는지 명확히 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              희망 수강 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {[...COURSES, CONSULT_OPTION].map((course) => {
                const isSelected = formData.courseOption === String(course.id);
                const isConsult = course.id === CONSULT_OPTION.id;
                return (
                  <label
                    key={course.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 14px',
                      border: `1.5px solid ${
                        isSelected ? 'var(--color-primary)' : '#d1d5db'
                      }`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--color-primary-light)' : 'white',
                      transition: 'all 0.15s',
                      marginTop: isConsult ? '4px' : 0,
                      borderStyle: isConsult && !isSelected ? 'dashed' : 'solid',
                    }}
                  >
                    <input
                      type="radio"
                      name="courseOption"
                      value={course.id}
                      checked={isSelected}
                      onChange={(e) => handleChange('courseOption', e.target.value)}
                      style={{ marginTop: '3px', flexShrink: 0 }}
                    />
                    <div style={{ fontSize: '13.5px', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>
                        {course.number} {course.name}
                      </div>
                      {course.subtitle && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {course.subtitle}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

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
            label="현재 수학 선행정도"
            value={formData.mathLevel}
            onChange={(e) => handleChange('mathLevel', e.target.value)}
            placeholder="예: 중3 (고1 선행 중)"
            required
          />

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
              <p>
                - 동의를 거부할 권리가 있으며, 거부 시 수강신청이 불가능합니다.
              </p>
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
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '12px',
                color: '#b91c1c',
                fontSize: '13.5px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%' }}
          >
            {submitting ? '신청 중...' : '수강신청 하기'}
          </button>

          <p
            style={{
              textAlign: 'center',
              fontSize: '12.5px',
              color: '#666',
              margin: '12px 0 0',
              lineHeight: 1.6,
            }}
          >
            문의 ·{' '}
            <a
              href={`tel:${CENTER_PHONE}`}
              style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}
            >
              {CENTER_PHONE}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
