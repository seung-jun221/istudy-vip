// src/components/consulting/TimeSelector.jsx - 수정본
import { useEffect } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

export default function TimeSelector({ onNext, onBack }) {
  const {
    selectedDate,
    selectedTime,
    setSelectedTime,
    timeSlots,
    loadTimeSlots,
    availableDates,
    selectedLocation,
  } = useConsulting();

  // ⭐ 시간 페이지 진입 시 항상 다시 로드
  useEffect(() => {
    if (selectedDate && selectedLocation) {
      console.log('시간 슬롯 로딩:', selectedDate, selectedLocation);
      loadTimeSlots(selectedDate, selectedLocation);
    }
  }, []); // ⭐ 빈 배열: 컴포넌트 마운트 시 한 번만 실행

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handleNext = () => {
    if (!selectedTime) {
      return;
    }
    onNext();
  };

  const dateInfo = availableDates.find((d) => d.date === selectedDate);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">컨설팅 시간 선택</h3>
        <p className="text-gray-600 text-sm">
          {selectedLocation && (
            <span className="font-medium text-primary">{selectedLocation}</span>
          )}{' '}
          {dateInfo?.display} ({dateInfo?.dayOfWeek}요일)의 예약 가능한
          시간입니다.
        </p>
      </div>

      {/* ⭐ 로딩 중 표시 추가 */}
      {timeSlots.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-700 font-medium">
            시간 정보를 불러오는 중...
          </p>
          <p className="text-sm text-gray-600 mt-2">잠시만 기다려주세요</p>
        </div>
      )}

      {timeSlots.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {timeSlots.map((slot) => {
            const timeStr = slot.time.slice(0, 5);
            const availableSeats = slot.max_capacity - slot.current_bookings;
            const isAvailable = slot.isAvailable;

            return (
              <div
                key={slot.id}
                onClick={() => (isAvailable ? handleTimeSelect(timeStr) : null)}
                className={`
                  border rounded-lg p-4 transition-all text-center
                  ${
                    !isAvailable
                      ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                      : selectedTime === timeStr
                      ? 'border-primary bg-primary text-white cursor-pointer'
                      : 'border-gray-300 hover:border-primary hover:bg-gray-50 cursor-pointer'
                  }
                `}
              >
                <div className="text-lg font-semibold mb-1">{timeStr}</div>
                <div className="text-xs">
                  {isAvailable ? `잔여 ${availableSeats}석` : '예약 마감'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 날짜 다시 선택
        </Button>
        <Button onClick={handleNext} disabled={!selectedTime}>
          예약 확정하기
        </Button>
      </div>
    </div>
  );
}
