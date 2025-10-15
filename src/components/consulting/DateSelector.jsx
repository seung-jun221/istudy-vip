// src/components/consulting/DateSelector.jsx
import { useConsulting } from '../../context/ConsultingContext';
import './DateSelector.css';

export default function DateSelector({ onNext, onBack }) {
  const {
    availableDates,
    selectedDate,
    setSelectedDate,
    loadTimeSlots,
    selectedLocation,
  } = useConsulting();

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    await loadTimeSlots(date, selectedLocation);
  };

  const handleNext = () => {
    if (!selectedDate) return;
    onNext();
  };

  return (
    <div className="date-selector-container">
      <h2 className="text-2xl font-bold mb-6 text-center">날짜 선택</h2>

      {availableDates.length === 0 ? (
        <div className="no-dates-message">
          <p>현재 예약 가능한 날짜가 없습니다.</p>
        </div>
      ) : (
        <div className="dates-grid">
          {availableDates.map((dateInfo) => {
            // 상태별 클래스 및 텍스트 결정
            let statusClass = '';
            let statusText = '';
            let subText = '';
            let badgeClass = '';
            let isDisabled = false;

            if (dateInfo.status === 'full') {
              // 예약 마감
              statusClass = 'date-full';
              statusText = '예약 마감';
              badgeClass = 'badge-gray';
              isDisabled = true;
            } else if (dateInfo.status === 'warning') {
              // 마감 임박 (4석 미만)
              statusClass = 'date-warning';
              statusText = '마감 임박';
              subText = '잔여석 4석 미만';
              badgeClass = 'badge-orange';
            } else {
              // 예약 가능
              statusClass = 'date-available';
              statusText = '예약 가능';
              badgeClass = 'badge-green';
            }

            const isSelected = selectedDate === dateInfo.date;

            return (
              <button
                key={dateInfo.date}
                disabled={isDisabled}
                className={`date-button ${statusClass} ${
                  isSelected ? 'selected' : ''
                }`}
                onClick={() => handleDateSelect(dateInfo.date)}
              >
                <div className="date-content">
                  <span className="date-text">
                    {dateInfo.display} ({dateInfo.dayOfWeek})
                  </span>
                  <div className="date-status-wrapper">
                    <span className={`date-badge ${badgeClass}`}>
                      {statusText}
                    </span>
                    {subText && (
                      <span className="date-sub-text">{subText}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="button-group">
        <button onClick={onBack} className="btn-secondary">
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedDate}
          className="btn-primary"
        >
          다음
        </button>
      </div>
    </div>
  );
}
