import { useState } from 'react';
import Input from '../components/common/Input';
import { supabase } from '../utils/supabase';
import { formatPhone, validatePhone } from '../utils/format';

// 9월 개강 사전 신청 페이지
// - 이전 7월 수강신청과 달리 결제/등록 확정 아님. '사전 관심 등록(의사 표현)'.
// - 학원이 신청 접수 후 개별 연락 → 진도 확인 → 반 배정 안내.
// - 반이 18개로 복잡해 학부모가 직접 과정을 고르지 않음. 상담 배정 정책.

const CENTER_PHONE = '051-715-1580';

// course_option은 DB 스키마상 NOT NULL 가능성이 있어 0으로 저장
// (관리자 페이지에서 COURSE_OPTIONS[0] = '9월 개강 사전 신청'으로 표시)
const COURSE_OPTION_PREREG = 0;

export default function CourseEnrollmentPage() {
  const [step, setStep] = useState('form');
  const [submitting, setSubmitting] = useState(false);
  const [completedEnrollment, setCompletedEnrollment] = useState(null);
  const [error, setError] = useState('');

  // 이전 예약 정보 불러오기용 상태
  const [surname, setSurname] = useState('');
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [previousLoaded, setPreviousLoaded] = useState(false);
  const [loadMessage, setLoadMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    studentName: '',
    parentPhone: '',
    school: '',
    grade: '',
    mathLevel: '',
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
    if (previousLoaded) {
      setPreviousLoaded(false);
      setLoadMessage({ type: '', text: '' });
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 이전 설명회 예약에서 학생 정보 불러오기
  const handleLoadPrevious = async () => {
    setLoadMessage({ type: '', text: '' });

    if (!validatePhone(formData.parentPhone)) {
      setLoadMessage({ type: 'error', text: '먼저 학부모 연락처를 정확히 입력해주세요.' });
      return;
    }
    if (!surname || surname.trim().length < 1) {
      setLoadMessage({ type: 'error', text: '학생 성을 입력해주세요.' });
      return;
    }

    setLoadingPrevious(true);
    try {
      const phone = formatPhone(formData.parentPhone);
      const { data: reservations, error: qErr } = await supabase
        .from('reservations')
        .select('student_name, school, grade, registered_at')
        .eq('parent_phone', phone)
        .neq('status', '취소')
        .order('registered_at', { ascending: false });

      if (qErr) throw qErr;

      if (!reservations || reservations.length === 0) {
        setLoadMessage({
          type: 'info',
          text: '이전 정보를 불러올 수 없어 직접 입력이 필요합니다.',
        });
        return;
      }

      const matched = reservations.find((r) =>
        r.student_name?.startsWith(surname.trim())
      );

      if (!matched) {
        setLoadMessage({
          type: 'info',
          text: `성이 "${surname.trim()}"인 이전 정보를 찾을 수 없어 직접 입력이 필요합니다.`,
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        studentName: matched.student_name || '',
        school: matched.school || '',
        grade: matched.grade || '',
        mathLevel: '', // 선행정도는 시간이 지나 변할 수 있어 항상 새로 입력
      }));
      setPreviousLoaded(true);
      setLoadMessage({
        type: 'success',
        text: '이전 정보를 불러왔습니다. 확인 후 필요 시 수정해주세요.',
      });
    } catch (err) {
      console.error('이전 정보 로드 실패:', err);
      setLoadMessage({
        type: 'error',
        text: '이전 정보를 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setLoadingPrevious(false);
    }
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
    if (!formData.privacyConsent) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        student_name: formData.studentName.trim(),
        parent_phone: formatPhone(formData.parentPhone),
        school: formData.school.trim(),
        grade: formData.grade,
        math_level: formData.mathLevel.trim(),
        course_option: COURSE_OPTION_PREREG, // 0 = 9월 사전 신청 (관리자 매핑)
        notes: formData.notes.trim() || null,
        privacy_consent: 'Y',
        status: '신청',
      };

      const { error: dbError } = await supabase
        .from('course_enrollments')
        .insert([payload]);

      if (dbError) throw dbError;

      setCompletedEnrollment(payload);
      setStep('complete');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('사전 신청 저장 실패:', err);
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
      notes: '',
      privacyConsent: false,
    });
    setCompletedEnrollment(null);
    setError('');
    setSurname('');
    setPreviousLoaded(false);
    setLoadMessage({ type: '', text: '' });
    setStep('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================
  // 완료 화면
  // ============================================================
  if (step === 'complete' && completedEnrollment) {
    return (
      <div className="container" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
        <div className="card">
          <div className="text-center space-y-6">
            <div className="text-6xl">✅</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                신청이 접수되었습니다
              </h2>
              <p className="text-gray-600" style={{ lineHeight: 1.7 }}>
                학원에서 순차적으로 연락드려<br />
                진도 확인과 반 배정을 안내해 드립니다.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 space-y-3 text-left">
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
              <div className="flex justify-between mt-2">
                <span className="text-gray-600">학교 · 학년</span>
                <span className="font-semibold">
                  {completedEnrollment.school} · {completedEnrollment.grade}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              <p className="font-semibold text-sm">📌 안내사항</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 본 신청은 결제나 등록 확정이 아닌 사전 관심 등록입니다.</li>
                <li>• 학원에서 접수 확인 후 개별 연락드려 상세 안내드립니다.</li>
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

  // ============================================================
  // 신청 페이지
  // ============================================================
  return (
    <div className="container" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
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
        <h2>9월 개강 사전 신청</h2>
        <p className="select-guide" style={{ lineHeight: 1.7 }}>
          9월 정규 개강 사전 신청입니다.<br />
          결제나 등록 확정이 아니며, 신청해 주시면 학원에서 개별 연락드려
          진도 확인과 반 배정을 안내해 드립니다.
        </p>
      </div>

      {/* 신청 폼 */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginTop: '16px' }}>
          <h3
            style={{
              fontSize: '17px',
              fontWeight: 700,
              margin: '0 0 16px',
              color: 'var(--color-primary-dark)',
            }}
          >
            신청 정보 입력
          </h3>

          <div className="space-y-4">
            {/* 학부모 연락처 (먼저 받고 이전 정보 불러오기로 학생명·학교·학년 자동 채움) */}
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

            {/* 이전 정보 불러오기 */}
            <div
              style={{
                background: 'var(--color-primary-light)',
                border: '1px solid #bcd7f5',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--color-primary-dark)',
                  marginBottom: '4px',
                }}
              >
                📂 이전 정보 불러오기
              </div>
              <p style={{ fontSize: '12.5px', color: '#4a6d8f', margin: '0 0 10px', lineHeight: 1.5 }}>
                설명회 예약 시 입력한 정보가 있다면, 학생 성을 입력해 자동으로
                채울 수 있습니다.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="예: 홍"
                  maxLength={2}
                  className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary"
                  style={{ width: '80px', flexShrink: 0, fontSize: '14px' }}
                />
                <button
                  type="button"
                  onClick={handleLoadPrevious}
                  disabled={loadingPrevious}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    background: loadingPrevious ? '#9ca3af' : 'white',
                    color: loadingPrevious ? 'white' : 'var(--color-primary-dark)',
                    border: '1.5px solid var(--color-primary)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: loadingPrevious ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingPrevious ? '조회 중...' : '불러오기'}
                </button>
              </div>
              {loadMessage.text && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    background:
                      loadMessage.type === 'success'
                        ? '#e8f5e9'
                        : loadMessage.type === 'error'
                        ? '#fef2f2'
                        : '#f3f4f6',
                    color:
                      loadMessage.type === 'success'
                        ? '#2e7d32'
                        : loadMessage.type === 'error'
                        ? '#b91c1c'
                        : '#4b5563',
                    border: `1px solid ${
                      loadMessage.type === 'success'
                        ? '#a5d6a7'
                        : loadMessage.type === 'error'
                        ? '#fecaca'
                        : '#e5e7eb'
                    }`,
                  }}
                >
                  {loadMessage.type === 'success' && '✅ '}
                  {loadMessage.text}
                </div>
              )}
            </div>

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
                <p>- 9월 개강 사전 신청 접수 및 학원 개별 안내</p>
                <p>- 진도 확인 상담 및 반 배정 안내</p>

                <h4>2. 수집하는 개인정보 항목</h4>
                <table>
                  <tbody>
                    <tr>
                      <th>필수항목</th>
                      <td>
                        학생명, 학부모 연락처, 학교, 학년, 수학 선행정도
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
                  - 동의를 거부할 권리가 있으며, 거부 시 사전 신청이 불가능합니다.
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
                  <strong style={{ whiteSpace: 'nowrap' }}>[필수]</strong> 위 개인정보 수집 및 이용에 동의합니다.
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
              {submitting ? '신청 중...' : '9월 개강 사전 신청하기'}
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
          </div>
        </div>
      </form>
    </div>
  );
}
