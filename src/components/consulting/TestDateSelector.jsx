// src/components/consulting/TestDateSelector.jsx
import { useConsulting } from '../../context/ConsultingContext';
import './DateSelector.css'; // 기존 DateSelector CSS 재사용

export default function TestDateSelector({
  consultingDate,
  location,
  onNext,
  onBack,
  isEntranceTest = false, // ⭐ 입학테스트 모드
}) {
  const {
    availableTestDates,
    selectedTestDate,
    setSelectedTestDate,
    loadTestTimeSlots,
  } = useConsulting();

  // ⭐ 수정: 날짜를 직접 전달
  const handleDateSelect = async (date) => {
    console.log('📅 선택한 날짜:', date);
    console.log('📍 지역:', location);

    setSelectedTestDate(date);

    // ⭐ 중요: date를 직접 전달 (state 업데이트 전)
    await loadTestTimeSlots(date, location);

    onNext();
  };

  return (
    <div className="date-selector-container">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isEntranceTest ? '입학테스트 날짜 선택' : '진단검사 날짜 선택'}
      </h2>

      {/* 안내 메시지 - 입학테스트 모드가 아닐 때만 컨설팅 날짜 안내 표시 */}
      {!isEntranceTest && consultingDate && (
        <div
          style={{ maxWidth: '800px', margin: '0 auto 1.5rem auto' }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <p className="text-sm text-blue-800">
            💡 <strong>컨설팅 날짜({formatDate(consultingDate)}) 이전</strong>
            에만 진단검사 응시가 가능합니다.
          </p>
        </div>
      )}

      {availableTestDates.length === 0 ? (
        <div className="no-dates-message">
          <p>현재 예약 가능한 진단검사 날짜가 없습니다.</p>
          <p className="text-sm text-gray-600 mt-2">
            컨설팅 날짜 이전에 예약 가능한 날짜가 없습니다.
          </p>
        </div>
      ) : (
        <div className="dates-grid">
          {availableTestDates.map((dateInfo) => {
            // 상태별 클래스 및 텍스트 결정
            let statusClass = '';
            let statusText = '';
            let subText = '';
            let badgeClass = '';
            let isDisabled = false;

            if (dateInfo.status === 'full') {
              statusClass = 'date-full';
              statusText = '예약 마감';
              badgeClass = 'badge-gray';
              isDisabled = true;
            } else if (dateInfo.status === 'warning') {
              statusClass = 'date-warning';
              statusText = '마감 임박';
              subText = '잔여석 4석 미만';
              badgeClass = 'badge-orange';
            } else {
              statusClass = 'date-available';
              statusText = '예약 가능';
              badgeClass = 'badge-green';
            }

            const isSelected = selectedTestDate === dateInfo.date;

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
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          ← 이전
        </button>
      </div>
    </div>
  );
}

// 날짜 포맷 유틸리티
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일(${dayName})`;
}
