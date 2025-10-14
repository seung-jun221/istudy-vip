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

  useEffect(() => {
    if (selectedDate && selectedLocation) {
      loadTimeSlots(selectedDate, selectedLocation);
    }
  }, [selectedDate, selectedLocation]);

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

      {timeSlots.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium">
            예약 가능한 시간이 없습니다.
          </p>
        </div>
      )}

      {timeSlots.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {timeSlots.map((slot, index) => {
            const timeStr = slot.time.slice(0, 5);

            return (
              <div
                key={index}
                onClick={() =>
                  slot.isAvailable ? handleTimeSelect(timeStr) : null
                }
                className={`
                  border-2 rounded-lg p-4 transition-all text-center
                  ${
                    !slot.isAvailable
                      ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                      : selectedTime === timeStr
                      ? 'border-primary bg-primary text-white cursor-pointer'
                      : 'border-gray-300 hover:border-primary hover:bg-gray-50 cursor-pointer'
                  }
                `}
              >
                <div className="text-lg font-semibold mb-1">{timeStr}</div>
                <div className="text-xs">
                  {slot.isAvailable ? '예약 가능' : '예약 마감'}
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
