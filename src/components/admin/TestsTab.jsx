import { useState } from 'react';
import * as XLSX from 'xlsx';
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

  const formatTestDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateForExcel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleExportExcel = () => {
    // 엑셀 데이터 준비
    const excelData = filteredTests.map((test) => ({
      학생명: test.student_name || '',
      학년: test.grade || '',
      학교: test.school || '',
      선행정도: test.math_level || '',
      '학부모 연락처': test.parent_phone || '',
      '진단검사 날짜': formatDateForExcel(test.test_date),
      '진단검사 시간': test.test_slots?.time ? test.test_slots.time.slice(0, 5) : '',
      지점: test.location || '',
    }));

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 12 }, // 학생명
      { wch: 10 }, // 학년
      { wch: 20 }, // 학교
      { wch: 15 }, // 선행정도
      { wch: 15 }, // 학부모 연락처
      { wch: 15 }, // 진단검사 날짜
      { wch: 12 }, // 진단검사 시간
      { wch: 15 }, // 지점
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '진단검사 예약');

    // 파일명 생성 (현재 날짜 포함)
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `진단검사_예약_${dateStr}.xlsx`;

    // 파일 다운로드
    XLSX.writeFile(workbook, filename);
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
        <button className="btn-excel" onClick={handleExportExcel}>
          📊 엑셀 다운로드
        </button>
      </div>

      {/* 테이블 */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>학생명</th>
              <th>학년</th>
              <th>학교</th>
              <th>선행정도</th>
              <th>학부모 연락처</th>
              <th>진단검사 날짜</th>
              <th>진단검사 시간</th>
              <th>지점</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredTests.map((test) => (
                <tr key={test.id}>
                  <td className="highlight-cell">{test.student_name}</td>
                  <td>{test.grade || '-'}</td>
                  <td>{test.school || '-'}</td>
                  <td>{test.math_level || '-'}</td>
                  <td>{test.parent_phone}</td>
                  <td>{formatTestDate(test.test_date)}</td>
                  <td>
                    {test.test_slots?.time ? test.test_slots.time.slice(0, 5) : '-'}
                  </td>
                  <td>{test.location || '-'}</td>
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
