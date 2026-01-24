// src/components/consulting/EntranceTestResult.jsx
// 입학테스트 예약 확인 결과 화면
import { useState } from 'react';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase } from '../../utils/supabase';

export default function EntranceTestResult({ reservation, onBack, onHome }) {
  const { showToast, setLoading } = useConsulting();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!reservation) return null;

  const testSlot = reservation.test_slots;

  // 날짜 포맷팅
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}월 ${day}일 (${dayName})`;
  };

  // 시간 포맷팅
  const formatTime = (timeStr) => {
    return timeStr?.slice(0, 5) || '';
  };

  // 예약 취소 가능 여부 확인
  const canCancel = () => {
    if (!testSlot?.date) return false;
    const testDate = new Date(testSlot.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return testDate > today;
  };

  // 예약 취소 처리
  const handleCancel = async () => {
    setLoading(true);

    try {
      // 예약 상태를 '취소'로 변경
      const { error: updateError } = await supabase
        .from('test_reservations')
        .update({ status: '취소' })
        .eq('id', reservation.id);

      if (updateError) throw updateError;

      // 슬롯 예약 카운트 감소
      if (testSlot) {
        const { error: slotError } = await supabase
          .from('test_slots')
          .update({ current_bookings: Math.max(0, testSlot.current_bookings - 1) })
          .eq('id', testSlot.id);

        if (slotError) {
          console.error('슬롯 카운트 업데이트 실패:', slotError);
        }
      }

      showToast('예약이 취소되었습니다.', 'success');
      setShowCancelConfirm(false);
      onHome();
    } catch (error) {
      console.error('예약 취소 실패:', error);
      showToast('예약 취소 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        입학테스트 예약 정보
      </h2>

      {/* 예약 정보 카드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">학생명</span>
            <span className="font-medium">{reservation.student_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">연락처</span>
            <span className="font-medium">{reservation.parent_phone}</span>
          </div>
          {reservation.school && (
            <div className="flex justify-between">
              <span className="text-gray-600">학교</span>
              <span className="font-medium">{reservation.school}</span>
            </div>
          )}
          {reservation.grade && (
            <div className="flex justify-between">
              <span className="text-gray-600">학년</span>
              <span className="font-medium">{reservation.grade}</span>
            </div>
          )}
          <hr className="border-blue-200" />
          <div className="flex justify-between">
            <span className="text-gray-600">지역</span>
            <span className="font-medium">{testSlot?.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">날짜</span>
            <span className="font-medium">{formatDate(testSlot?.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">시간</span>
            <span className="font-medium">{formatTime(testSlot?.time)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">상태</span>
            <span className="font-medium text-blue-600">
              {reservation.status === 'confirmed' || reservation.status === '예약'
                ? '예약 완료'
                : reservation.status}
            </span>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
          <span>💡</span> 안내사항
        </h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• 테스트 소요시간은 약 <strong>80분</strong>입니다.</li>
          <li>• 예약 시간 <strong>10분 전</strong>까지 도착해주세요.</li>
          <li>• 필기도구를 지참해주세요.</li>
          <li>• 컨설팅은 테스트 결과 확인 후 학원에서 개별 연락드립니다.</li>
        </ul>
      </div>

      {/* 취소 확인 모달 */}
      {showCancelConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 mb-4">
            정말로 예약을 취소하시겠습니까?<br />
            취소 후에는 복구할 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="btn btn-secondary flex-1"
            >
              아니오
            </button>
            <button
              onClick={handleCancel}
              className="btn flex-1"
              style={{ background: '#dc2626', color: 'white' }}
            >
              예, 취소합니다
            </button>
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="space-y-2">
        {canCancel() && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="btn w-full"
            style={{
              background: 'white',
              color: '#dc2626',
              border: '1px solid #dc2626',
            }}
          >
            예약 취소
          </button>
        )}

        <button onClick={onHome} className="btn btn-primary w-full">
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
