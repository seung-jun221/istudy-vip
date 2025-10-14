import { useEffect } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

export default function DateSelector({ onNext, onBack }) {
  const { availableDates, loadAvailableDates, selectedDate, setSelectedDate } =
    useConsulting();

  useEffect(() => {
    loadAvailableDates();
  }, []);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleNext = () => {
    if (!selectedDate) {
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">컨설팅 날짜 선택</h3>
        <p className="text-gray-600 text-sm">원하시는 날짜를 선택해주세요.</p>
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {availableDates.map((dateInfo) => (
          <div
            key={dateInfo.date}
            onClick={() => handleDateSelect(dateInfo.date)}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all
              ${
                selectedDate === dateInfo.date
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }
            `}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {dateInfo.display.split('/')[1]}
              </div>
              <div className="text-sm text-gray-600">
                {dateInfo.display.split('/')[0]}월
              </div>
              <div className="text-sm text-primary font-medium mt-1">
                {dateInfo.dayOfWeek}요일
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 버튼 그룹 */}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
        <Button onClick={handleNext} disabled={!selectedDate}>
          시간 선택하기
        </Button>
      </div>
    </div>
  );
}
