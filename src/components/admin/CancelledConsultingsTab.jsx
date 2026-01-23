import * as XLSX from 'xlsx';
import './AdminTabs.css';

export default function CancelledConsultingsTab({ cancelledConsultings, consultingSlots }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'auto_cancelled':
        return '자동 취소';
      case 'cancelled':
        return '수동 취소';
      default:
        return status;
    }
  };

  const handleExportExcel = () => {
    const excelData = cancelledConsultings.map((consulting) => {
      const slot = consulting.consulting_slots;

      return {
        '취소 일시': consulting.cancelled_at ? formatDateTime(consulting.cancelled_at) : '-',
        '취소 유형': getStatusText(consulting.status),
        '컨설팅 예약일': slot?.date || '-',
        '컨설팅 시간': formatTime(slot?.time),
        지점: slot?.location || '-',
        학생명: consulting.student_name || '',
        학년: consulting.grade || '',
        학교: consulting.school || '',
        '학부모 연락처': consulting.parent_phone || '',
        '수학 선행정도': consulting.math_level || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet['!cols'] = [
      { wch: 15 }, // 취소 일시
      { wch: 12 }, // 취소 유형
      { wch: 12 }, // 원래 예약일
      { wch: 12 }, // 원래 예약시간
      { wch: 15 }, // 지점
      { wch: 12 }, // 학생명
      { wch: 10 }, // 학년
      { wch: 20 }, // 학교
      { wch: 15 }, // 학부모 연락처
      { wch: 15 }, // 수학 선행정도
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '취소된 예약');

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `취소된_컨설팅_예약_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  if (!cancelledConsultings || cancelledConsultings.length === 0) {
    return (
      <div className="tab-container">
        <div className="empty-state">
          <p>취소된 예약이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-container">
      {/* 안내 메시지 */}
      <div className="stats-info-bar" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span style={{ color: '#dc2626', fontWeight: '600' }}>
            ⚠️ 아래 고객들의 컨설팅 예약이 취소되었습니다. 유선 연락이 필요합니다.
          </span>
        </div>
        <button className="btn-excel" onClick={handleExportExcel}>
          엑셀 다운로드
        </button>
      </div>

      {/* 테이블 */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>취소 일시</th>
              <th>취소 유형</th>
              <th>컨설팅 예약일</th>
              <th>컨설팅 시간</th>
              <th>학생명</th>
              <th>학년</th>
              <th>학교</th>
              <th>학부모 연락처</th>
              <th>수학 선행정도</th>
            </tr>
          </thead>
          <tbody>
            {cancelledConsultings.map((consulting) => {
              const slot = consulting.consulting_slots;

              return (
                <tr key={consulting.id}>
                  <td style={{ color: '#dc2626', fontWeight: '500' }}>
                    {consulting.cancelled_at ? formatDateTime(consulting.cancelled_at) : '-'}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: consulting.status === 'auto_cancelled' ? '#fef3c7' : '#fee2e2',
                        color: consulting.status === 'auto_cancelled' ? '#d97706' : '#dc2626',
                      }}
                    >
                      {getStatusText(consulting.status)}
                    </span>
                  </td>
                  <td>{slot?.date ? formatDate(slot.date) : '-'}</td>
                  <td>{formatTime(slot?.time)}</td>
                  <td className="highlight-cell">{consulting.student_name}</td>
                  <td>{consulting.grade || '-'}</td>
                  <td>{consulting.school || '-'}</td>
                  <td style={{ fontWeight: '600' }}>{consulting.parent_phone}</td>
                  <td>{consulting.math_level || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 요약 정보 */}
      <div className="summary-bar" style={{ background: '#fef2f2' }}>
        총 {cancelledConsultings.length}명의 예약이 취소됨
        {' | '}
        자동 취소: {cancelledConsultings.filter(c => c.status === 'auto_cancelled').length}명
        {' | '}
        수동 취소: {cancelledConsultings.filter(c => c.status === 'cancelled').length}명
      </div>
    </div>
  );
}
