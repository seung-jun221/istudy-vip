import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import ConsultingResultModal from './ConsultingResultModal';
import './AdminTabs.css';

export default function ConsultingsTab({ consultings, consultingSlots, onUpdate }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedConsulting, setSelectedConsulting] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 날짜별로 슬롯 그룹화
  const slotsByDate = (consultingSlots || []).reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {});

  // 날짜 목록 (오름차순)
  const dates = Object.keys(slotsByDate).sort();

  // 선택된 날짜가 없으면 첫 번째 날짜 선택
  const currentDate = selectedDate || dates[0];

  // 현재 날짜의 슬롯들
  const currentSlots = slotsByDate[currentDate] || [];

  // 각 슬롯별 예약 매핑
  const getReservationsForSlot = (slotId) => {
    return consultings.filter((c) => c.slot_id === slotId);
  };

  const handleWriteResult = (consulting) => {
    setSelectedConsulting(consulting);
    setShowModal(true);
  };

  const handleCloseModal = (updated) => {
    setShowModal(false);
    setSelectedConsulting(null);
    if (updated) {
      onUpdate();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  if (dates.length === 0) {
    return (
      <div className="tab-container">
        <div className="empty-state">
          <p>등록된 컨설팅 슬롯이 없습니다.</p>
          <p className="empty-hint">
            Supabase의 consulting_slots 테이블에서 linked_seminar_id를 설정하여 슬롯을 추가하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-container">
      {/* 날짜 선택 탭 */}
      <div className="date-tabs">
        {dates.map((date) => (
          <button
            key={date}
            className={`date-tab ${currentDate === date ? 'active' : ''}`}
            onClick={() => setSelectedDate(date)}
          >
            {formatFullDate(date)}
            <span className="date-count">
              {slotsByDate[date].reduce(
                (sum, slot) => sum + getReservationsForSlot(slot.id).length,
                0
              )}
              명
            </span>
          </button>
        ))}
      </div>

      {/* 시간대별 슬롯 리스트 */}
      <div className="slots-container">
        {currentSlots.map((slot) => {
          const reservations = getReservationsForSlot(slot.id);
          const isEmpty = reservations.length === 0;

          return (
            <div key={slot.id} className="time-slot-block">
              <div className="slot-header">
                <div className="slot-time">
                  <span className="time-label">🕐 {formatTime(slot.time)}</span>
                  <span className="capacity-badge">
                    {reservations.length} / {slot.max_capacity}
                  </span>
                </div>
                <div className="slot-location">{slot.location}</div>
              </div>

              {isEmpty ? (
                <div className="empty-slot">예약 없음</div>
              ) : (
                <div className="reservations-list">
                  {reservations.map((consulting) => (
                    <div key={consulting.id} className="reservation-item">
                      <div className="reservation-info">
                        <div className="student-name">{consulting.student_name}</div>
                        <div className="student-details">
                          {consulting.school} · {consulting.grade} · {consulting.parent_phone}
                        </div>
                        {consulting.math_level && (
                          <div className="math-level">수학 선행: {consulting.math_level}</div>
                        )}
                      </div>
                      <div className="reservation-actions">
                        <span
                          className={`status-badge enrollment-${consulting.enrollment_status || '미정'}`}
                        >
                          {consulting.enrollment_status || '미정'}
                        </span>
                        <button
                          className="btn-action"
                          onClick={() => handleWriteResult(consulting)}
                        >
                          {consulting.consulted_at ? '결과 수정' : '결과 작성'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 요약 정보 */}
      <div className="summary-bar">
        총 {consultings.length}명 | 확정:{' '}
        {consultings.filter((c) => c.enrollment_status === '확정').length}명
      </div>

      {/* 결과 작성 모달 */}
      {showModal && selectedConsulting && (
        <ConsultingResultModal
          consulting={selectedConsulting}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
