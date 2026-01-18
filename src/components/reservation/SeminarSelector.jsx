import { useState } from 'react';
import { useReservation } from '../../context/ReservationContext';
import { formatDate, formatTime } from '../../utils/format';

export default function SeminarSelector() {
  const { seminars, selectedSeminar, setSelectedSeminar } = useReservation();
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [pendingSeminar, setPendingSeminar] = useState(null);

  // 설명회 선택 시 예약하기 버튼으로 스크롤
  const handleSelectSeminar = (seminar) => {
    // 대기 예약인 경우 모달 먼저 표시
    if (seminar.status === 'waitlist') {
      setPendingSeminar(seminar);
      setShowWaitlistModal(true);
      return;
    }

    selectAndScroll(seminar);
  };

  const selectAndScroll = (seminar) => {
    setSelectedSeminar(seminar);

    // 약간의 딜레이 후 스크롤 (상태 업데이트 후)
    setTimeout(() => {
      const reservationActions = document.getElementById('reservation-actions');
      if (reservationActions) {
        reservationActions.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleWaitlistConfirm = () => {
    setShowWaitlistModal(false);
    if (pendingSeminar) {
      selectAndScroll(pendingSeminar);
      setPendingSeminar(null);
    }
  };

  const handleWaitlistCancel = () => {
    setShowWaitlistModal(false);
    setPendingSeminar(null);
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
                ? '마감 (대기접수)'
                : seminar.status === 'warning'
                ? '마감임박'
                : '예약가능'}
            </span>
          </div>
        ))}
      </div>

      {/* 대기 예약 안내 모달 */}
      {showWaitlistModal && (
        <div className="waitlist-modal-overlay" onClick={handleWaitlistCancel}>
          <div className="waitlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="waitlist-modal-icon">⏳</div>
            <h3 className="waitlist-modal-title">대기 예약 안내</h3>
            <p className="waitlist-modal-message">
              선택하신 설명회는 <strong>정원이 마감</strong>되어<br />
              <strong>대기 예약</strong>으로 진행됩니다.
            </p>
            <ul className="waitlist-modal-info">
              <li>취소자 발생 시 대기 순서대로 연락드립니다.</li>
              <li>별도의 연락이 없을 시 예약이 확정되지 않습니다.</li>
            </ul>
            <div className="waitlist-modal-buttons">
              <button className="btn btn-secondary" onClick={handleWaitlistCancel}>
                취소
              </button>
              <button className="btn btn-primary" onClick={handleWaitlistConfirm}>
                대기 예약 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
