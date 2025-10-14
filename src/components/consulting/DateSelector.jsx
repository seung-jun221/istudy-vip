import { useEffect } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

export default function DateSelector({ onNext, onBack }) {
  const {
    availableDates,
    loadAvailableDates,
    selectedDate,
    setSelectedDate,
    selectedLocation,
  } = useConsulting();

  useEffect(() => {
    if (selectedLocation) {
      loadAvailableDates(selectedLocation);
    }
  }, [selectedLocation]);

  const handleDateSelect = (date, isFull) => {
    if (isFull) return; // 마감된 날짜는 선택 불가
    setSelectedDate(date);
    // 날짜 선택 즉시 다음 단계로
    onNext();
  };

  // 잔여석 상태 계산
  const getAvailabilityStatus = (slotCount) => {
    if (slotCount === 0) {
      return { text: '마감', className: 'full', isFull: true };
    } else if (slotCount <= 2) {
      return { text: '마감임박', className: 'few', isFull: false };
    } else {
      return {
        text: `잔여 ${slotCount}석`,
        className: 'available',
        isFull: false,
      };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">컨설팅 날짜 선택</h3>
        <p className="text-gray-600 text-sm">
          {selectedLocation && (
            <span className="font-medium text-primary">{selectedLocation}</span>
          )}{' '}
          원하시는 날짜를 선택해주세요.
        </p>
      </div>

      {/* 날짜 없는 경우 */}
      {availableDates.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium">
            현재 예약 가능한 날짜가 없습니다.
          </p>
        </div>
      )}

      {/* 날짜 그리드 */}
      {availableDates.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {availableDates.map((dateInfo) => {
            const status = getAvailabilityStatus(dateInfo.availableSlotCount);
            const isSelected = selectedDate === dateInfo.date;
            const isFull = status.isFull;

            return (
              <div
                key={dateInfo.date}
                onClick={() => handleDateSelect(dateInfo.date, isFull)}
                className={`
                  border-2 rounded-lg p-4 transition-all text-center
                  ${
                    isFull
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'border-primary bg-blue-50 cursor-pointer'
                      : 'border-gray-300 hover:border-primary hover:bg-gray-50 cursor-pointer'
                  }
                `}
              >
                {/* 날짜 헤더 */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-sm text-gray-600">
                    {dateInfo.display.split('/')[0]}월
                  </span>
                  <span className="text-3xl font-bold text-gray-800">
                    {dateInfo.display.split('/')[1]}
                  </span>
                  <span className="text-sm text-gray-600">
                    {dateInfo.dayOfWeek}
                  </span>
                </div>

                {/* 상태 배지 */}
                <div className="text-center">
                  <span
                    className={`
                    inline-block px-3 py-1 rounded-full text-xs font-medium
                    ${
                      status.className === 'available'
                        ? 'bg-green-100 text-green-700'
                        : ''
                    }
                    ${
                      status.className === 'few'
                        ? 'bg-yellow-100 text-yellow-700'
                        : ''
                    }
                    ${
                      status.className === 'full'
                        ? 'bg-red-100 text-red-700'
                        : ''
                    }
                  `}
                  >
                    {status.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 버튼 그룹 */}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
      </div>
    </div>
  );
}
