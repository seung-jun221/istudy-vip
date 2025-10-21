import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import ConsultingResultModal from './ConsultingResultModal';
import './AdminTabs.css';

export default function ConsultingsTab({ consultings, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedConsulting, setSelectedConsulting] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 필터링
  const filteredConsultings = consultings.filter((consulting) => {
    const matchesSearch =
      consulting.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consulting.parent_phone?.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' || consulting.enrollment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleWriteResult = (consulting) => {
    setSelectedConsulting(consulting);
    setShowModal(true);
  };

  const handleCloseModal = (updated) => {
    setShowModal(false);
    setSelectedConsulting(null);
    if (updated) {
      onUpdate(); // 부모 컴포넌트에서 데이터 새로고침
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const time = timeStr ? timeStr.slice(0, 5) : '';
    return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="tab-container">
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
          <option value="all">전체 등록상태</option>
          <option value="미정">미정</option>
          <option value="확정">확정</option>
          <option value="불가">불가</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>예약일시</th>
              <th>학생명</th>
              <th>학년</th>
              <th>컨설팅 일시</th>
              <th>지점</th>
              <th>등록상태</th>
              <th>메모</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredConsultings.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredConsultings.map((consulting) => (
                <tr key={consulting.id}>
                  <td>{formatDate(consulting.created_at)}</td>
                  <td className="highlight-cell">{consulting.student_name}</td>
                  <td>{consulting.grade || '-'}</td>
                  <td>
                    {formatDateTime(
                      consulting.consulting_slots?.date,
                      consulting.consulting_slots?.time
                    )}
                  </td>
                  <td>{consulting.consulting_slots?.location || '-'}</td>
                  <td>
                    <span
                      className={`status-badge enrollment-${consulting.enrollment_status || '미정'}`}
                    >
                      {consulting.enrollment_status || '미정'}
                    </span>
                  </td>
                  <td className="notes-cell">
                    {consulting.consultant_notes ? (
                      <span title={consulting.consultant_notes}>
                        {consulting.consultant_notes.length > 20
                          ? consulting.consultant_notes.slice(0, 20) + '...'
                          : consulting.consultant_notes}
                      </span>
                    ) : (
                      <span className="empty-text">-</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-action"
                      onClick={() => handleWriteResult(consulting)}
                    >
                      {consulting.result_written_at ? '결과 수정' : '결과 작성'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 요약 정보 */}
      <div className="summary-bar">
        총 {filteredConsultings.length}명 | 확정:{' '}
        {filteredConsultings.filter((c) => c.enrollment_status === '확정').length}명
        {searchTerm && ` (검색 결과)`}
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
