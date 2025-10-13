import { useState } from 'react';
import Button from '../common/Button';
import { formatDate, formatTime, formatPhone } from '../../utils/format';
import { useReservation } from '../../context/ReservationContext';
import { supabase, hashPassword } from '../../utils/supabase';

export default function ReservationResult({ reservation, onBack, onHome }) {
  const { showToast, setLoading } = useReservation();

  const handleCancel = async () => {
    if (!window.confirm('정말로 예약을 취소하시겠습니까?')) {
      return;
    }

    const password = window.prompt('비밀번호를 입력해주세요 (6자리 숫자):');

    if (!password || password.length !== 6 || !/^\d{6}$/.test(password)) {
      showToast('올바른 비밀번호를 입력해주세요.', 'error');
      return;
    }

    if (hashPassword(password) !== reservation.password) {
      showToast('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: '취소' })
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">예약 정보</h2>

      <div className="bg-blue-50 rounded-lg p-6 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">예약번호</span>
          <span className="font-semibold">{reservation.reservation_id}</span>
        </div>

        {reservation.status === '대기' && (
          <div className="flex justify-between">
            <span className="text-gray-600">예약 유형</span>
            <span className="font-semibold text-orange-600">
              대기예약{' '}
              {reservation.waitlist_number &&
                `(${reservation.waitlist_number}번째)`}
            </span>
          </div>
        )}

        <div className="flex justify-between border-t pt-3">
          <span className="text-gray-600">설명회</span>
          <span className="font-semibold">{reservation.seminar?.title}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">날짜</span>
          <span className="font-semibold">
            {formatDate(reservation.seminar?.date)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">시간</span>
          <span className="font-semibold">
            {formatTime(reservation.seminar?.time)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">장소</span>
          <span className="font-semibold">{reservation.seminar?.location}</span>
        </div>

        <div className="flex justify-between border-t pt-3">
          <span className="text-gray-600">학생명</span>
          <span className="font-semibold">{reservation.student_name}</span>
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

        <div className="flex justify-between">
          <span className="text-gray-600">수학 선행정도</span>
          <span className="font-semibold">{reservation.math_level}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleCancel}
          variant="secondary"
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          예약 취소하기
        </Button>
        <Button onClick={onHome}>홈으로 돌아가기</Button>
      </div>
    </div>
  );
}
