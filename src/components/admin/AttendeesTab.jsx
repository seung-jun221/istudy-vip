import { useState } from 'react';
import * as XLSX from 'xlsx';
import './AdminTabs.css';

export default function AttendeesTab({ attendees, campaign, seminarSlots }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSlotId, setSelectedSlotId] = useState(seminarSlots[0]?.id || null);

  // 선택된 슬롯 정보
  const selectedSlot = seminarSlots.find(slot => slot.id === selectedSlotId) || seminarSlots[0];

  // 선택된 슬롯의 예약자만 필터링
  const slotAttendees = attendees.filter(
    attendee => attendee.seminar_slot_id === selectedSlotId
  );

  // 검색 및 상태 필터링
  const filteredAttendees = slotAttendees.filter((attendee) => {
    const matchesSearch =
      attendee.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.parent_phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || attendee.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 통계 계산 (선택된 슬롯 기준)
  const confirmedCount = slotAttendees.filter(a => ['예약', '참석'].includes(a.status)).length;
  const maxCapacity = selectedSlot?.max_capacity || 0;
  const displayCapacity = selectedSlot?.display_capacity || maxCapacity;
  const reservationRate = maxCapacity > 0 ? Math.round((confirmedCount / maxCapacity) * 100) : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDateForExcel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatSlotDateTime = (date, time) => {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const timeStr = time ? time.slice(0, 5) : '';
    return `${month}/${day} ${timeStr}`;
  };

  const handleExportExcel = () => {
    // 엑셀 데이터 준비 (선택된 슬롯만)
    const excelData = filteredAttendees.map((attendee) => ({
      예약일시: formatDateForExcel(attendee.registered_at),
      학생명: attendee.student_name || '',
      학년: attendee.grade || '',
      학교: attendee.school || '',
      선행정도: attendee.math_level || '',
      '학부모 연락처': attendee.parent_phone || '',
      상태: attendee.status || '',
    }));

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 20 }, // 예약일시
      { wch: 12 }, // 학생명
      { wch: 10 }, // 학년
      { wch: 20 }, // 학교
      { wch: 15 }, // 선행정도
      { wch: 15 }, // 학부모 연락처
      { wch: 10 }, // 상태
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '설명회 예약자');

    // 파일명 생성 (현재 날짜 포함)
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const slotInfo = formatSlotDateTime(selectedSlot?.date, selectedSlot?.time);
    const filename = `설명회_예약자_${slotInfo.replace(/\//g, '')}_${dateStr}.xlsx`;

    // 파일 다운로드
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="tab-container">
      {/* 슬롯 탭 */}
      {seminarSlots.length > 1 && (
        <div className="slot-tabs">
          {seminarSlots.map((slot, index) => (
            <button
              key={slot.id}
              className={`slot-tab-btn ${selectedSlotId === slot.id ? 'active' : ''}`}
              onClick={() => setSelectedSlotId(slot.id)}
            >
              {index + 1}차 - {formatSlotDateTime(slot.date, slot.time)}
            </button>
          ))}
        </div>
      )}

      {/* 통계 정보 */}
      <div className="stats-info-bar">
        <div className="stat-info-item">
          <span className="stat-info-label">예약 현황:</span>
          <span className="stat-info-value">{confirmedCount} / {maxCapacity}명</span>
        </div>
        <div className="stat-info-item">
          <span className="stat-info-label">노출 정원:</span>
          <span className="stat-info-value">{displayCapacity}석</span>
        </div>
        <div className="stat-info-item">
          <span className="stat-info-label">예약율:</span>
          <span className="stat-info-value highlight">{reservationRate}%</span>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="학생명 또는 전화번호로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="예약">예약</option>
          <option value="참석">참석</option>
          <option value="불참">불참</option>
          <option value="취소">취소</option>
        </select>
        <button className="btn-excel" onClick={handleExportExcel}>
          엑셀 다운로드
        </button>
      </div>

      {/* 테이블 */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>예약일시</th>
              <th>학생명</th>
              <th>학년</th>
              <th>학교</th>
              <th>선행정도</th>
              <th>학부모 연락처</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendees.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredAttendees.map((attendee) => (
                <tr key={attendee.id}>
                  <td>{formatDate(attendee.registered_at)}</td>
                  <td className="highlight-cell">{attendee.student_name}</td>
                  <td>{attendee.grade || '-'}</td>
                  <td>{attendee.school || '-'}</td>
                  <td>{attendee.math_level || '-'}</td>
                  <td>{attendee.parent_phone}</td>
                  <td>
                    <span className={`status-badge status-${attendee.status}`}>
                      {attendee.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 요약 정보 */}
      <div className="summary-bar">
        총 {filteredAttendees.length}명
        {searchTerm && ` (검색 결과)`}
      </div>
    </div>
  );
}
