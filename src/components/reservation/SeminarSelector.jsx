import { useReservation } from '../../context/ReservationContext';
import { formatDate, formatTime } from '../../utils/format';

export default function SeminarSelector() {
  const { seminars, selectedSeminar, setSelectedSeminar } = useReservation();

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
            onClick={() => setSelectedSeminar(seminar)}
            className={`seminar-option ${
              selectedSeminar?.id === seminar.id ? 'selected' : ''
            }`}
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
