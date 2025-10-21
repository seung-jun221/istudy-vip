import { useState } from 'react';
import './AdminTabs.css';

export default function TestsTab({ tests }) {
  const [searchTerm, setSearchTerm] = useState('');

  // 필터링
  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      test.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.parent_phone?.includes(searchTerm);

    return matchesSearch;
  });

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
      </div>

      {/* 테이블 */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>예약일시</th>
              <th>학생명</th>
              <th>학부모 연락처</th>
              <th>진단검사 일시</th>
              <th>지점</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredTests.map((test) => (
                <tr key={test.id}>
                  <td>{formatDate(test.created_at)}</td>
                  <td className="highlight-cell">{test.student_name}</td>
                  <td>{test.parent_phone}</td>
                  <td>
                    {formatDateTime(test.test_slots?.date, test.test_slots?.time)}
                  </td>
                  <td>{test.location || '-'}</td>
                  <td>
                    <span className={`status-badge status-${test.status || 'confirmed'}`}>
                      {test.status || 'confirmed'}
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
        총 {filteredTests.length}명
        {searchTerm && ` (검색 결과)`}
      </div>
    </div>
  );
}
