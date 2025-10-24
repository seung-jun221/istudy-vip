import { useState } from 'react';
import * as XLSX from 'xlsx';
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

  const handleExportExcel = () => {
    // 슬롯 정보와 함께 예약 데이터 준비
    const excelData = consultings.map((consulting) => {
      // 해당 예약의 슬롯 찾기
      const slot = consultingSlots?.find((s) => s.id === consulting.slot_id);

      return {
        컨설팅날짜: slot?.date || '',
        컨설팅시간: formatTime(slot?.time),
        지점: slot?.location || '',
        학생명: consulting.student_name || '',
        학년: consulting.grade || '',
        학교: consulting.school || '',
        '학부모 연락처': consulting.parent_phone || '',
        '수학 선행정도': consulting.math_level || '',
        '등록 상태': consulting.enrollment_status || '미정',
        '컨설팅 완료': consulting.consulted_at ? 'O' : 'X',
      };
    });

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 12 }, // 컨설팅날짜
      { wch: 10 }, // 컨설팅시간
      { wch: 15 }, // 지점
      { wch: 12 }, // 학생명
      { wch: 10 }, // 학년
      { wch: 20 }, // 학교
      { wch: 15 }, // 학부모 연락처
      { wch: 15 }, // 수학 선행정도
      { wch: 12 }, // 등록 상태
      { wch: 12 }, // 컨설팅 완료
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '컨설팅 현황');

    // 파일명 생성 (현재 날짜 포함)
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `컨설팅_현황_${dateStr}.xlsx`;

    // 파일 다운로드
    XLSX.writeFile(workbook, filename);
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
      {/* 상단 액션 바 */}
      <div className="filter-bar">
        <div></div>
        <button
          className="btn btn-primary"
          onClick={handleExportExcel}
          style={{ fontSize: '14px', padding: '8px 16px', height: 'auto' }}
        >
          📊 엑셀 다운로드
        </button>
      </div>

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
