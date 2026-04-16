import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  getAllResultsByPhone,
  getAllRegistrations,
  createDiagnosticRegistration,
  updateDiagnosticRegistration,
  regradeAllByTestType
} from '../../utils/diagnosticService';
import { supabase } from '../../utils/supabase';
import { formatPhone, formatSlotDateTime, formatDateShort, formatDateForExcel } from '../../utils/format';
import StudentAddModal from './StudentAddModal';
import './AdminTabs.css';

export default function TestsTab({ tests, testSlots, campaignId, onPhoneClick, onUpdate }) {
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
  const [reservationTypeFilter, setReservationTypeFilter] = useState('all'); // ⭐ 예약 유형 필터
  const [entranceTests, setEntranceTests] = useState([]); // ⭐ 입학테스트 예약 목록
  const [syncModalOpen, setSyncModalOpen] = useState(false); // 연동 수정 모달
  const [syncTargets, setSyncTargets] = useState([]); // 연동 수정 대상 목록
  const [syncUpdateData, setSyncUpdateData] = useState(null); // 수정할 데이터
  const [regrading, setRegrading] = useState(false); // 재채점 진행 중

  // 시험지 옵션
  const paperTypeOptions = ['미선택', '초등', '모노', '다이', '트라이'];

  // ⭐ 진단검사 예약 취소 핸들러 (모든 유형)
  const handleCancelTest = async (testId, slotId, reservationType) => {
    const message = reservationType === 'entrance_test'
      ? '정말 이 입학테스트 예약을 취소하시겠습니까?\n\n취소 후 학부모님께 컨설팅 예약 확인 페이지에서 다시 예약하도록 안내해주세요.'
      : '정말 이 진단검사 예약을 취소하시겠습니까?\n\n취소 후 학부모님께 컨설팅 예약 확인 페이지에서 다시 예약하도록 안내해주세요.';

    if (!window.confirm(message)) {
      return;
    }

    try {
      // 1. 예약 상태를 '취소'로 변경
      const { error: updateError } = await supabase
        .from('test_reservations')
        .update({ status: '취소' })
        .eq('id', testId);

      if (updateError) throw updateError;

      // 2. 슬롯의 current_bookings 감소
      if (slotId) {
        const { data: slotData } = await supabase
          .from('test_slots')
          .select('current_bookings')
          .eq('id', slotId)
          .single();

        if (slotData) {
          await supabase
            .from('test_slots')
            .update({ current_bookings: Math.max(0, slotData.current_bookings - 1) })
            .eq('id', slotId);
        }
      }

      alert('진단검사 예약이 취소되었습니다.');

      // 목록 새로고침
      if (reservationType === 'entrance_test') {
        await loadEntranceTests();
      }
      // 부모 컴포넌트에 업데이트 알림
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('진단검사 취소 실패:', error);
      alert('예약 취소에 실패했습니다.');
    }
  };

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

  // 입학테스트 로드 (지역 기반)
  useEffect(() => {
    if (testSlots?.length > 0) {
      loadEntranceTests();
    }
  }, [testSlots]);

  const loadRegistrations = async () => {
    try {
      const data = await getAllRegistrations(campaignId);
      setRegistrations(data);
    } catch (error) {
      console.error('등록 목록 로드 실패:', error);
    }
  };

  // ⭐ 입학테스트 예약 로드 (독립 예약) - 같은 지역만 필터
  const loadEntranceTests = async () => {
    try {
      // 현재 캠페인의 지역 확인 (testSlots에서 가져오기)
      const currentLocation = testSlots?.[0]?.location;

      let query = supabase
        .from('test_reservations')
        .select('*, test_slots(*)')
        .eq('reservation_type', 'entrance_test')
        .in('status', ['confirmed', '예약'])
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // 현재 지역과 일치하는 입학테스트만 필터링
      const filteredData = currentLocation
        ? (data || []).filter(test => test.test_slots?.location === currentLocation)
        : (data || []);

      setEntranceTests(filteredData);
    } catch (error) {
      console.error('입학테스트 목록 로드 실패:', error);
    }
  };

  // 각 예약자 및 등록 학생의 제출 결과 로드
  useEffect(() => {
    loadAllResults();
  }, [tests, registrations, entranceTests]);

  const loadAllResults = async () => {
    if (tests.length === 0 && registrations.length === 0 && entranceTests.length === 0) return;

    setLoading(true);
    const newResultsMap = {};

    // 예약 학생들의 전화번호로 결과 조회
    for (const test of tests) {
      try {
        const results = await getAllResultsByPhone(test.parent_phone);
        // result가 있고 student_name이 일치하는 submission 찾기
        const submissionWithResult = results.find(r => r.result && r.student_name === test.student_name);
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
          // result가 있고 student_name이 일치하는 submission 찾기
          const submissionWithResult = results.find(r => r.result && r.student_name === reg.student_name);
          if (submissionWithResult && submissionWithResult.result) {
            newResultsMap[reg.id] = submissionWithResult.result;
          }
        } catch (error) {
          console.error(`결과 로드 실패 (${reg.parent_phone}):`, error);
        }
      }
    }

    // ⭐ 입학테스트 학생들의 전화번호로 결과 조회
    for (const test of entranceTests) {
      try {
        const results = await getAllResultsByPhone(test.parent_phone);
        // result가 있고 student_name이 일치하는 submission 찾기
        const submissionWithResult = results.find(r => r.result && r.student_name === test.student_name);
        if (submissionWithResult && submissionWithResult.result) {
          newResultsMap[test.id] = submissionWithResult.result;
        }
      } catch (error) {
        console.error(`결과 로드 실패 (${test.parent_phone}):`, error);
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
      if (editingStudent?.isManuallyAdded) {
        // 수동등록 학생 → diagnostic_submissions 테이블 수정
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
          await loadRegistrations();
        } else {
          alert('학생 정보 수정에 실패했습니다.');
          return;
        }
      } else {
        // 예약 학생 (컨설팅 연계/입학테스트) → test_reservations 테이블 수정
        const updateData = {};
        if (updatedData.studentName !== undefined) updateData.student_name = updatedData.studentName;
        if (updatedData.parentPhone !== undefined) updateData.parent_phone = formatPhone(updatedData.parentPhone);
        if (updatedData.school !== undefined) updateData.school = updatedData.school;
        if (updatedData.grade !== undefined) updateData.grade = updatedData.grade;
        if (updatedData.mathLevel !== undefined) updateData.math_level = updatedData.mathLevel;

        const { error } = await supabase
          .from('test_reservations')
          .update(updateData)
          .eq('id', updatedData.id);

        if (error) {
          console.error('예약 수정 실패:', error);
          alert('학생 정보 수정에 실패했습니다.');
          return;
        }

        // 성공 시 부모 컴포넌트에 업데이트 알림
        if (onUpdate) {
          onUpdate();
        }
      }

      handleCloseModal();

      // ⭐ 같은 전화번호의 다른 예약 정보 연동 수정 확인
      await checkSyncTargets(updatedData);
    } catch (error) {
      console.error('학생 수정 실패:', error);
      alert('학생 정보 수정 중 오류가 발생했습니다.');
    }
  };

  // ⭐ 같은 전화번호의 다른 예약 조회
  const checkSyncTargets = async (updatedData) => {
    const phone = updatedData.parentPhone;
    if (!phone) return;

    const newName = updatedData.studentName;
    const newSchool = updatedData.school;
    const newGrade = updatedData.grade;
    const newMathLevel = updatedData.mathLevel;
    const targets = [];

    try {
      // 1. 설명회 예약 조회
      const { data: seminars } = await supabase
        .from('reservations')
        .select('id, student_name, school, grade, math_level, status')
        .eq('parent_phone', phone);

      (seminars || []).forEach(s => {
        if (s.student_name !== newName || s.school !== newSchool || s.grade !== newGrade || s.math_level !== newMathLevel) {
          targets.push({
            table: 'reservations',
            id: s.id,
            label: '설명회 예약',
            student_name: s.student_name,
            school: s.school,
            grade: s.grade,
            math_level: s.math_level,
            status: s.status,
            checked: true,
          });
        }
      });

      // 2. 컨설팅 예약 조회
      const { data: consultings } = await supabase
        .from('consulting_reservations')
        .select('id, student_name, school, grade, math_level, status')
        .eq('parent_phone', phone);

      (consultings || []).forEach(c => {
        if (c.student_name !== newName || c.school !== newSchool || c.grade !== newGrade || c.math_level !== newMathLevel) {
          targets.push({
            table: 'consulting_reservations',
            id: c.id,
            label: '컨설팅 예약',
            student_name: c.student_name,
            school: c.school,
            grade: c.grade,
            math_level: c.math_level,
            status: c.status,
            checked: true,
          });
        }
      });

      // 3. 다른 진단검사 예약 조회 (현재 수정한 것 제외)
      const { data: otherTests } = await supabase
        .from('test_reservations')
        .select('id, student_name, school, grade, math_level, status')
        .eq('parent_phone', phone)
        .neq('id', updatedData.id);

      (otherTests || []).forEach(t => {
        if (t.student_name !== newName || t.school !== newSchool || t.grade !== newGrade || t.math_level !== newMathLevel) {
          targets.push({
            table: 'test_reservations',
            id: t.id,
            label: '진단검사 예약',
            student_name: t.student_name,
            school: t.school,
            grade: t.grade,
            math_level: t.math_level,
            status: t.status,
            checked: true,
          });
        }
      });

      // 4. 수동등록 조회 (현재 수정한 것 제외)
      const { data: submissions } = await supabase
        .from('diagnostic_submissions')
        .select('id, student_name, school, grade, math_level')
        .eq('parent_phone', phone)
        .neq('id', updatedData.id);

      (submissions || []).forEach(s => {
        if (s.student_name !== newName || s.school !== newSchool || s.grade !== newGrade || s.math_level !== newMathLevel) {
          targets.push({
            table: 'diagnostic_submissions',
            id: s.id,
            label: '진단검사 등록',
            student_name: s.student_name,
            school: s.school,
            grade: s.grade,
            math_level: s.math_level,
            checked: true,
          });
        }
      });

      if (targets.length > 0) {
        setSyncTargets(targets);
        setSyncUpdateData({
          student_name: newName,
          school: newSchool,
          grade: newGrade,
          math_level: newMathLevel,
        });
        setSyncModalOpen(true);
      }
    } catch (error) {
      console.error('연동 대상 조회 실패:', error);
    }
  };

  // ⭐ 연동 수정 체크박스 토글
  const toggleSyncTarget = (index) => {
    setSyncTargets(prev => prev.map((t, i) =>
      i === index ? { ...t, checked: !t.checked } : t
    ));
  };

  // ⭐ 연동 수정 실행
  const handleSyncUpdate = async () => {
    const checkedTargets = syncTargets.filter(t => t.checked);
    if (checkedTargets.length === 0) {
      setSyncModalOpen(false);
      return;
    }

    try {
      for (const target of checkedTargets) {
        const { error } = await supabase
          .from(target.table)
          .update({
            student_name: syncUpdateData.student_name,
            school: syncUpdateData.school,
            grade: syncUpdateData.grade,
            math_level: syncUpdateData.math_level,
          })
          .eq('id', target.id);

        if (error) {
          console.error(`${target.label} 수정 실패:`, error);
        }
      }

      alert(`${checkedTargets.length}건의 예약 정보가 함께 수정되었습니다.`);
      setSyncModalOpen(false);

      // 전체 새로고침
      await loadRegistrations();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('연동 수정 실패:', error);
      alert('일부 예약 정보 수정에 실패했습니다.');
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
  // tests prop에서 ID 목록 (중복 방지용)
  const testsIds = new Set(tests.map(t => t.id));

  const allStudents = [
    // 진단검사 예약 (컨설팅 연계 + 입학테스트 모두 포함)
    ...tests
      .map(test => ({
        ...test,
        source: 'reservation',
        reservation_type: test.reservation_type || 'consulting_linked',
      })),
    // 수동 등록 학생
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
        created_at: reg.created_at,
        test_slots: null,
        source: 'registration',
        reservation_type: 'manual',
      })),
    // ⭐ 입학테스트 (독립 예약) - tests에 없는 것만 추가 (중복 방지)
    ...entranceTests
      .filter(test => !testsIds.has(test.id))
      .map(test => ({
        id: test.id,
        student_name: test.student_name,
        parent_phone: test.parent_phone,
        school: test.school,
        grade: test.grade,
        math_level: test.math_level,
        test_date: test.test_slots?.date,
        test_time: test.test_slots?.time,
        location: test.location || test.test_slots?.location,
        created_at: test.created_at,
        slot_id: test.slot_id,
        test_slots: test.test_slots,
        source: 'reservation',
        reservation_type: 'entrance_test',
        paper_type: test.paper_type,
      })),
  ];

  // 필터링 (검색어 + 슬롯 필터 + 예약 유형 필터)
  const filteredTests = allStudents.filter((test) => {
    const matchesSearch =
      test.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.parent_phone?.includes(searchTerm);

    // 슬롯 필터링 (null이면 전체)
    let matchesSlot = !selectedSlotId;
    if (selectedSlotId) {
      if (test.slot_id === selectedSlotId) {
        // slot_id가 직접 매칭되는 경우 (예약 학생)
        matchesSlot = true;
      } else if (!test.slot_id && test.test_date && test.test_time) {
        // slot_id가 없는 수동등록 학생은 날짜/시간으로 매칭
        const selectedSlot = testSlots?.find(s => s.id === selectedSlotId);
        if (selectedSlot) {
          const testDate = String(test.test_date);
          const slotDate = String(selectedSlot.date);
          const testTime = String(test.test_time).slice(0, 5);
          const slotTime = String(selectedSlot.time).slice(0, 5);
          matchesSlot = testDate === slotDate && testTime === slotTime;
        }
      }
    }

    // ⭐ 예약 유형 필터링
    const matchesType =
      reservationTypeFilter === 'all' ||
      test.reservation_type === reservationTypeFilter;

    return matchesSearch && matchesSlot && matchesType;
  }).sort((a, b) => {
    // 예약일시(created_at) 최신순 정렬
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
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
  // ⭐ allStudents 기준으로 계산하여 slot_id 없는 수동등록(diagnostic_submissions)
  //   학생도 날짜+시간 매칭으로 포함. 필터 탭/목록과 슬롯 요약이 일치하도록 함.
  const slotStats = (testSlots || []).map(slot => {
    const slotDate = String(slot.date);
    const slotTime = String(slot.time).slice(0, 5);

    const reservationsForSlot = allStudents.filter(s => {
      if (s.slot_id === slot.id) return true;
      // slot_id가 없는 수동등록은 날짜/시간으로 매칭
      if (!s.slot_id && s.test_date && s.test_time) {
        const testDate = String(s.test_date);
        const testTime = String(s.test_time).slice(0, 5);
        return testDate === slotDate && testTime === slotTime;
      }
      return false;
    }).length;

    return {
      ...slot,
      reservations: reservationsForSlot
    };
  }).sort((a, b) => {
    // 날짜순, 시간순 정렬
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  const formatDateTime = formatSlotDateTime;
  const formatTestDate = formatDateShort;

  // 재채점 핸들러
  const handleRegrade = async () => {
    const testTypes = ['MONO', 'TRI'];
    const msg = `MONO, TRI 시험의 모든 채점 결과를 현재 배점표로 재채점합니다.\n계속하시겠습니까?`;
    if (!window.confirm(msg)) return;

    setRegrading(true);
    try {
      const results = [];
      for (const tt of testTypes) {
        const res = await regradeAllByTestType(tt);
        results.push(`${tt}: ${res.success}건 성공${res.failed ? `, ${res.failed}건 실패` : ''}`);
      }
      alert(`재채점 완료\n${results.join('\n')}`);
      // 결과 맵 새로고침
      if (onUpdate) onUpdate();
      setResultsMap({});
    } catch (err) {
      console.error('재채점 오류:', err);
      alert('재채점 중 오류가 발생했습니다: ' + (err.message || err));
    } finally {
      setRegrading(false);
    }
  };

  const handleExportExcel = () => {
    // 엑셀 데이터 준비
    const excelData = filteredTests.map((test) => ({
      예약일시: test.created_at
        ? new Date(test.created_at).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '',
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
      { wch: 18 }, // 예약일시
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

      {/* ⭐ 예약 유형 필터 탭 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
      }}>
        {[
          { value: 'all', label: '전체', count: allStudents.length },
          { value: 'consulting_linked', label: '컨설팅 연계', count: allStudents.filter(s => s.reservation_type === 'consulting_linked' || !s.reservation_type).length },
          { value: 'entrance_test', label: '입학테스트', count: allStudents.filter(s => s.reservation_type === 'entrance_test').length },
          { value: 'manual', label: '수동등록', count: allStudents.filter(s => s.reservation_type === 'manual').length },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setReservationTypeFilter(tab.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: reservationTypeFilter === tab.value ? '2px solid #1a73e8' : '1px solid #e2e8f0',
              background: reservationTypeFilter === tab.value ? '#e0f2fe' : 'white',
              color: reservationTypeFilter === tab.value ? '#1a73e8' : '#64748b',
              fontWeight: reservationTypeFilter === tab.value ? '600' : '400',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn-primary"
            onClick={handleAddClick}
            style={{ background: '#1a73e8', borderColor: '#1a73e8' }}
          >
            학생추가
          </button>
          <button
            className="btn-primary"
            onClick={handleRegrade}
            disabled={regrading}
            style={{ background: '#e67e22', borderColor: '#e67e22' }}
          >
            {regrading ? '재채점 중...' : '재채점'}
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
              <th>예약일시</th>
              <th>학생명</th>
              <th>학년</th>
              <th>학교</th>
              <th>선행정도</th>
              <th>학부모 연락처</th>
              <th>진단검사 날짜</th>
              <th>진단검사 시간</th>
              <th>지점</th>
              <th>성적 관리</th>
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
                    <td style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {test.created_at
                        ? new Date(test.created_at).toLocaleString('ko-KR', {
                            year: '2-digit',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                        : '-'}
                    </td>
                    <td className="highlight-cell">{test.student_name}</td>
                    <td>{test.grade || '-'}</td>
                    <td>{test.school || '-'}</td>
                    <td style={{
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={test.math_level || ''}>
                      {test.math_level || '-'}
                    </td>
                    <td>
                      <span
                        onClick={() => onPhoneClick?.(test.parent_phone)}
                        style={{ cursor: onPhoneClick ? 'pointer' : 'default', color: onPhoneClick ? '#1a73e8' : 'inherit', textDecoration: onPhoneClick ? 'underline' : 'none' }}
                      >
                        {formatPhone(test.parent_phone)}
                      </span>
                    </td>
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

      {/* ⭐ 연동 수정 확인 모달 */}
      {syncModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10000,
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '28px',
            maxWidth: '520px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#1e293b' }}>
              다른 예약 정보도 함께 수정하시겠습니까?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
              같은 연락처로 등록된 다른 예약에 이전 학생 정보가 남아 있습니다.
              수정이 필요한 항목을 선택해주세요.
            </p>

            {/* 변경 내용 요약 */}
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
              padding: '12px', marginBottom: '16px', fontSize: '13px',
            }}>
              <strong style={{ color: '#16a34a' }}>변경할 정보:</strong>{' '}
              {syncUpdateData?.student_name} / {syncUpdateData?.school} / {syncUpdateData?.grade} / {syncUpdateData?.math_level || '-'}
            </div>

            {/* 체크박스 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {syncTargets.map((target, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    border: target.checked ? '1.5px solid #1a73e8' : '1.5px solid #e2e8f0',
                    background: target.checked ? '#eff6ff' : '#fff',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={target.checked}
                    onChange={() => toggleSyncTarget(idx)}
                    style={{ marginTop: '2px', accentColor: '#1a73e8' }}
                  />
                  <div style={{ flex: 1, fontSize: '13px' }}>
                    <div style={{ fontWeight: '600', color: '#334155', marginBottom: '2px' }}>
                      {target.label}
                      {target.status && (
                        <span style={{
                          marginLeft: '6px', fontSize: '11px', padding: '1px 6px',
                          borderRadius: '4px', background: target.status === '취소' || target.status === 'cancelled' ? '#fee2e2' : '#e0f2fe',
                          color: target.status === '취소' || target.status === 'cancelled' ? '#dc2626' : '#1a73e8',
                        }}>
                          {target.status}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      {target.student_name || '-'} / {target.school || '-'} / {target.grade || '-'} / {target.math_level || '-'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSyncModalOpen(false)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                건너뛰기
              </button>
              <button
                onClick={handleSyncUpdate}
                disabled={!syncTargets.some(t => t.checked)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: syncTargets.some(t => t.checked) ? '#1a73e8' : '#cbd5e1',
                  color: 'white', cursor: syncTargets.some(t => t.checked) ? 'pointer' : 'not-allowed',
                  fontSize: '14px', fontWeight: '600',
                }}
              >
                선택 항목 수정 ({syncTargets.filter(t => t.checked).length}건)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
