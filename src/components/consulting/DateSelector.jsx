// src/components/consulting/DateSelector.jsx - 자동 이동 버전
import { useConsulting } from '../../context/ConsultingContext';
import './DateSelector.css';

export default function DateSelector({ onNext, onBack, location }) {
  const {
    availableDates,
    selectedDate,
    setSelectedDate,
    loadTimeSlots,
    selectedLocation,
    consultantType,
    isCeoSlotsFull,
  } = useConsulting();

  // ⭐ prop으로 받은 location 또는 context의 selectedLocation 사용
  const effectiveLocation = location || selectedLocation;

  // ⭐ 날짜 선택 시 바로 다음 단계로
  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    console.log('📅 날짜 선택:', date, '지역:', effectiveLocation);
    await loadTimeSlots(date, effectiveLocation);
    // ⭐ 시간 슬롯 로딩 완료 후 자동으로 다음 화면으로
    onNext();
  };

  // 컨설팅 유형에 따른 타이틀
  const consultingTitle = consultantType === 'director'
    ? '원장 컨설팅 날짜 선택'
    : '대표이사 컨설팅 날짜 선택';

  return (
    <div className="date-selector-container">
      <h2 className="text-2xl font-bold mb-6 text-center">{consultingTitle}</h2>

      {/* 대표 컨설팅 마감 안내 */}
      {isCeoSlotsFull && (
        <div className="ceo-full-notice">
          <div className="notice-icon">ℹ️</div>
          <div className="notice-content">
            <strong>대표이사 컨설팅이 마감되었습니다.</strong>
            <p>원장 컨설팅으로 예약 가능합니다. 입학 안내는 동일하게 진행됩니다.</p>
          </div>
        </div>
      )}

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

      {/* ⭐ 뒤로 버튼만 표시 (다음 버튼 제거) */}
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
