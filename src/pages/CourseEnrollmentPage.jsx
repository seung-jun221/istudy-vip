import { useState, useRef } from 'react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { supabase } from '../utils/supabase';
import { formatPhone, validatePhone } from '../utils/format';

// 브랜드 톤
const BRAND = {
  green: '#0d3b2e',
  greenSoft: '#164a3a',
  greenLight: '#e6f0eb',
  gold: '#b58a2b',
  goldSoft: '#f5ecd6',
  ink: '#1f2937',
  muted: '#6b7280',
  border: '#d1d5db',
};

// 4개 과정 상세 데이터
const COURSES = [
  {
    id: 1,
    number: '①',
    name: '초등 교과반 바로 입학',
    subtitle: null,
    progressRange: '초4-2 ~ 초6-2 진행 중',
    forWhom: [
      '초등 교과 과정을 진행 중인 학생',
      '사고력 중심으로 초등 수학을 탄탄히 다지고 싶은 학생',
    ],
    what: '주 2회 교과 진행반. 학년 교과 진도를 사고력 중심으로 학습합니다.',
    next: '중등 진입 시 자연스럽게 상위 과정으로 연계됩니다.',
    schedule: null,
  },
  {
    id: 2,
    number: '②',
    name: '중등수학 입문특강 (프리모노)',
    subtitle: '→ 9월 정규반 or 주1회 수리탐구반',
    progressRange: '초6-1 ~ 중1-2 진행 중',
    forWhom: [
      '앞으로 6개월 안에 중등 과정을 시작할 예정인 학생',
      '중1-1 기본은 나갔지만 제대로 소화됐는지 불안한 학생',
      '무작정 진도만 빼는 선행이 아니라, 제대로 된 기초를 잡고 싶은 학생',
    ],
    what: "중1-1 핵심 기본개념(약수·소수 → 정수·유리수 → 일차식)을 '수의 구조를 읽는 사고력' 중심으로 잡아주는 여름 방학특강입니다.",
    teacher: '이시용 대표 직강 · 강의 1.5h + 클리닉 1.5h',
    next: '특강 수료 후 9월 모노 정규과정 진입 또는 주1회 수리탐구반으로 이어집니다.',
    schedule: {
      time: '매주 월 12:00~15:00',
      dates: '7/27 · 8/3 · 8/10 · 8/24 (4회)',
      fee: '28만원',
    },
  },
  {
    id: 3,
    number: '③',
    name: '고등연계 중등심화특강 (모노 방부함)',
    subtitle: '→ 9월 정규반 or 주1회 수리탐구반',
    progressRange: '중2-1 ~ 중3-2 진행 중',
    forWhom: [
      '방정식·부등식·함수의 기본은 알지만, 깊이 있는 개념학습을 원하는 학생',
      '쉬운 문제는 잘 풀지만, 한 단계 어려워지면 막히는 학생',
      '고등까지 이어지는 탄탄한 개념을 쌓고 싶은 학생',
    ],
    what: '중1-1 방정식·부등식·함수를 고등 연계 수준(항등식·특수한 해·절댓값 등)까지 깊이 있게 완성하는 여름 방학특강입니다.',
    teacher: '이시용 대표 직강 · 강의 1.5h + 클리닉 1.5h',
    next: '특강 수료 후 9월 다이(DI) 정규과정 진입 또는 주1회 수리탐구반으로 이어집니다.',
    schedule: {
      time: '매주 월·수 12:00~15:00',
      dates: '7/22 ~ 8/12 (6회)',
      fee: '42만원',
    },
  },
  {
    id: 4,
    number: '④',
    name: '고등 교과반 바로 입학',
    subtitle: null,
    progressRange: '고1(공통수학1) 이상 진행 중',
    forWhom: ['고등 과정을 진행 중이며, 교과와 사고력을 병행하고 싶은 학생'],
    what: '정규반(교과 진도 + 수리탐구) 또는 주1회 수리탐구반으로 진행합니다.',
    next: '현재 진도와 목표에 맞춰 반이 배정됩니다.',
    schedule: null,
  },
];

const PROGRESS_GUIDE = [
  { range: '초4-2 ~ 초6-2', course: '① 초등 교과반' },
  { range: '초6-1 ~ 중1-2', course: '② 중등수학 입문특강 (프리모노)' },
  { range: '중2-1 ~ 중3-2', course: '③ 고등연계 중등심화특강 (모노 방부함)' },
  { range: '고1(공통수학1) 이상', course: '④ 고등 교과반' },
];

const CENTER_PHONE = '051-715-1580';

export default function CourseEnrollmentPage() {
  const formRef = useRef(null);
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

  const handleSelectCourseFromCard = (id) => {
    setFormData((prev) => ({ ...prev, courseOption: String(id) }));
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
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
    const chosen = COURSES.find(
      (c) => c.id === completedEnrollment.course_option
    );
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7f6', padding: '20px 12px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px 24px',
              boxShadow: '0 4px 20px rgba(13, 59, 46, 0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: BRAND.green, marginBottom: '8px' }}>
              신청이 완료되었습니다
            </h2>
            <p style={{ color: BRAND.muted, marginBottom: '24px', lineHeight: 1.6 }}>
              선택하신 과정으로 학원에서 곧<br />
              연락드려 상세 안내해 드리겠습니다.
            </p>

            <div
              style={{
                background: BRAND.greenLight,
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '13px', color: BRAND.muted, marginBottom: '6px' }}>
                신청하신 과정
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: BRAND.green, lineHeight: 1.5 }}>
                {chosen?.number} {chosen?.name}
                {chosen?.subtitle && (
                  <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px', color: BRAND.greenSoft }}>
                    {chosen.subtitle}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '14px',
                color: BRAND.ink,
              }}
            >
              <div style={{ marginBottom: '10px', fontWeight: 600 }}>📌 안내사항</div>
              <ul style={{ paddingLeft: '18px', margin: 0, color: BRAND.muted, lineHeight: 1.8 }}>
                <li>학원에서 접수 확인 후 개별 연락드립니다.</li>
                <li>수업 시간 및 반 배정은 상담 후 확정됩니다.</li>
                <li>
                  문의:{' '}
                  <a
                    href={`tel:${CENTER_PHONE}`}
                    style={{ color: BRAND.green, fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {CENTER_PHONE}
                  </a>
                </li>
              </ul>
            </div>

            <button
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '12px',
                background: 'white',
                color: BRAND.green,
                border: `1.5px solid ${BRAND.green}`,
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
              }}
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
    <div style={{ minHeight: '100vh', background: '#f5f7f6', padding: '20px 12px 60px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.green} 0%, ${BRAND.greenSoft} 100%)`,
            borderRadius: '16px',
            padding: '28px 24px',
            marginBottom: '16px',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <img
            src="/assets/images/istudy-logo.png"
            alt="i.study"
            style={{
              height: '38px',
              marginBottom: '12px',
              filter: 'brightness(0) invert(1)',
            }}
          />
          <div
            style={{
              fontSize: '13px',
              color: BRAND.goldSoft,
              letterSpacing: '2px',
              marginBottom: '6px',
            }}
          >
            수리탐구 사직점
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              margin: 0,
              marginBottom: '10px',
              lineHeight: 1.3,
            }}
          >
            7월 수강신청
          </h1>
          <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6, opacity: 0.9 }}>
            설명회에 참석해 주셔서 감사합니다.<br />
            아래에서 우리 아이에게 맞는 과정을 확인하고 신청해 주세요.
          </p>
        </div>

        {/* 진도별 길잡이 */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px 20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(13, 59, 46, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '4px',
                height: '18px',
                background: BRAND.gold,
                borderRadius: '2px',
              }}
            />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: BRAND.green, margin: 0 }}>
              진도별 길잡이
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: BRAND.muted, margin: '0 0 14px', lineHeight: 1.6 }}>
            우리 아이 현재 진도를 확인하고, 맞는 과정을 선택하세요.
          </p>

          <div
            style={{
              border: `1px solid ${BRAND.border}`,
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.3fr',
                background: BRAND.greenLight,
                padding: '10px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: BRAND.green,
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
                  padding: '11px 12px',
                  fontSize: '13px',
                  borderTop: idx === 0 ? 'none' : `1px solid ${BRAND.border}`,
                  color: BRAND.ink,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 600 }}>{row.range} 진행 중</div>
                <div style={{ color: BRAND.greenSoft, fontWeight: 500 }}>{row.course}</div>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: '12px',
              color: BRAND.muted,
              margin: '12px 0 0',
              lineHeight: 1.6,
              padding: '10px 12px',
              background: '#fafaf7',
              borderRadius: '8px',
              borderLeft: `3px solid ${BRAND.gold}`,
            }}
          >
            진도가 겹치는 경우 두 과정 모두 신청 가능하며, 학원에서 상담 후 가장
            적합한 과정으로 안내드립니다.
          </p>
        </div>

        {/* 4개 과정 카드 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 4px 12px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '4px',
                height: '18px',
                background: BRAND.gold,
                borderRadius: '2px',
              }}
            />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: BRAND.green, margin: 0 }}>
              4가지 과정 상세
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {COURSES.map((course) => {
              const isSelected = formData.courseOption === String(course.id);
              return (
                <div
                  key={course.id}
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '18px 18px 16px',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${BRAND.green}, 0 4px 16px rgba(13, 59, 46, 0.12)`
                      : '0 2px 8px rgba(13, 59, 46, 0.06)',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  {/* 상단: 번호 배지 + 이름 */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <div
                      style={{
                        flexShrink: 0,
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: BRAND.green,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 700,
                      }}
                    >
                      {course.number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: BRAND.ink,
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {course.name}
                      </h3>
                      {course.subtitle && (
                        <div
                          style={{
                            fontSize: '13px',
                            color: BRAND.greenSoft,
                            marginTop: '3px',
                            lineHeight: 1.4,
                          }}
                        >
                          {course.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 현재 진도 뱃지 */}
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '5px 10px',
                      background: BRAND.goldSoft,
                      color: BRAND.gold,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '14px',
                    }}
                  >
                    현재 진도 · {course.progressRange}
                  </div>

                  {/* 이런 학생에게 */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: BRAND.gold,
                        fontWeight: 700,
                        marginBottom: '6px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      이런 학생에게
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {course.forWhom.map((item, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: '13.5px',
                            color: BRAND.ink,
                            lineHeight: 1.6,
                            paddingLeft: '18px',
                            position: 'relative',
                            marginBottom: '3px',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '2px',
                              color: BRAND.green,
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 무엇을 하나요 */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: BRAND.gold,
                        fontWeight: 700,
                        marginBottom: '6px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      무엇을 하나요
                    </div>
                    <p
                      style={{
                        fontSize: '13.5px',
                        color: BRAND.ink,
                        margin: 0,
                        lineHeight: 1.7,
                      }}
                    >
                      {course.what}
                    </p>
                    {course.teacher && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: BRAND.muted,
                          margin: '6px 0 0',
                          lineHeight: 1.5,
                        }}
                      >
                        {course.teacher}
                      </p>
                    )}
                  </div>

                  {/* 그다음은 */}
                  <div style={{ marginBottom: course.schedule ? '14px' : '16px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: BRAND.gold,
                        fontWeight: 700,
                        marginBottom: '6px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      그다음은
                    </div>
                    <p
                      style={{
                        fontSize: '13.5px',
                        color: BRAND.ink,
                        margin: 0,
                        lineHeight: 1.7,
                      }}
                    >
                      {course.next}
                    </p>
                  </div>

                  {/* 일정·수강료 (특강만) */}
                  {course.schedule && (
                    <div
                      style={{
                        background: BRAND.greenLight,
                        borderRadius: '10px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: BRAND.green,
                          fontWeight: 700,
                          marginBottom: '8px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        📅 일정 · 수강료
                      </div>
                      <div style={{ fontSize: '13px', color: BRAND.ink, lineHeight: 1.8 }}>
                        <div>
                          <span style={{ color: BRAND.muted, marginRight: '6px' }}>시간</span>
                          {course.schedule.time}
                        </div>
                        <div>
                          <span style={{ color: BRAND.muted, marginRight: '6px' }}>일정</span>
                          {course.schedule.dates}
                        </div>
                        <div style={{ fontWeight: 700, color: BRAND.green, marginTop: '4px' }}>
                          수강료 {course.schedule.fee}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={() => handleSelectCourseFromCard(course.id)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: isSelected ? BRAND.gold : BRAND.green,
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14.5px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {isSelected ? '✓ 선택됨 · 아래 폼에서 정보 입력' : '이 과정 신청하기'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 신청 폼 */}
        <div
          ref={formRef}
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '22px 20px',
            boxShadow: '0 2px 8px rgba(13, 59, 46, 0.06)',
            scrollMarginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '4px',
                height: '18px',
                background: BRAND.gold,
                borderRadius: '2px',
              }}
            />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: BRAND.green, margin: 0 }}>
              신청 정보 입력
            </h2>
          </div>

          {/* 선택된 과정 표시 */}
          {formData.courseOption && (
            <div
              style={{
                background: BRAND.greenLight,
                border: `1px solid ${BRAND.green}`,
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', color: BRAND.muted, marginBottom: '4px' }}>
                선택하신 과정
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: BRAND.green, lineHeight: 1.5 }}>
                {COURSES.find((c) => c.id === parseInt(formData.courseOption))?.number}{' '}
                {COURSES.find((c) => c.id === parseInt(formData.courseOption))?.name}
              </div>
            </div>
          )}

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
              label="현재 수학 선행정도"
              value={formData.mathLevel}
              onChange={(e) => handleChange('mathLevel', e.target.value)}
              placeholder="예: 중3 (고1 선행 중)"
              required
            />

            {/* 희망 수강 옵션 (라디오 — 카드에서 자동 선택되지만 여기서도 변경 가능) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                희망 수강 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-2">
                {COURSES.map((course) => (
                  <label
                    key={course.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      border: `1.5px solid ${
                        formData.courseOption === String(course.id)
                          ? BRAND.green
                          : BRAND.border
                      }`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background:
                        formData.courseOption === String(course.id)
                          ? BRAND.greenLight
                          : 'white',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="courseOption"
                      value={course.id}
                      checked={formData.courseOption === String(course.id)}
                      onChange={(e) => handleChange('courseOption', e.target.value)}
                      style={{ marginTop: '3px', flexShrink: 0 }}
                    />
                    <div style={{ fontSize: '13.5px', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, color: BRAND.ink }}>
                        {course.number} {course.name}
                      </div>
                      {course.subtitle && (
                        <div style={{ fontSize: '12px', color: BRAND.muted, marginTop: '2px' }}>
                          {course.subtitle}
                        </div>
                      )}
                    </div>
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
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                background: submitting ? BRAND.muted : BRAND.green,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '15.5px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              {submitting ? '신청 중...' : '수강신청 하기'}
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: '12.5px',
                color: BRAND.muted,
                margin: '12px 0 0',
                lineHeight: 1.6,
              }}
            >
              문의 ·{' '}
              <a
                href={`tel:${CENTER_PHONE}`}
                style={{ color: BRAND.green, fontWeight: 600, textDecoration: 'underline' }}
              >
                {CENTER_PHONE}
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
