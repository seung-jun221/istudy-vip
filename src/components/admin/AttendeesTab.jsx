import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAdmin } from '../../context/AdminContext';
import './AdminTabs.css';

export default function AttendeesTab({ attendees, campaign, seminarSlots, onUpdate, onPhoneClick }) {
  const { updateReservationStatus } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSlotId, setSelectedSlotId] = useState('all'); // 기본값을 'all'로 변경

  // 설명회 슬롯별로 예약자 그룹화
  const slotGroups = useMemo(() => {
    const groups = {};

    attendees.forEach(attendee => {
      const slotId = attendee.seminar_slot_id;
      if (!slotId) return;

      if (!groups[slotId]) {
        groups[slotId] = {
          slotId,
          slotData: null, // seminar_slots 데이터는 attendee에서 가져올 예정
          attendees: []
        };
      }

      groups[slotId].attendees.push(attendee);

      // attendee가 seminar_slots 데이터를 포함하고 있다면 저장
      // (AdminContext에서 JOIN으로 가져온 경우)
      if (attendee.seminar_slots && !groups[slotId].slotData) {
        groups[slotId].slotData = attendee.seminar_slots;
      }
    });

    return Object.values(groups);
  }, [attendees]);

  // 슬롯 데이터가 없으면 campaign.seminar_slots 또는 seminarSlots prop에서 찾기
  const enrichedSlotGroups = useMemo(() => {
    return slotGroups.map(group => {
      if (!group.slotData) {
        // campaign.seminar_slots 또는 seminarSlots prop에서 찾기
        const slots = campaign?.seminar_slots || seminarSlots || [];
        const slot = slots.find(s => s.id === group.slotId);
        if (slot) {
          group.slotData = slot;
        }
      }
      return group;
    }).sort((a, b) => {
      // 날짜순 정렬
      const dateA = a.slotData?.date || '';
      const dateB = b.slotData?.date || '';
      return dateA.localeCompare(dateB);
    });
  }, [slotGroups, campaign, seminarSlots]);

  // 선택된 슬롯의 데이터 ('all'인 경우 전체 예약자)
  const isAllSelected = selectedSlotId === 'all';
  const selectedGroup = isAllSelected ? null : enrichedSlotGroups.find(g => g.slotId === selectedSlotId);
  const currentAttendees = isAllSelected ? attendees : (selectedGroup?.attendees || []);
  const currentSlot = isAllSelected ? null : selectedGroup?.slotData;

  // 필터링
  const filteredAttendees = currentAttendees.filter((attendee) => {
    const matchesSearch =
      attendee.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.parent_phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || attendee.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 통계 계산 (선택된 슬롯 기준, 전체 선택 시 전체 통계)
  const confirmedCount = currentAttendees.filter(a => ['예약', '참석'].includes(a.status)).length;
  const totalMaxCapacity = isAllSelected
    ? enrichedSlotGroups.reduce((sum, g) => sum + (g.slotData?.max_capacity || 0), 0)
    : (currentSlot?.max_capacity || 0);
  const totalDisplayCapacity = isAllSelected
    ? enrichedSlotGroups.reduce((sum, g) => sum + (g.slotData?.display_capacity || g.slotData?.max_capacity || 0), 0)
    : (currentSlot?.display_capacity || totalMaxCapacity);
  const maxCapacity = totalMaxCapacity;
  const displayCapacity = totalDisplayCapacity;
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

  // 설명회 슬롯 정보 가져오기 (전체 탭에서 사용)
  const getSlotInfoForAttendee = (attendee) => {
    if (attendee.seminar_slots) {
      return formatSlotLabel(attendee.seminar_slots);
    }
    // seminar_slots가 없으면 enrichedSlotGroups에서 찾기
    const group = enrichedSlotGroups.find(g => g.slotId === attendee.seminar_slot_id);
    return group?.slotData ? formatSlotLabel(group.slotData) : '-';
  };

  const handleExportExcel = () => {
    // 엑셀 데이터 준비
    const excelData = filteredAttendees.map((attendee) => {
      const baseData = {
        예약일시: formatDateForExcel(attendee.registered_at),
        학생명: attendee.student_name || '',
        학년: attendee.grade || '',
        학교: attendee.school || '',
        선행정도: attendee.math_level || '',
        '학부모 연락처': attendee.parent_phone || '',
        상태: attendee.status || '',
      };

      // 전체 탭일 경우 설명회 일정 컬럼 추가
      if (isAllSelected) {
        return {
          '설명회 일정': getSlotInfoForAttendee(attendee),
          ...baseData,
        };
      }
      return baseData;
    });

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    const cols = isAllSelected
      ? [
          { wch: 25 }, // 설명회 일정
          { wch: 20 }, // 예약일시
          { wch: 12 }, // 학생명
          { wch: 10 }, // 학년
          { wch: 20 }, // 학교
          { wch: 15 }, // 선행정도
          { wch: 15 }, // 학부모 연락처
          { wch: 10 }, // 상태
        ]
      : [
          { wch: 20 }, // 예약일시
          { wch: 12 }, // 학생명
          { wch: 10 }, // 학년
          { wch: 20 }, // 학교
          { wch: 15 }, // 선행정도
          { wch: 15 }, // 학부모 연락처
          { wch: 10 }, // 상태
        ];
    worksheet['!cols'] = cols;

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '설명회 예약자');

    // 파일명 생성 (현재 날짜 포함)
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    let filename;
    if (isAllSelected) {
      filename = `설명회_예약자_전체_${dateStr}.xlsx`;
    } else {
      const slotInfo = formatSlotDateTime(currentSlot?.date, currentSlot?.time);
      filename = `설명회_예약자_${slotInfo.replace(/\//g, '')}_${dateStr}.xlsx`;
    }

    // 파일 다운로드
    XLSX.writeFile(workbook, filename);
  };

  // 날짜/시간 포맷팅 (탭용)
  const formatSlotLabel = (slot) => {
    if (!slot) return '슬롯 정보 없음';

    const title = slot.title || '';
    const date = slot.date ? new Date(slot.date) : null;
    const dateStr = date ? `${date.getMonth() + 1}/${date.getDate()}` : '';
    const time = slot.time ? slot.time.slice(0, 5) : '';

    // title이 있으면 title 우선 표시
    if (title) {
      return `${title} (${dateStr} ${time})`;
    }

    // title이 없으면 날짜/시간으로 표시
    return `${dateStr} ${time} ${slot.session_number}차`;
  };

  // 상태 변경 핸들러
  const handleStatusChange = async (reservationId, newStatus) => {
    const success = await updateReservationStatus(reservationId, newStatus);
    if (success && onUpdate) {
      onUpdate(); // 데이터 새로고침
    }
  };

  return (
    <div className="tab-container">
      {/* 설명회 슬롯 선택 탭 */}
      {enrichedSlotGroups.length >= 1 && (
        <div className="slot-tabs" style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '0',
          flexWrap: 'wrap'
        }}>
          {/* 전체 탭 */}
          <button
            onClick={() => setSelectedSlotId('all')}
            className={selectedSlotId === 'all' ? 'slot-tab active' : 'slot-tab'}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: selectedSlotId === 'all' ? '#1976d2' : '#f5f5f5',
              color: selectedSlotId === 'all' ? 'white' : '#666',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              fontWeight: selectedSlotId === 'all' ? 'bold' : 'normal',
              fontSize: '14px',
              transition: 'all 0.2s',
              position: 'relative',
              top: '2px'
            }}
          >
            전체
            <span style={{
              marginLeft: '8px',
              fontSize: '12px',
              opacity: 0.9
            }}>
              ({attendees.length})
            </span>
          </button>
          {/* 개별 슬롯 탭 */}
          {enrichedSlotGroups.map(group => (
            <button
              key={group.slotId}
              onClick={() => setSelectedSlotId(group.slotId)}
              className={selectedSlotId === group.slotId ? 'slot-tab active' : 'slot-tab'}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: selectedSlotId === group.slotId ? '#1976d2' : '#f5f5f5',
                color: selectedSlotId === group.slotId ? 'white' : '#666',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                fontWeight: selectedSlotId === group.slotId ? 'bold' : 'normal',
                fontSize: '14px',
                transition: 'all 0.2s',
                position: 'relative',
                top: '2px'
              }}
            >
              {formatSlotLabel(group.slotData)}
              <span style={{
                marginLeft: '8px',
                fontSize: '12px',
                opacity: 0.9
              }}>
                ({group.attendees.length})
              </span>
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
              {isAllSelected && <th>설명회 일정</th>}
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
                <td colSpan={isAllSelected ? 8 : 7} className="empty-cell">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredAttendees.map((attendee) => (
                <tr key={attendee.id}>
                  {isAllSelected && (
                    <td style={{ fontSize: '12px', color: '#666' }}>
                      {getSlotInfoForAttendee(attendee)}
                    </td>
                  )}
                  <td>{formatDate(attendee.registered_at)}</td>
                  <td className="highlight-cell">{attendee.student_name}</td>
                  <td>{attendee.grade || '-'}</td>
                  <td>{attendee.school || '-'}</td>
                  <td>{attendee.math_level || '-'}</td>
                  <td>
                    <span
                      onClick={() => onPhoneClick?.(attendee.parent_phone)}
                      style={{ cursor: onPhoneClick ? 'pointer' : 'default', color: onPhoneClick ? '#1a73e8' : 'inherit', textDecoration: onPhoneClick ? 'underline' : 'none' }}
                    >
                      {attendee.parent_phone}
                    </span>
                  </td>
                  <td>
                    <select
                      value={attendee.status}
                      onChange={(e) => handleStatusChange(attendee.id, e.target.value)}
                      className={`status-select status-${attendee.status}`}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '13px',
                        cursor: 'pointer',
                        backgroundColor:
                          attendee.status === '참석' ? '#d4edda' :
                          attendee.status === '예약' ? '#d1ecf1' :
                          attendee.status === '대기' ? '#fff3cd' :
                          attendee.status === '불참' ? '#f8d7da' :
                          attendee.status === '취소' ? '#f5c6cb' : '#fff',
                      }}
                    >
                      <option value="예약">예약</option>
                      <option value="대기">대기</option>
                      <option value="참석">참석</option>
                      <option value="불참">불참</option>
                      <option value="취소">취소</option>
                    </select>
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
