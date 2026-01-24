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
      // 1. 동일 슬롯 중복 체크 (항상 체크)
      const { data: slotDuplicate, error: slotError } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', phoneNumber)
        .eq('seminar_slot_id', selectedSeminar.id)
        .in('status', ['예약', '대기']);

      if (slotError) throw slotError;

      if (slotDuplicate && slotDuplicate.length > 0) {
        const reservationWithSeminar = {
          ...slotDuplicate[0],
          seminar_title: selectedSeminar.title,
          seminar_date: selectedSeminar.date,
          seminar_time: selectedSeminar.time,
        };
        setDuplicateReservation(reservationWithSeminar);
        return true;
      }

      // 2. 캠페인 전체 중복 체크 (allow_duplicate_reservation이 false인 경우)
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('allow_duplicate_reservation')
        .eq('id', selectedSeminar.campaign_id)
        .single();

      // 중복 예약 불가 설정인 경우
      if (campaign?.allow_duplicate_reservation === false) {
        const today = new Date().toISOString().split('T')[0];

        const { data: campaignDuplicate, error: campaignError } = await supabase
          .from('reservations')
          .select(`
            *,
            seminar_slots (title, date, time, location)
          `)
          .eq('campaign_id', selectedSeminar.campaign_id)
          .eq('parent_phone', phoneNumber)
          .in('status', ['예약', '대기']);

        if (campaignError) throw campaignError;

        // 미래 날짜의 예약만 필터링
        const futureReservations = campaignDuplicate?.filter(
          (r) => r.seminar_slots?.date >= today
        );

        if (futureReservations && futureReservations.length > 0) {
          const existing = futureReservations[0];
          const reservationWithSeminar = {
            ...existing,
            seminar_title: existing.seminar_slots?.title || selectedSeminar.title,
            seminar_date: existing.seminar_slots?.date,
            seminar_time: existing.seminar_slots?.time,
          };
          setDuplicateReservation(reservationWithSeminar);
          return true;
        }
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
