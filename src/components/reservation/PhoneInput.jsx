import { useState } from 'react';
import { validatePhone } from '../../utils/format';
import { useReservation } from '../../context/ReservationContext';
import { supabase } from '../../utils/supabase';
import DuplicateReservationModal from './DuplicateReservationModal';

export default function PhoneInput({
  onNext,
  onNavigateToCheck,
}) {
  const [phone, setPhone] = useState('');
  const { selectedSeminar, showToast, setLoading } = useReservation();

  // 중복 예약 모달 상태
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateReservation, setDuplicateReservation] = useState(null);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length >= 4 && value.length <= 7) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length >= 8) {
      formatted =
        value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }

    setPhone(formatted);
  };

  // 중복 체크 함수
  const checkDuplicate = async (phoneNumber) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(
          `
          *,
          seminars:seminar_id (
            id,
            title,
            date,
            time,
            location
          )
        `
        )
        .eq('parent_phone', phoneNumber)
        .eq('seminar_id', selectedSeminar.id)
        .in('status', ['예약', '대기']);

      if (error) throw error;

      // 중복 예약이 있으면 true 반환
      if (data && data.length > 0) {
        const reservationWithSeminar = {
          ...data[0],
          seminar_title: data[0].seminars?.title || selectedSeminar.title,
          seminar_date: data[0].seminars?.date || selectedSeminar.date,
          seminar_time: data[0].seminars?.time || selectedSeminar.time,
        };
        setDuplicateReservation(reservationWithSeminar);
        return true;
      }

      return false;
    } catch (error) {
      console.error('중복 체크 실패:', error);
      return false;
    }
  };

  // [다음] 버튼 클릭
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      showToast('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    setLoading(true);

    // 중복 체크
    const isDuplicate = await checkDuplicate(phone);

    setLoading(false);

    if (isDuplicate) {
      // 중복 발견 - 모달 표시
      setShowDuplicateModal(true);
    } else {
      // 중복 없음 - 다음 단계로
      onNext(phone);
    }
  };

  // 예약 상세보기 핸들러 - 예약 확인 페이지로 이동
  const handleViewDetails = () => {
    setShowDuplicateModal(false);

    // 부모 컴포넌트에 전화번호와 함께 예약 확인 페이지로 이동 요청
    if (onNavigateToCheck) {
      onNavigateToCheck(phone);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowDuplicateModal(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* 전화번호 입력 */}
        <div className="form-group">
          <label>학부모 연락처</label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength="13"
            required
            autoFocus
          />
        </div>

        {/* 버튼 그룹 */}
        <div className="btn-group">
          <button type="submit" className="btn btn-primary">
            다음
          </button>
        </div>
      </form>

      {/* 중복 예약 모달 */}
      {showDuplicateModal && duplicateReservation && (
        <DuplicateReservationModal
          reservation={duplicateReservation}
          onViewDetails={handleViewDetails}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
