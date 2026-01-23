import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  getAllResultsByPhone,
  getAllRegistrations,
  createDiagnosticRegistration,
  updateDiagnosticRegistration
} from '../../utils/diagnosticService';
import { supabase } from '../../utils/supabase';
import StudentAddModal from './StudentAddModal';
import './AdminTabs.css';

export default function TestsTab({ tests, testSlots, campaignId }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [resultsMap, setResultsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null); // 슬롯 필터링
  const [paperTypeMap, setPaperTypeMap] = useState({}); // 시험지 지정 상태

  // 시험지 옵션
  const paperTypeOptions = ['미선택', '초등', '모노', '다이', '트라이'];

  // tests에서 paper_type 초기화
  useEffect(() => {
    const initialPaperTypes = {};
    tests.forEach(test => {
      if (test.paper_type) {
        initialPaperTypes[test.id] = test.paper_type;
      }
    });
    setPaperTypeMap(prev => ({ ...prev, ...initialPaperTypes }));
  }, [tests]);

  // Supabase에서 등록 목록 로드 (캠페인별 필터링)
  useEffect(() => {
    loadRegistrations();
  }, [campaignId]);

  const loadRegistrations = async () => {
    try {
      const data = await getAllRegistrations(campaignId);
      setRegistrations(data);
    } catch (error) {
      console.error('등록 목록 로드 실패:', error);
    }
  };

  // 각 예약자 및 등록 학생의 제출 결과 로드
  useEffect(() => {
    loadAllResults();
  }, [tests, registrations]);

  const loadAllResults = async () => {
    if (tests.length === 0 && registrations.length === 0) return;

    setLoading(true);
    const newResultsMap = {};

    // 예약 학생들의 전화번호로 결과 조회
    for (const test of tests) {
      try {
        const results = await getAllResultsByPhone(test.parent_phone);
        // result가 있는 첫 번째 submission 찾기
        const submissionWithResult = results.find(r => r.result);
        if (submissionWithResult && submissionWithResult.result) {
          newResultsMap[test.id] = submissionWithResult.result;
        }
      } catch (error) {
        console.error(`결과 로드 실패 (${test.parent_phone}):`, error);
      }
    }

    // 등록 학생들의 전화번호로 결과 조회
    for (const reg of registrations) {
      if (reg.submission_type === 'registration') {
        try {
          const results = await getAllResultsByPhone(reg.parent_phone);
          // result가 있는 첫 번째 submission 찾기
          const submissionWithResult = results.find(r => r.result);
          if (submissionWithResult && submissionWithResult.result) {
            newResultsMap[reg.id] = submissionWithResult.result;
          }
        } catch (error) {
          console.error(`결과 로드 실패 (${reg.parent_phone}):`, error);
        }
      }
    }

    setResultsMap(newResultsMap);
    setLoading(false);
  };

  // 학생 추가 핸들러
  const handleAddStudent = async (studentData) => {
    try {
      const newRegistration = await createDiagnosticRegistration({
        student_name: studentData.studentName,
        parent_phone: studentData.parentPhone,
        school: studentData.school,
        grade: studentData.grade,
        math_level: studentData.mathLevel,
        test_type: studentData.testType || 'MONO', // 기본값 설정 또는 모달에서 받기
        test_date: studentData.testDate,
        test_time: studentData.testTime,
        location: studentData.location,
        campaign_id: campaignId, // 캠페인 ID 추가
      });

      if (newRegistration) {
        // 성공 시 목록 새로고침
        await loadRegistrations();
      } else {
        alert('학생 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('학생 추가 실패:', error);
      alert('학생 등록 중 오류가 발생했습니다.');
    }
  };

  // 학생 수정 핸들러
  const handleUpdateStudent = async (updatedData) => {
    try {
      const updated = await updateDiagnosticRegistration({
        id: updatedData.id,
        student_name: updatedData.studentName,
        parent_phone: updatedData.parentPhone,
        school: updatedData.school,
        grade: updatedData.grade,
        math_level: updatedData.mathLevel,
        test_date: updatedData.testDate,
        test_time: updatedData.testTime,
        location: updatedData.location,
      });

      if (updated) {
        // 성공 시 목록 새로고침
        await loadRegistrations();
      } else {
        alert('학생 정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('학생 수정 실패:', error);
      alert('학생 정보 수정 중 오류가 발생했습니다.');
    }
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
      testType: student.test_type || 'MONO',
      testDate: student.test_date || '',
      testTime: student.test_time || '',
      location: student.location || '',
      isManuallyAdded: student.source === 'registration',
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

  // 예약 학생과 등록 학생 합치기
  const allStudents = [
    ...tests.map(test => ({ ...test, source: 'reservation' })),
    ...registrations
      .filter(reg => reg.submission_type === 'registration')
      .map(reg => ({
        id: reg.id,
        student_name: reg.student_name,
        parent_phone: reg.parent_phone,
        school: reg.school,
        grade: reg.grade,
        math_level: reg.math_level,
        test_type: reg.test_type,
        test_date: reg.test_date,
        test_time: reg.test_time,
        location: reg.location,
        test_slots: null,
        source: 'registration',
      }))
  ];

  // 필터링 (검색어 + 슬롯 필터)
  const filteredTests = allStudents.filter((test) => {
    const matchesSearch =
      test.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.parent_phone?.includes(searchTerm);

    // 슬롯 필터링 (null이면 전체)
    const matchesSlot = !selectedSlotId || test.slot_id === selectedSlotId;

    return matchesSearch && matchesSlot;
  });

  // 시험지 지정 변경 핸들러 (DB 저장)
  const handlePaperTypeChange = async (studentId, value, source) => {
    console.log('📝 시험지 지정 변경:', { studentId, value, source });

    // 로컬 상태 즉시 업데이트
    setPaperTypeMap(prev => ({
      ...prev,
      [studentId]: value
    }));

    // reservation 소스인 경우 DB에 저장
    if (source === 'reservation') {
      try {
        console.log('💾 DB 저장 시도... ID:', studentId);
        const { data, error } = await supabase
          .from('test_reservations')
          .update({ paper_type: value })
          .eq('id', studentId)
          .select();

        if (error) {
          console.error('❌ 시험지 지정 저장 실패:', error);
        } else if (!data || data.length === 0) {
          console.error('❌ 매칭되는 레코드 없음! ID:', studentId);
        } else {
          console.log('✅ 시험지 지정 저장 완료:', data);
        }
      } catch (error) {
        console.error('❌ 시험지 지정 저장 오류:', error);
      }
    } else {
      console.log('⚠️ source가 reservation이 아님:', source);
    }
  };

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
      '진단검사 날짜': test.source === 'registration' && test.test_date
        ? formatDateForExcel(test.test_date)
        : formatDateForExcel(test.test_date),
      '진단검사 시간': test.source === 'registration' && test.test_time
        ? test.test_time
        : test.test_slots?.time ? test.test_slots.time.slice(0, 5) : '',
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
      {/* 슬롯별 예약 현황 (클릭하여 필터링) */}
      {slotStats.length > 0 && (
        <div className="stats-info-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="stat-info-label">슬롯별 예약 현황:</span>
            {/* 전체 버튼 */}
            <div
              onClick={() => setSelectedSlotId(null)}
              style={{
                fontSize: '13px',
                padding: '4px 12px',
                background: selectedSlotId === null ? '#1a73e8' : '#fff',
                color: selectedSlotId === null ? '#fff' : '#333',
                border: selectedSlotId === null ? '1px solid #1a73e8' : '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <strong>전체</strong>: {allStudents.length}명
            </div>
            {slotStats.map(slot => (
              <div
                key={slot.id}
                onClick={() => setSelectedSlotId(slot.id)}
                style={{
                  fontSize: '13px',
                  padding: '4px 12px',
                  background: selectedSlotId === slot.id ? '#1a73e8' : '#fff',
                  color: selectedSlotId === slot.id ? '#fff' : '#333',
                  border: selectedSlotId === slot.id ? '1px solid #1a73e8' : '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
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
              <th>시험지 지정</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length === 0 ? (
              <tr>
                <td colSpan="11" className="empty-cell">
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
                      {test.test_date
                        ? formatTestDate(test.test_date)
                        : '-'}
                    </td>
                    <td>
                      {test.test_time
                        ? test.test_time
                        : test.test_slots?.time
                        ? test.test_slots.time.slice(0, 5)
                        : '-'}
                    </td>
                    <td>
                      {test.location || '-'}
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
                    <td>
                      <select
                        value={paperTypeMap[test.id] || '미선택'}
                        onChange={(e) => handlePaperTypeChange(test.id, e.target.value, test.source)}
                        style={{
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.85rem',
                          border: '1.5px solid #ddd',
                          borderRadius: '6px',
                          background: paperTypeMap[test.id] && paperTypeMap[test.id] !== '미선택'
                            ? '#e8f5e9'
                            : '#fff',
                          cursor: 'pointer',
                          minWidth: '80px',
                        }}
                      >
                        {paperTypeOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
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
        {selectedSlotId && ` (슬롯 필터 적용중)`}
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
