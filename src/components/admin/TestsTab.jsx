import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getAllResultsByPhone } from '../../utils/diagnosticService';
import StudentAddModal from './StudentAddModal';
import './AdminTabs.css';

export default function TestsTab({ tests, testSlots }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [resultsMap, setResultsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualStudents, setManualStudents] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // 각 예약자의 제출 결과 로드
  useEffect(() => {
    loadAllResults();
  }, [tests]);

  const loadAllResults = async () => {
    if (tests.length === 0) return;

    setLoading(true);
    const newResultsMap = {};

    // 각 예약자의 전화번호로 결과 조회
    for (const test of tests) {
      try {
        const results = await getAllResultsByPhone(test.parent_phone);
        if (results && results.length > 0 && results[0].result) {
          // 가장 최근 결과 사용 - result 객체만 추출
          newResultsMap[test.id] = results[0].result;
        }
      } catch (error) {
        console.error(`결과 로드 실패 (${test.parent_phone}):`, error);
      }
    }

    setResultsMap(newResultsMap);
    setLoading(false);
  };

  // 학생 추가 핸들러
  const handleAddStudent = (studentData) => {
    setManualStudents((prev) => [...prev, studentData]);
  };

  // 학생 수정 핸들러
  const handleUpdateStudent = (updatedData) => {
    setManualStudents((prev) =>
      prev.map((student) =>
        student.id === updatedData.id ? updatedData : student
      )
    );
  };

  // 수정 모달 열기
  const handleEditClick = (student) => {
    setEditingStudent({
      id: student.id,
      studentName: student.student_name,
      parentPhone: student.parent_phone,
      school: student.school || '',
      grade: student.grade || '',
      mathLevel: student.math_level || '',
      testDate: student.testDate || '',
      testTime: student.testTime || '',
      location: student.location || '',
      isManuallyAdded: student.source === 'manual',
    });
    setEditMode(true);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditMode(false);
    setEditingStudent(null);
  };

  // 추가 모달 열기
  const handleAddClick = () => {
    setEditMode(false);
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  // 수동 추가된 학생과 예약 학생 합치기
  const allStudents = [
    ...tests.map(test => ({ ...test, source: 'reservation' })),
    ...manualStudents.map(student => ({
      id: student.id,
      student_name: student.studentName,
      parent_phone: student.parentPhone,
      school: student.school,
      grade: student.grade,
      math_level: student.mathLevel,
      test_date: null,
      test_slots: null,
      testDate: student.testDate,
      testTime: student.testTime,
      location: student.location,
      source: 'manual',
    }))
  ];

  // 필터링
  const filteredTests = allStudents.filter((test) => {
    const matchesSearch =
      test.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.parent_phone?.includes(searchTerm);

    return matchesSearch;
  });

  // 슬롯별 예약 현황 계산
  const slotStats = (testSlots || []).map(slot => {
    const reservationsForSlot = tests.filter(t => t.slot_id === slot.id).length;
    return {
      ...slot,
      reservations: reservationsForSlot
    };
  }).sort((a, b) => {
    // 날짜순, 시간순 정렬
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
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
      '진단검사 날짜': test.source === 'manual' && test.testDate
        ? formatDateForExcel(test.testDate)
        : formatDateForExcel(test.test_date),
      '진단검사 시간': test.source === 'manual' && test.testTime
        ? test.testTime
        : test.test_slots?.time ? test.test_slots.time.slice(0, 5) : '',
      지점: test.source === 'manual' && test.location
        ? test.location
        : test.location || '',
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
      {/* 슬롯별 예약 현황 */}
      {slotStats.length > 0 && (
        <div className="stats-info-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="stat-info-label">슬롯별 예약 현황:</span>
            {slotStats.map(slot => (
              <div key={slot.id} style={{ fontSize: '13px', padding: '4px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
                <strong>{formatTestDate(slot.date)} {slot.time?.slice(0, 5)}</strong>: {slot.reservations}/{slot.max_capacity}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 필터 영역 */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="학생명 또는 전화번호로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn-primary"
            onClick={handleAddClick}
            style={{ background: '#1a73e8', borderColor: '#1a73e8' }}
          >
            학생추가
          </button>
          <button className="btn-excel" onClick={handleExportExcel}>
            엑셀 다운로드
          </button>
        </div>
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
              <th>성적 관리</th>
              <th>수정</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-cell">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredTests.map((test) => {
                const result = resultsMap[test.id];
                const hasResult = !!result;

                return (
                  <tr key={test.id}>
                    <td className="highlight-cell">{test.student_name}</td>
                    <td>{test.grade || '-'}</td>
                    <td>{test.school || '-'}</td>
                    <td>{test.math_level || '-'}</td>
                    <td>{test.parent_phone}</td>
                    <td>
                      {test.source === 'manual' && test.testDate
                        ? formatTestDate(test.testDate)
                        : test.test_date
                        ? formatTestDate(test.test_date)
                        : '-'}
                    </td>
                    <td>
                      {test.source === 'manual' && test.testTime
                        ? test.testTime
                        : test.test_slots?.time
                        ? test.test_slots.time.slice(0, 5)
                        : '-'}
                    </td>
                    <td>
                      {test.source === 'manual' && test.location
                        ? test.location
                        : test.location || '-'}
                    </td>
                    <td>
                      {hasResult ? (
                        <button
                          className="btn-small"
                          onClick={() => window.open(`/diagnostic-report/${result.id}`, '_blank')}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            background: '#1a73e8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          성적확인 ({result.total_score != null ? result.total_score.toFixed(1) : '0.0'}점)
                        </button>
                      ) : (
                        <button
                          className="btn-small"
                          onClick={() => navigate('/admin/diagnostic-grading', {
                            state: {
                              studentName: test.student_name,
                              parentPhone: test.parent_phone,
                              school: test.school || '',
                              grade: test.grade || '',
                              mathLevel: test.math_level || '',
                            }
                          })}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            background: 'white',
                            color: '#666',
                            border: '1.5px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          성적입력
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-small"
                        onClick={() => handleEditClick(test)}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 요약 정보 */}
      <div className="summary-bar">
        총 {filteredTests.length}명
        {searchTerm && ` (검색 결과)`}
      </div>

      {/* 학생 추가/수정 모달 */}
      <StudentAddModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddStudent={editMode ? handleUpdateStudent : handleAddStudent}
        editMode={editMode}
        initialData={editingStudent}
      />
    </div>
  );
}
