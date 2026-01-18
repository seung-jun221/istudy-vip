import { useReservation } from '../../context/ReservationContext';
import { formatDate, formatTime } from '../../utils/format';

export default function SeminarSelector() {
  const { seminars, selectedSeminar, setSelectedSeminar } = useReservation();

  // 설명회 선택 시 예약하기 버튼으로 스크롤
  const handleSelectSeminar = (seminar) => {
    setSelectedSeminar(seminar);

    // 약간의 딜레이 후 스크롤 (상태 업데이트 후)
    setTimeout(() => {
      const reservationActions = document.getElementById('reservation-actions');
      if (reservationActions) {
        reservationActions.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  if (seminars.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
        <p>진행 예정인 설명회가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="seminar-selection">
      <div className="seminar-options">
        {seminars.map((seminar) => (
          <div
            key={seminar.id}
            onClick={() => handleSelectSeminar(seminar)}
            className={`seminar-option ${
              selectedSeminar?.id === seminar.id ? 'selected' : ''
            } ${seminar.status === 'warning' ? 'warning' : ''} ${seminar.status === 'waitlist' ? 'waitlist' : ''}`}
          >
            <h4>{seminar.title}</h4>
            <p>
              {formatDate(seminar.date)} {formatTime(seminar.time)}
            </p>
            <p>{seminar.location}</p>

            <span
              className={`availability-badge ${
                seminar.status === 'waitlist'
                  ? 'waitlist'
                  : seminar.status === 'warning'
                  ? 'limited'
                  : 'available'
              }`}
            >
              {seminar.status === 'waitlist'
                ? '대기자 예약'
                : seminar.status === 'warning'
                ? '마감임박'
                : '예약가능'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
