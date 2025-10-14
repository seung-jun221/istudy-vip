import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase } from '../../utils/supabase';
import { formatPhone } from '../../utils/format';

export default function ConsultingResult({ reservation, onBack, onHome }) {
  const { showToast, setLoading } = useConsulting();

  const handleCancel = async () => {
    if (
      !window.confirm(
        '정말로 예약을 취소하시겠습니까?\n취소 후에는 복구할 수 없습니다.'
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('consulting_reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);

      if (error) throw error;

      showToast('예약이 취소되었습니다.', 'success');
      onHome();
    } catch (error) {
      console.error('예약 취소 실패:', error);
      showToast('예약 취소 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 예약 정보
  const slot = reservation.consulting_slots;
  const dateObj = new Date(slot.date);
  const dateStr = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[dateObj.getDay()];
  const timeStr = slot.time.slice(0, 5);

  // 예약번호
  const reservationId = reservation.id
    ? reservation.id.slice(0, 8).toUpperCase()
    : '-';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">예약 정보</h2>

      {/* 예약 정보 */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">예약번호</span>
          <span className="font-semibold">{reservationId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">학생명</span>
          <span className="font-semibold">{reservation.student_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">컨설팅 날짜</span>
          <span className="font-semibold">
            {dateStr} ({dayName})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">컨설팅 시간</span>
          <span className="font-semibold">{timeStr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">연락처</span>
          <span className="font-semibold">
            {formatPhone(reservation.parent_phone)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">학교</span>
          <span className="font-semibold">{reservation.school}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">학년</span>
          <span className="font-semibold">{reservation.grade}</span>
        </div>
      </div>

      {/* 버튼 그룹 */}
      <div className="flex flex-col gap-3">
        <Button variant="danger" onClick={handleCancel}>
          예약 취소하기
        </Button>
        <Button variant="secondary" onClick={onHome}>
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
