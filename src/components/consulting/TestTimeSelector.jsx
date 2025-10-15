// src/components/consulting/TestTimeSelector.jsx (수정본)
import { useConsulting } from '../../context/ConsultingContext';

export default function TestTimeSelector({ onNext, onBack }) {
  const {
    testTimeSlots,
    selectedTestTime,
    setSelectedTestTime,
    selectedTestDate,
  } = useConsulting();

  const handleTimeSelect = (time) => {
    setSelectedTestTime(time);
  };

  const handleNext = () => {
    if (!selectedTestTime) return;
    onNext();
  };

  // 날짜 포맷
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}월 ${day}일(${dayName})`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">진단검사 시간 선택</h3>
        <p className="text-gray-600 text-sm">
          <strong>{formatDate(selectedTestDate)}</strong>의 예약 가능한
          시간입니다.
        </p>
      </div>

      {/* 시간 선택 그리드 */}
      {testTimeSlots.length === 0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium">
            예약 가능한 시간이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {testTimeSlots.map((slot) => {
            // ✅ 수정: timeDisplay를 사용
            const isSelected = selectedTestTime === slot.timeDisplay;
            const isFull = slot.isFull;
            const availableSeats = slot.availableSeats;

            return (
              <button
                key={slot.id}
                disabled={isFull}
                onClick={() => handleTimeSelect(slot.timeDisplay)}
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
                <div className="text-2xl font-bold text-gray-800 mb-2">
                  {slot.timeDisplay}
                </div>
                <div className="text-sm">
                  {isFull ? (
                    <span className="text-red-600 font-medium">마감</span>
                  ) : (
                    <span className="text-gray-600">
                      잔여 {availableSeats}석
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 버튼 그룹 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
        >
          ← 뒤로
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedTestTime}
          className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          예약 확정
        </button>
      </div>
    </div>
  );
}
