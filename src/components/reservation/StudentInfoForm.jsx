import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useReservation } from '../../context/ReservationContext';
import { supabase, hashPassword } from '../../utils/supabase';
import { formatPhone } from '../../utils/format';
import { sendReservationConfirmSms, sendWaitlistConfirmSms } from '../../utils/smsService';

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

  const [surname, setSurname] = useState('');
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // 중복 예약 변경 확인 모달 상태
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingReservation, setExistingReservation] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 이전 정보 불러오기
  const handleLoadPrevious = async () => {
    if (!surname || surname.length < 1) {
      showToast('성을 입력해주세요.', 'error');
      return;
    }

    setLoadingPrevious(true);

    try {
      // 전화번호와 성(학생명 첫 글자)으로 이전 예약 조회
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', phone)
        .neq('status', '취소')
        .order('registered_at', { ascending: false });

      if (error) throw error;

      if (!reservations || reservations.length === 0) {
        showToast('이전 예약 정보를 찾을 수 없습니다.', 'info');
        setLoadingPrevious(false);
        return;
      }

      // 성씨가 일치하는 예약 찾기
      const matchingReservation = reservations.find((r) =>
        r.student_name?.startsWith(surname)
      );

      if (!matchingReservation) {
        showToast(`성이 "${surname}"인 예약을 찾을 수 없습니다.`, 'info');
        setLoadingPrevious(false);
        return;
      }

      // 이전 정보 자동 입력 (선행정도는 비움)
      setFormData((prev) => ({
        ...prev,
        studentName: matchingReservation.student_name,
        school: matchingReservation.school,
        grade: matchingReservation.grade,
        mathLevel: '', // 선행정도는 비움
      }));

      showToast('이전 정보를 불러왔습니다.', 'success');
    } catch (error) {
      console.error('이전 정보 로드 실패:', error);
      showToast('이전 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoadingPrevious(false);
    }
  };

  // 중복 예약 체크
  const checkDuplicateReservation = async () => {
    // 캠페인의 중복 예약 허용 여부 확인
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('allow_duplicate_reservation')
      .eq('id', selectedSeminar.campaign_id)
      .single();

    // 중복 예약 허용이면 체크 필요 없음
    if (campaign?.allow_duplicate_reservation !== false) {
      return null;
    }

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0];

    // 같은 캠페인 내 같은 연락처로 기존 예약이 있는지 확인
    const { data: existingReservations } = await supabase
      .from('reservations')
      .select(`
        *,
        seminar_slots (title, date, time, location)
      `)
      .eq('campaign_id', selectedSeminar.campaign_id)
      .eq('parent_phone', phone)
      .in('status', ['예약', '대기']);

    // 미래 날짜의 예약만 필터링 (날짜가 지난 예약은 제외)
    const futureReservations = existingReservations?.filter(
      (r) => r.seminar_slots?.date >= today
    );

    if (futureReservations && futureReservations.length > 0) {
      return futureReservations[0];
    }

    return null;
  };

  // 기존 예약 취소 후 새 예약 생성
  const replaceReservation = async () => {
    setShowDuplicateModal(false);
    setLoading(true);

    try {
      // 기존 예약 취소
      await supabase
        .from('reservations')
        .update({ status: '취소' })
        .eq('id', existingReservation.id);

      // 새 예약 생성
      await createReservation();
    } catch (error) {
      console.error('예약 변경 실패:', error);
      showToast('예약 변경 중 오류가 발생했습니다.', 'error');
      setLoading(false);
    }
  };

  // 실제 예약 생성 로직
  const createReservation = async () => {
    const reservationData = {
      reservation_id: 'R' + Date.now(),
      seminar_slot_id: selectedSeminar.id,
      campaign_id: selectedSeminar.campaign_id,
      student_name: formData.studentName,
      parent_phone: formatPhone(phone),
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

    // SMS 발송 (비동기로 처리, 실패해도 예약은 완료)
    try {
      const isWaitlist = selectedSeminar.isFull;
      const eventDate = selectedSeminar.date ? new Date(selectedSeminar.date).toLocaleDateString('ko-KR') : '';
      const eventTime = selectedSeminar.time || '';

      if (isWaitlist) {
        await sendWaitlistConfirmSms({
          studentName: formData.studentName,
          parentPhone: phone,
          eventDate,
        });
      } else {
        await sendReservationConfirmSms({
          studentName: formData.studentName,
          parentPhone: phone,
          eventDate,
          eventTime,
          location: selectedSeminar.location,
        });
      }
    } catch (smsError) {
      console.error('SMS 발송 실패:', smsError);
      // SMS 실패해도 예약은 완료 처리
    }

    showToast('예약이 완료되었습니다!', 'success');
    onComplete(data);
    setLoading(false);
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
      // 중복 예약 체크
      const duplicate = await checkDuplicateReservation();

      if (duplicate) {
        // 중복 예약이 있으면 모달 표시
        setExistingReservation(duplicate);
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      // 중복 없으면 바로 예약 생성
      await createReservation();
    } catch (error) {
      console.error('예약 실패:', error);
      showToast('예약 처리 중 오류가 발생했습니다.', 'error');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 이전 정보 불러오기 */}
      {!previousInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">
            📂 이전 정보 불러오기
          </h4>
          <p className="text-xs text-blue-700 mb-3">
            이전에 설명회 예약을 하신 적이 있다면, 학생 성을 입력하여 정보를
            불러올 수 있습니다.
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="예: 홍"
              className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-primary"
              style={{ width: '80px', flexShrink: 0 }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleLoadPrevious}
              disabled={loadingPrevious}
              style={{ whiteSpace: 'nowrap', flex: '1', minWidth: '0' }}
            >
              {loadingPrevious ? '조회중...' : '불러오기'}
            </Button>
          </div>
        </div>
      )}

      {/* 이전 정보 로드 알림 */}
      {previousInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-700 text-sm">
            ✅ 학교와 학년 정보를 불러왔습니다. 확인 후 수정 가능합니다.
          </p>
        </div>
      )}

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
          <p>- 설명회 참석 신청 및 관리</p>
          <p>- 설명회 관련 안내 사항 전달</p>
          <p>- 설명회 참석 후 개별 컨설팅 예약 관리</p>
          <p>- 대기예약 신청 시 취소자 발생 안내</p>

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
          <p>- 다만, 동의를 거부할 경우 설명회 예약이 불가능합니다.</p>
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
        <Button type="submit">
          {selectedSeminar?.isFull ? '대기예약 신청' : '예약 확정'}
        </Button>
      </div>

      {/* 중복 예약 변경 확인 모달 */}
      {showDuplicateModal && existingReservation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowDuplicateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>⚠️</span>
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              이미 예약이 있습니다
            </h3>
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>
                <strong>기존 예약 정보:</strong>
              </p>
              <p style={{ fontSize: '14px', color: '#78350f' }}>
                {existingReservation.seminar_slots?.title || '설명회'}<br />
                {existingReservation.seminar_slots?.date} {existingReservation.seminar_slots?.time?.slice(0, 5)}<br />
                {existingReservation.seminar_slots?.location}
              </p>
            </div>
            <p style={{
              fontSize: '14px',
              color: '#4b5563',
              textAlign: 'center',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              기존 예약을 취소하고<br />
              선택하신 설명회로 변경하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDuplicateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={replaceReservation}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                예약 변경
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
