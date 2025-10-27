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

  const [surname, setSurname] = useState('');
  const [loadingPrevious, setLoadingPrevious] = useState(false);

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
      // 예약 데이터 생성 (중복 체크는 이미 2단계에서 완료!)
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
    </form>
  );
}
