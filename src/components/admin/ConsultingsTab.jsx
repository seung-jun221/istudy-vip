import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAdmin } from '../../context/AdminContext';
import ConsultingResultModal from './ConsultingResultModal';
import { supabase } from '../../utils/supabase';
import { formatDateKR, formatDateFullKR, formatDateShort } from '../../utils/format';
import './AdminTabs.css';

export default function ConsultingsTab({ consultings, consultingSlots, onUpdate, onPhoneClick }) {
  const { changeConsultingSlot } = useAdmin();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedConsulting, setSelectedConsulting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSlotChangeModal, setShowSlotChangeModal] = useState(false);
  const [slotChangeTarget, setSlotChangeTarget] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState({}); // 전화번호별 진단결과

  // 진단검사 결과 로드
  useEffect(() => {
    loadDiagnosticResults();
  }, [consultings]);

  const loadDiagnosticResults = async () => {
    if (!consultings || consultings.length === 0) return;

    // 모든 컨설팅 예약자의 전화번호 추출
    const phones = [...new Set(consultings.map(c => c.parent_phone).filter(Boolean))];
    if (phones.length === 0) return;

    try {
      // diagnostic_submissions에서 결과가 있는 제출 조회
      const { data: submissions, error: subError } = await supabase
        .from('diagnostic_submissions')
        .select('id, parent_phone')
        .in('parent_phone', phones);

      if (subError) throw subError;
      if (!submissions || submissions.length === 0) return;

      // 제출 ID 목록으로 diagnostic_results 조회
      const submissionIds = submissions.map(s => s.id);
      const { data: results, error: resError } = await supabase
        .from('diagnostic_results')
        .select('id, submission_id, total_score, created_at')
        .in('submission_id', submissionIds);

      if (resError) throw resError;

      // 제출 ID -> 전화번호 매핑
      const submissionToPhone = {};
      submissions.forEach(s => {
        submissionToPhone[s.id] = s.parent_phone;
      });

      // 전화번호별로 가장 최근 결과 매핑
      const resultsMap = {};
      (results || []).forEach(result => {
        const phone = submissionToPhone[result.submission_id];
        if (!phone) return;

        if (!resultsMap[phone] ||
            new Date(result.created_at) > new Date(resultsMap[phone].created_at)) {
          resultsMap[phone] = result;
        }
      });

      setDiagnosticResults(resultsMap);
    } catch (error) {
      console.error('진단검사 결과 로드 실패:', error);
    }
  };

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

  // 통계 계산
  const totalCount = consultings.length;
  const completedCount = consultings.filter(c => c.consulted_at).length;
  const pendingCount = totalCount - completedCount;
  const noShowCount = consultings.filter(c => c.status === 'cancelled').length;
  const enrolledCount = consultings.filter(c => c.enrollment_status === '확정').length;

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

  // 일정 변경 모달 열기
  const handleOpenSlotChange = (consulting) => {
    setSlotChangeTarget(consulting);
    setShowSlotChangeModal(true);
  };

  // 일정 변경 처리
  const handleSlotChange = async (newSlotId) => {
    if (!slotChangeTarget) return;

    const success = await changeConsultingSlot(
      slotChangeTarget.id,
      slotChangeTarget.slot_id,
      newSlotId
    );

    if (success) {
      setShowSlotChangeModal(false);
      setSlotChangeTarget(null);
      onUpdate();
    }
  };

  // 변경 가능한 슬롯 목록 (현재 슬롯 제외, 과거 제외, 잔여석 있는 것만)
  const getAvailableSlots = () => {
    if (!slotChangeTarget) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (consultingSlots || []).filter((slot) => {
      // 현재 슬롯 제외
      if (slot.id === slotChangeTarget.slot_id) return false;
      // 과거 날짜 제외
      const slotDate = new Date(slot.date);
      if (slotDate < today) return false;
      // 비공개 슬롯 제외
      if (!slot.is_available) return false;
      // 만석 슬롯 제외
      if (slot.current_bookings >= slot.max_capacity) return false;
      return true;
    }).sort((a, b) => {
      // 날짜순, 시간순 정렬
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  };

  const formatDate = formatDateKR;
  const formatFullDate = formatDateFullKR;

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  const handleExportExcel = () => {
    // 슬롯 정보와 함께 예약 데이터 준비
    const excelData = consultings.map((consulting) => {
      // 해당 예약의 슬롯 찾기
      const slot = consultingSlots?.find((s) => s.id === consulting.slot_id);

      // 진단검사 정보 포맷팅
      let testInfo = '미예약';
      if (consulting.test_reservation?.test_slots) {
        const testSlot = consulting.test_reservation.test_slots;
        const dateStr = formatDateShort(testSlot.date);
        const timeStr = testSlot.time ? testSlot.time.slice(0, 5) : '';
        testInfo = `${dateStr} ${timeStr}`;
      }

      return {
        컨설팅날짜: slot?.date || '',
        컨설팅시간: formatTime(slot?.time),
        지점: slot?.location || '',
        학생명: consulting.student_name || '',
        학년: consulting.grade || '',
        학교: consulting.school || '',
        '학부모 연락처': consulting.parent_phone || '',
        '수학 선행정도': consulting.math_level || '',
        '진단검사 예약': testInfo,
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
      { wch: 15 }, // 진단검사 예약
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
      {/* 통계 정보 + 엑셀 다운로드 */}
      <div className="stats-info-bar">
        <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
          <div className="stat-info-item">
            <span className="stat-info-label">총 예약:</span>
            <span className="stat-info-value">{totalCount}명</span>
          </div>
          <div className="stat-info-item">
            <span className="stat-info-label">컨설팅 완료:</span>
            <span className="stat-info-value">{completedCount}명</span>
          </div>
          <div className="stat-info-item">
            <span className="stat-info-label">대기 중:</span>
            <span className="stat-info-value">{pendingCount}명</span>
          </div>
          <div className="stat-info-item">
            <span className="stat-info-label">노쇼:</span>
            <span className="stat-info-value">{noShowCount}명</span>
          </div>
          <div className="stat-info-item">
            <span className="stat-info-label">등록 확정:</span>
            <span className="stat-info-value highlight">{enrolledCount}명</span>
          </div>
        </div>
        <button className="btn-excel" onClick={handleExportExcel}>
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
                </div>
                <div className="slot-location">{slot.location}</div>
              </div>

              {isEmpty ? (
                <div className="empty-slot">예약 없음</div>
              ) : (
                <div className="reservations-list">
                  {reservations.map((consulting) => {
                    // 진단검사 정보 포맷팅
                    const formatTestInfo = () => {
                      if (consulting.test_reservation?.test_slots) {
                        const testSlot = consulting.test_reservation.test_slots;
                        const dateStr = formatDateShort(testSlot.date);
                        const timeStr = testSlot.time ? testSlot.time.slice(0, 5) : '';
                        return `${dateStr} ${timeStr} 진단검사 예약`;
                      }
                      return '진단검사 미예약';
                    };

                    // 해당 학생의 진단검사 결과
                    const diagnosticResult = diagnosticResults[consulting.parent_phone];

                    return (
                      <div key={consulting.id} className="reservation-item">
                        <div className="reservation-info">
                          <div className="student-name">{consulting.student_name}</div>
                          <div className="student-details">
                            {consulting.school} · {consulting.grade} ·{' '}
                            <span
                              onClick={() => onPhoneClick?.(consulting.parent_phone)}
                              style={{ cursor: onPhoneClick ? 'pointer' : 'default', color: onPhoneClick ? '#1a73e8' : 'inherit', textDecoration: onPhoneClick ? 'underline' : 'none' }}
                            >
                              {consulting.parent_phone}
                            </span>
                          </div>
                          {consulting.math_level && (
                            <div className="math-level">수학 선행: {consulting.math_level}</div>
                          )}
                          <div className="test-info" style={{
                            fontSize: '13px',
                            color: consulting.test_reservation ? '#10b981' : '#ef4444',
                            marginTop: '4px'
                          }}>
                            {formatTestInfo()}
                            {/* 진단검사 결과 보기 버튼 */}
                            {diagnosticResult && (
                              <button
                                onClick={() => window.open(`/diagnostic-report/${diagnosticResult.id}`, '_blank')}
                                style={{
                                  marginLeft: '8px',
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  background: '#1a73e8',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                결과보기 ({diagnosticResult.total_score?.toFixed(1)}점)
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="reservation-actions">
                          <span
                            className={`status-badge enrollment-${consulting.enrollment_status || '미정'}`}
                          >
                            {consulting.enrollment_status || '미정'}
                          </span>
                          <button
                            className="btn-action btn-slot-change"
                            onClick={() => handleOpenSlotChange(consulting)}
                            style={{ marginRight: '8px', backgroundColor: '#6366f1' }}
                          >
                            일정 변경
                          </button>
                          <button
                            className="btn-action"
                            onClick={() => handleWriteResult(consulting)}
                          >
                            {consulting.consulted_at ? '결과 수정' : '결과 작성'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
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

      {/* 일정 변경 모달 */}
      {showSlotChangeModal && slotChangeTarget && (
        <div className="modal-overlay" onClick={() => setShowSlotChangeModal(false)}>
          <div className="modal-content slot-change-modal" onClick={(e) => e.stopPropagation()}>
            <h3>컨설팅 일정 변경</h3>

            <div className="current-info">
              <p><strong>학생명:</strong> {slotChangeTarget.student_name}</p>
              <p><strong>현재 일정:</strong> {(() => {
                const currentSlot = consultingSlots?.find(s => s.id === slotChangeTarget.slot_id);
                if (!currentSlot) return '-';
                return `${formatFullDate(currentSlot.date)} ${formatTime(currentSlot.time)}`;
              })()}</p>
            </div>

            <div className="slot-list">
              <p className="slot-list-title">변경할 일정 선택:</p>
              {getAvailableSlots().length === 0 ? (
                <p className="no-slots">변경 가능한 슬롯이 없습니다.</p>
              ) : (
                <div className="slot-options">
                  {getAvailableSlots().map((slot) => {
                    const remaining = slot.max_capacity - slot.current_bookings;
                    return (
                      <button
                        key={slot.id}
                        className="slot-option"
                        onClick={() => handleSlotChange(slot.id)}
                      >
                        <span className="slot-datetime">
                          {formatFullDate(slot.date)} {formatTime(slot.time)}
                        </span>
                        <span className="slot-remaining">
                          잔여 {remaining}석
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowSlotChangeModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
