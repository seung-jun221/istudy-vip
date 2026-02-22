import { useState, useEffect } from 'react';
import { supabase, hashPassword } from '../../utils/supabase';
import { formatPhone, formatSlotDateTime, formatTimestampShort } from '../../utils/format';
import { createDiagnosticRegistration } from '../../utils/diagnosticService';
import './AdminTabs.css';

export default function StudentManagementTab({ campaignId, onUpdate }) {
  // 검색
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  // 조회 결과
  const [journeyData, setJourneyData] = useState(null); // { phone, seminars, consultings, tests, results, memo }
  const [loading, setLoading] = useState(false);

  // 메모
  const [memo, setMemo] = useState('');
  const [memoStatus, setMemoStatus] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);

  // 학생 정보 수정
  const [editingStudent, setEditingStudent] = useState(null); // { name, school, grade, mathLevel }
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 비밀번호 초기화
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  // 일정변경
  const [scheduleChangeTarget, setScheduleChangeTarget] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState('');
  const [changingSchedule, setChangingSchedule] = useState(false);

  // 시험 배정 (입학테스트 등록 → 입학테스트 예약 전환)
  const [testAssignTarget, setTestAssignTarget] = useState(null);
  const [testAssignSlots, setTestAssignSlots] = useState([]);
  const [selectedTestSlotId, setSelectedTestSlotId] = useState('');
  const [assigningTest, setAssigningTest] = useState(false);

  // 신규 학생 등록
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    studentName: '', parentPhone: '', school: '', grade: '', mathLevel: '',
    testType: 'MONO',
    consultingSlotId: '',
    testSlotId: '',
  });
  const [addConsultingSlots, setAddConsultingSlots] = useState([]);
  const [addTestSlots, setAddTestSlots] = useState([]);
  const [addSaving, setAddSaving] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // ============================================================
  // 검색 및 데이터 로드
  // ============================================================

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) return;

    setSearching(true);
    setJourneyData(null);

    try {
      // 전화번호 형식이면 정규화
      const isPhone = /^[0-9\-]+$/.test(term);
      const cleanedDigits = isPhone ? term.replace(/[^0-9]/g, '') : null;

      // 전화번호 찾기 (이름 검색이면 먼저 전화번호 특정)
      let phone = null;

      if (isPhone && cleanedDigits.length >= 10) {
        // 전체 전화번호 → 정규화 후 정확 검색
        phone = formatPhone(term);
      } else if (isPhone && cleanedDigits.length >= 3) {
        // 부분 전화번호 → 부분 일치 검색
        const phones = new Set();
        const pattern = `%${cleanedDigits}%`;

        const [r1, r2, r3, r4] = await Promise.all([
          supabase.from('reservations').select('parent_phone').like('parent_phone', pattern),
          supabase.from('consulting_reservations').select('parent_phone').like('parent_phone', pattern),
          supabase.from('test_reservations').select('parent_phone').like('parent_phone', pattern),
          supabase.from('diagnostic_submissions').select('parent_phone').like('parent_phone', pattern),
        ]);

        // 하이픈 포함 형태로도 검색 (DB에 010-1234-5678 형식 저장)
        const formattedPattern = `%${term}%`;
        const [r5, r6, r7, r8] = await Promise.all([
          supabase.from('reservations').select('parent_phone').like('parent_phone', formattedPattern),
          supabase.from('consulting_reservations').select('parent_phone').like('parent_phone', formattedPattern),
          supabase.from('test_reservations').select('parent_phone').like('parent_phone', formattedPattern),
          supabase.from('diagnostic_submissions').select('parent_phone').like('parent_phone', formattedPattern),
        ]);

        [r1, r2, r3, r4, r5, r6, r7, r8].forEach(res => {
          res.data?.forEach(r => phones.add(r.parent_phone));
        });

        if (phones.size === 0) {
          setJourneyData({ phone: null, notFound: true });
          return;
        }

        phone = [...phones][0];
      }

      if (!phone) {
        // 이름으로 검색 → 전화번호 찾기
        const phones = new Set();

        const { data: s1 } = await supabase
          .from('reservations')
          .select('parent_phone')
          .ilike('student_name', `%${term}%`);
        s1?.forEach(r => phones.add(r.parent_phone));

        const { data: s2 } = await supabase
          .from('consulting_reservations')
          .select('parent_phone')
          .ilike('student_name', `%${term}%`);
        s2?.forEach(r => phones.add(r.parent_phone));

        const { data: s3 } = await supabase
          .from('test_reservations')
          .select('parent_phone')
          .ilike('student_name', `%${term}%`);
        s3?.forEach(r => phones.add(r.parent_phone));

        const { data: s4 } = await supabase
          .from('diagnostic_submissions')
          .select('parent_phone')
          .ilike('student_name', `%${term}%`);
        s4?.forEach(r => phones.add(r.parent_phone));

        if (phones.size === 0) {
          setJourneyData({ phone: null, notFound: true });
          return;
        }

        // 첫 번째 전화번호 사용 (여러 건이면 첫 번째)
        phone = [...phones][0];
      }

      await loadJourney(phone);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setSearching(false);
    }
  };

  const loadJourney = async (phone) => {
    setLoading(true);
    try {
      // 4개 테이블 병렬 조회
      const [seminarRes, consultingRes, testRes, diagnosticRes, memoRes] = await Promise.all([
        supabase
          .from('reservations')
          .select('*, seminar_slots(*)')
          .eq('parent_phone', phone)
          .order('registered_at', { ascending: false }),
        supabase
          .from('consulting_reservations')
          .select('*, consulting_slots(*)')
          .eq('parent_phone', phone)
          .order('created_at', { ascending: false }),
        supabase
          .from('test_reservations')
          .select('*, test_slots(*)')
          .eq('parent_phone', phone)
          .order('created_at', { ascending: false }),
        supabase
          .from('diagnostic_submissions')
          .select('*')
          .eq('parent_phone', phone)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('customer_memos')
          .select('memo, status')
          .eq('parent_phone', phone)
          .maybeSingle(),
      ]);

      if (memoRes.data) {
        setMemo(memoRes.data.memo || '');
        setMemoStatus(memoRes.data.status || '');
      } else {
        setMemo('');
        setMemoStatus('');
      }

      setJourneyData({
        phone,
        seminars: seminarRes.data || [],
        consultings: consultingRes.data || [],
        tests: testRes.data || [],
        results: diagnosticRes.data || [],
        notFound: false,
      });
    } catch (error) {
      console.error('여정 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 자녀별 그룹핑
  // ============================================================

  const groupByStudent = () => {
    if (!journeyData || journeyData.notFound) return [];

    const studentMap = new Map(); // student_name → { info, events }

    const addToStudent = (name, info, event) => {
      // 이름 정규화: 공백 제거, 빈 이름 처리
      const key = (name || '(이름없음)').trim();
      if (!studentMap.has(key)) {
        studentMap.set(key, { name: key, info, events: [] });
      }
      const student = studentMap.get(key);
      // 더 최신 정보로 업데이트 (취소된 레코드보다 활성 레코드 우선)
      const isActiveEvent = !['cancelled', 'auto_cancelled', '취소'].includes(event.status);
      const wasActiveUpdate = student.info?._isActive;
      if (info && (
        (!student.info) ||
        (isActiveEvent && !wasActiveUpdate) ||
        (isActiveEvent === wasActiveUpdate && new Date(event.rawDate) > new Date(student.info._updatedAt || 0))
      )) {
        student.info = { ...info, _updatedAt: event.rawDate, _isActive: isActiveEvent };
      }
      student.events.push(event);
    };

    // 설명회
    journeyData.seminars.forEach(s => {
      addToStudent(s.student_name, {
        school: s.school,
        grade: s.grade,
        math_level: s.math_level,
      }, {
        rawDate: s.registered_at,
        type: 'seminar',
        icon: '📝',
        label: '설명회 예약',
        detail: `${formatDateTime(s.seminar_slots?.date, s.seminar_slots?.time)} ${s.seminar_slots?.location || ''}`,
        status: s.status,
        id: s.id,
        table: 'reservations',
        slotId: s.seminar_slot_id,
        canChange: s.status !== '취소',
        canDelete: s.status !== '취소',
      });
    });

    // 컨설팅
    journeyData.consultings.forEach(c => {
      addToStudent(c.student_name, {
        school: c.school,
        grade: c.grade,
        math_level: c.math_level,
      }, {
        rawDate: c.created_at,
        type: 'consulting',
        icon: '📅',
        label: '컨설팅 예약',
        detail: `${formatDateTime(c.consulting_slots?.date, c.consulting_slots?.time)} ${c.consulting_slots?.location || ''}`,
        status: c.status,
        consultingMemo: c.consultation_memo,
        enrollmentStatus: c.enrollment_status,
        id: c.id,
        table: 'consulting_reservations',
        slotId: c.slot_id,
        canChange: !['cancelled', 'auto_cancelled', '취소'].includes(c.status),
        canDelete: !['cancelled', 'auto_cancelled', '취소'].includes(c.status),
      });
    });

    // 진단검사 예약
    journeyData.tests.forEach(t => {
      addToStudent(t.student_name, {
        school: t.school,
        grade: t.grade,
        math_level: t.math_level,
      }, {
        rawDate: t.created_at,
        type: 'test',
        icon: '📋',
        label: t.reservation_type === 'entrance_test' ? '입학테스트 예약' : '진단검사 예약',
        detail: `${formatDateTime(t.test_slots?.date, t.test_slots?.time)} ${t.test_slots?.location || ''}`,
        status: t.status,
        id: t.id,
        table: 'test_reservations',
        slotId: t.slot_id,
        canChange: t.status !== '취소' && t.status !== 'cancelled',
        canDelete: t.status !== '취소' && t.status !== 'cancelled',
      });
    });

    // 진단검사 응시
    journeyData.results.forEach(r => {
      addToStudent(r.student_name, {
        school: r.school,
        grade: r.grade,
        math_level: r.math_level,
      }, {
        rawDate: r.submitted_at || r.created_at,
        type: 'diagnostic',
        icon: '🏆',
        label: r.submission_type === 'registration' ? '입학테스트 등록' : '진단검사 응시',
        detail: `${r.test_type || ''} ${r.submission_type === 'registration' ? '' : '- 채점완료'}`,
        status: r.submission_type === 'registration' ? '등록' : '완료',
        id: r.id,
        table: 'diagnostic_submissions',
        canChange: false,
        canDelete: r.submission_type === 'registration', // 등록 타입만 삭제 가능
        canAssignTest: r.submission_type === 'registration', // 등록 타입은 시험 배정 가능
        studentName: r.student_name,
        parentPhone: r.parent_phone,
        school: r.school,
        grade: r.grade,
        mathLevel: r.math_level,
        testType: r.test_type,
      });
    });

    // 각 학생의 이벤트를 날짜순 정렬 (최신 먼저)
    const students = [...studentMap.values()];
    students.forEach(s => {
      s.events.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    });

    return students;
  };

  // ============================================================
  // 메모 저장
  // ============================================================

  const saveMemo = async () => {
    if (!journeyData?.phone) return;
    setMemoSaving(true);
    try {
      const students = groupByStudent();
      const { error } = await supabase
        .from('customer_memos')
        .upsert({
          parent_phone: journeyData.phone,
          memo,
          status: memoStatus || null,
          student_name: students[0]?.name || null,
          campaign_id: campaignId || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'parent_phone',
          ignoreDuplicates: false,
        });

      if (error) throw error;
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    } catch (error) {
      console.error('메모 저장 실패:', error);
      alert('메모 저장에 실패했습니다.');
    } finally {
      setMemoSaving(false);
    }
  };

  // ============================================================
  // 학생 정보 수정 + 전 테이블 동기화
  // ============================================================

  const startEditStudent = (studentName, info) => {
    setEditingStudent(studentName);
    setEditForm({
      student_name: studentName,
      school: info?.school || '',
      grade: info?.grade || '',
      math_level: info?.math_level || '',
    });
  };

  const saveStudentInfo = async () => {
    if (!journeyData?.phone || !editingStudent) return;
    setEditSaving(true);
    try {
      const phone = journeyData.phone;
      const oldName = editingStudent;
      const updateData = {
        student_name: editForm.student_name || oldName,
        school: editForm.school ?? '',
        grade: editForm.grade ?? '',
        math_level: editForm.math_level ?? '',
      };

      // 4개 테이블 모두 동기화 (.select()로 실제 반영 확인)
      const tables = ['reservations', 'consulting_reservations', 'test_reservations', 'diagnostic_submissions'];
      const updates = await Promise.allSettled(
        tables.map(table =>
          supabase
            .from(table)
            .update(updateData)
            .eq('parent_phone', phone)
            .eq('student_name', oldName)
            .select()
        )
      );

      // 에러 체크
      const errors = [];
      updates.forEach((u, i) => {
        if (u.status === 'rejected') {
          errors.push(`${tables[i]}: ${u.reason}`);
        } else if (u.value.error) {
          errors.push(`${tables[i]}: ${u.value.error.message}`);
        }
      });
      if (errors.length > 0) {
        console.error('테이블 동기화 실패:', errors);
      }

      setEditingStudent(null);
      // 이름이 변경된 경우 새 이름 기준으로 새로고침
      const newPhone = phone;
      await loadJourney(newPhone);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('학생 정보 수정 실패:', error);
      alert('학생 정보 수정에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  // ============================================================
  // 비밀번호 초기화 (개별 학생)
  // ============================================================

  const resetStudentPassword = async () => {
    if (!resetPasswordTarget || !journeyData?.phone) return;
    setResettingPassword(true);
    try {
      const phone = journeyData.phone;
      const studentName = resetPasswordTarget.name;
      const defaultPassword = hashPassword('000000');

      // 4개 테이블에서 해당 학생의 비밀번호 초기화
      const tables = ['reservations', 'consulting_reservations', 'test_reservations', 'diagnostic_submissions'];
      let resetCount = 0;

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .update({ password: defaultPassword })
          .eq('parent_phone', phone)
          .eq('student_name', studentName)
          .select();

        if (!error && data) {
          resetCount += data.length;
        }
      }

      alert(`${studentName} 학생의 비밀번호가 초기화되었습니다. (${resetCount}건)`);
      setResetPasswordTarget(null);
    } catch (error) {
      console.error('비밀번호 초기화 실패:', error);
      alert('비밀번호 초기화에 실패했습니다.');
    } finally {
      setResettingPassword(false);
    }
  };

  // ============================================================
  // 예약 삭제 (취소 처리)
  // ============================================================

  const handleDelete = async () => {
    if (!deleteTarget || !journeyData?.phone) return;
    setDeleting(true);
    try {
      const { id, table, slotId } = deleteTarget;

      // diagnostic_submissions는 실제로 삭제 (취소 상태 없음)
      if (table === 'diagnostic_submissions') {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // 다른 테이블은 상태를 '취소'로 변경
        const { error } = await supabase
          .from(table)
          .update({ status: '취소' })
          .eq('id', id);

        if (error) throw error;

        // 슬롯 카운트 감소
        if (slotId) {
          const slotTable = table === 'reservations' ? 'seminar_slots'
            : table === 'consulting_reservations' ? 'consulting_slots'
            : 'test_slots';

          const { data: slot } = await supabase
            .from(slotTable)
            .select('current_bookings')
            .eq('id', slotId)
            .single();

          if (slot) {
            await supabase
              .from(slotTable)
              .update({ current_bookings: Math.max(0, (slot.current_bookings || 1) - 1) })
              .eq('id', slotId);
          }
        }
      }

      setDeleteTarget(null);
      await loadJourney(journeyData.phone);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('예약 삭제 실패:', error);
      alert('예약 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // 일정 변경
  // ============================================================

  const startScheduleChange = async (event) => {
    setScheduleChangeTarget(event);
    setSelectedNewSlotId('');

    try {
      const slotTable = event.table === 'reservations' ? 'seminar_slots'
        : event.table === 'consulting_reservations' ? 'consulting_slots'
        : 'test_slots';

      const today = new Date().toISOString().split('T')[0];

      // 테이블별 컬럼명이 다름
      let query = supabase.from(slotTable).select('*').gte('date', today);

      if (slotTable === 'consulting_slots') {
        query = query.eq('linked_seminar_id', campaignId).eq('is_available', true);
      } else if (slotTable === 'test_slots') {
        query = query.eq('status', 'active');
      } else {
        // seminar_slots
        query = query.eq('campaign_id', campaignId);
      }

      const { data: slots } = await query
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      setAvailableSlots(slots || []);
    } catch (error) {
      console.error('슬롯 로드 실패:', error);
      setAvailableSlots([]);
    }
  };

  const executeScheduleChange = async () => {
    if (!scheduleChangeTarget || !selectedNewSlotId || !journeyData?.phone) return;
    setChangingSchedule(true);
    try {
      const { id, table, slotId: oldSlotId } = scheduleChangeTarget;

      const slotTable = table === 'reservations' ? 'seminar_slots'
        : table === 'consulting_reservations' ? 'consulting_slots'
        : 'test_slots';

      const slotFkField = table === 'reservations' ? 'seminar_slot_id'
        : table === 'consulting_reservations' ? 'slot_id'
        : 'slot_id';

      // 새 슬롯 정보 가져오기
      const { data: newSlot } = await supabase
        .from(slotTable)
        .select('*')
        .eq('id', selectedNewSlotId)
        .single();

      if (!newSlot) throw new Error('슬롯을 찾을 수 없습니다.');

      if (newSlot.current_bookings >= newSlot.max_capacity) {
        alert('선택한 시간은 이미 마감되었습니다.');
        return;
      }

      // 예약 슬롯 변경
      const updateData = { [slotFkField]: selectedNewSlotId };

      // test_reservations는 test_date, test_time도 업데이트
      if (table === 'test_reservations') {
        updateData.test_date = newSlot.date;
        updateData.test_time = newSlot.time;
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // 기존 슬롯 카운트 감소
      if (oldSlotId) {
        const { data: oldSlot } = await supabase
          .from(slotTable)
          .select('current_bookings')
          .eq('id', oldSlotId)
          .single();

        if (oldSlot) {
          await supabase
            .from(slotTable)
            .update({ current_bookings: Math.max(0, (oldSlot.current_bookings || 1) - 1) })
            .eq('id', oldSlotId);
        }
      }

      // 새 슬롯 카운트 증가
      await supabase
        .from(slotTable)
        .update({ current_bookings: (newSlot.current_bookings || 0) + 1 })
        .eq('id', selectedNewSlotId);

      setScheduleChangeTarget(null);
      await loadJourney(journeyData.phone);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('일정 변경 실패:', error);
      alert('일정 변경에 실패했습니다.');
    } finally {
      setChangingSchedule(false);
    }
  };

  // ============================================================
  // 시험 배정 (입학테스트 등록 → 입학테스트 예약)
  // ============================================================

  const startTestAssign = async (event) => {
    setTestAssignTarget(event);
    setSelectedTestSlotId('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: slots } = await supabase
        .from('test_slots')
        .select('*')
        .gte('date', today)
        .eq('status', 'active')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      setTestAssignSlots(slots || []);
    } catch (error) {
      console.error('슬롯 로드 실패:', error);
      setTestAssignSlots([]);
    }
  };

  const executeTestAssign = async () => {
    if (!testAssignTarget || !selectedTestSlotId || !journeyData?.phone) return;
    setAssigningTest(true);
    try {
      const slot = testAssignSlots.find(s => s.id === selectedTestSlotId);
      if (!slot) throw new Error('슬롯을 찾을 수 없습니다.');

      if (slot.current_bookings >= slot.max_capacity) {
        alert('선택한 시간은 이미 마감되었습니다.');
        return;
      }

      const defaultPassword = hashPassword(journeyData.phone.replace(/-/g, ''));

      // test_reservations 생성
      const { error: testError } = await supabase
        .from('test_reservations')
        .insert({
          slot_id: selectedTestSlotId,
          student_name: testAssignTarget.studentName,
          parent_phone: journeyData.phone,
          location: slot.location || '',
          school: testAssignTarget.school || '',
          grade: testAssignTarget.grade || '',
          math_level: testAssignTarget.mathLevel || '',
          password: defaultPassword,
          status: '예약',
          reservation_type: 'entrance_test',
          test_date: slot.date,
          test_time: slot.time,
        });

      if (testError) throw testError;

      // 슬롯 카운트 증가
      await supabase
        .from('test_slots')
        .update({ current_bookings: (slot.current_bookings || 0) + 1 })
        .eq('id', selectedTestSlotId);

      setTestAssignTarget(null);
      await loadJourney(journeyData.phone);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('시험 배정 실패:', error);
      alert('시험 배정에 실패했습니다.');
    } finally {
      setAssigningTest(false);
    }
  };

  // ============================================================
  // 신규 학생 등록
  // ============================================================

  const openAddForm = async () => {
    setAddForm({
      studentName: '', parentPhone: '', school: '', grade: '', mathLevel: '',
      testType: 'MONO', consultingSlotId: '', testSlotId: '',
    });
    setShowAddForm(true);
    await loadSlots();
  };

  const loadSlots = async () => {
    setSlotsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [consultingRes, testRes] = await Promise.all([
        supabase
          .from('consulting_slots')
          .select('*')
          .eq('linked_seminar_id', campaignId)
          .gte('date', today)
          .eq('is_available', true)
          .order('date', { ascending: true })
          .order('time', { ascending: true }),
        supabase
          .from('test_slots')
          .select('*')
          .gte('date', today)
          .eq('status', 'active')
          .order('date', { ascending: true })
          .order('time', { ascending: true }),
      ]);
      setAddConsultingSlots(consultingRes.data || []);
      setAddTestSlots(testRes.data || []);
    } catch (error) {
      console.error('슬롯 로드 실패:', error);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    // 유효성 검사
    if (addForm.studentName.trim().length < 2) {
      alert('학생명을 정확히 입력해주세요. (2자 이상)');
      return;
    }
    const phoneDigits = addForm.parentPhone.replace(/[^0-9]/g, '');
    if (!/^010\d{8}$/.test(phoneDigits)) {
      alert('올바른 전화번호를 입력해주세요. (010으로 시작하는 11자리)');
      return;
    }
    if (!addForm.grade) {
      alert('학년을 선택해주세요.');
      return;
    }

    setAddSaving(true);
    try {
      const phone = formatPhone(phoneDigits);
      const defaultPassword = hashPassword(phoneDigits);

      // 1. diagnostic_submissions 등록 (기본 레코드)
      const registration = await createDiagnosticRegistration({
        student_name: addForm.studentName.trim(),
        parent_phone: phone,
        school: addForm.school.trim() || null,
        grade: addForm.grade,
        math_level: addForm.mathLevel.trim() || null,
        test_type: addForm.testType,
        campaign_id: campaignId,
      });

      if (!registration) {
        throw new Error('학생 등록에 실패했습니다.');
      }

      // 2. 컨설팅 배정
      if (addForm.consultingSlotId) {
        const slot = addConsultingSlots.find(s => s.id === addForm.consultingSlotId);
        if (slot && slot.current_bookings < slot.max_capacity) {
          const { error: consultingError } = await supabase
            .from('consulting_reservations')
            .insert({
              slot_id: addForm.consultingSlotId,
              student_name: addForm.studentName.trim(),
              parent_phone: phone,
              school: addForm.school.trim() || '',
              grade: addForm.grade,
              math_level: addForm.mathLevel.trim() || '',
              password: defaultPassword,
              is_seminar_attendee: false,
              status: 'confirmed',
            });

          if (consultingError) {
            console.error('컨설팅 배정 실패:', consultingError);
            alert('학생은 등록되었으나 컨설팅 배정에 실패했습니다.');
          } else {
            await supabase
              .from('consulting_slots')
              .update({ current_bookings: (slot.current_bookings || 0) + 1 })
              .eq('id', addForm.consultingSlotId);
          }
        } else {
          alert('선택한 컨설팅 시간이 마감되었습니다.');
        }
      }

      // 3. 진단검사 배정
      if (addForm.testSlotId) {
        const slot = addTestSlots.find(s => s.id === addForm.testSlotId);
        if (slot && slot.current_bookings < slot.max_capacity) {
          // 같은 전화번호의 confirmed 컨설팅 예약 찾기 (자동 연결)
          let consultingReservationId = null;
          const { data: existingConsulting } = await supabase
            .from('consulting_reservations')
            .select('id')
            .eq('parent_phone', phone)
            .eq('student_name', addForm.studentName.trim())
            .in('status', ['confirmed', 'pending'])
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingConsulting && existingConsulting.length > 0) {
            consultingReservationId = existingConsulting[0].id;
          }

          const { error: testError } = await supabase
            .from('test_reservations')
            .insert({
              slot_id: addForm.testSlotId,
              consulting_reservation_id: consultingReservationId,
              student_name: addForm.studentName.trim(),
              parent_phone: phone,
              location: slot.location || '',
              school: addForm.school.trim() || '',
              grade: addForm.grade,
              math_level: addForm.mathLevel.trim() || '',
              password: defaultPassword,
              status: '예약',
              reservation_type: 'entrance_test',
              test_date: slot.date,
              test_time: slot.time,
            });

          if (testError) {
            console.error('진단검사 배정 실패:', testError);
            alert('학생은 등록되었으나 진단검사 배정에 실패했습니다.');
          } else {
            await supabase
              .from('test_slots')
              .update({ current_bookings: (slot.current_bookings || 0) + 1 })
              .eq('id', addForm.testSlotId);
          }
        } else {
          alert('선택한 진단검사 시간이 마감되었습니다.');
        }
      }

      setShowAddForm(false);
      // 등록한 학생 바로 조회
      setSearchTerm(phone);
      await loadJourney(phone);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('학생 등록 실패:', error);
      alert('학생 등록에 실패했습니다.');
    } finally {
      setAddSaving(false);
    }
  };

  // ============================================================
  // 유틸리티
  // ============================================================

  const formatDateTime = formatSlotDateTime;
  const formatTimestamp = formatTimestampShort;

  const getStatusBadge = (status) => {
    const styles = {
      '예약': { bg: '#dbeafe', color: '#1d4ed8' },
      '참석': { bg: '#dcfce7', color: '#16a34a' },
      '대기': { bg: '#fef3c7', color: '#d97706' },
      '취소': { bg: '#fee2e2', color: '#dc2626' },
      'cancelled': { bg: '#fee2e2', color: '#dc2626' },
      'auto_cancelled': { bg: '#fef3c7', color: '#d97706' },
      'confirmed': { bg: '#dcfce7', color: '#16a34a' },
      'pending': { bg: '#e0e7ff', color: '#4f46e5' },
      '완료': { bg: '#dcfce7', color: '#16a34a' },
      '등록': { bg: '#e0e7ff', color: '#4f46e5' },
      '확정': { bg: '#dcfce7', color: '#16a34a' },
    };
    const style = styles[status] || { bg: '#f3f4f6', color: '#6b7280' };
    const label = status === 'auto_cancelled' ? '자동취소'
      : status === 'cancelled' ? '취소'
      : status === 'confirmed' ? '확정'
      : status;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
      }}>
        {label}
      </span>
    );
  };

  const students = groupByStudent();

  // ============================================================
  // 렌더링
  // ============================================================

  return (
    <div className="tab-container">
      {/* 검색 섹션 */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0369a1' }}>
          통합 학생 관리
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="전화번호 또는 학생명으로 검색..."
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              padding: '10px 20px',
              background: searching ? '#d1d5db' : '#0369a1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: searching ? 'not-allowed' : 'pointer',
            }}
          >
            {searching ? '검색 중...' : '검색'}
          </button>
          <button
            onClick={openAddForm}
            style={{
              padding: '10px 20px',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + 신규 학생 등록
          </button>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          데이터 로드 중...
        </div>
      )}

      {/* 검색 결과 없음 */}
      {journeyData?.notFound && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          검색 결과가 없습니다.
        </div>
      )}

      {/* 검색 결과 */}
      {journeyData && !journeyData.notFound && !loading && (
        <div>
          {/* 전화번호 헤더 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: '8px',
            borderLeft: '4px solid #0369a1',
          }}>
            <span style={{ fontSize: '16px' }}>📱</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
              {journeyData.phone}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              (자녀 {students.length}명)
            </span>
          </div>

          {/* 메모 섹션 (가정 단위) */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              메모 (가정 단위)
            </h3>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="고객에 대한 메모를 입력하세요..."
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '500' }}>처리 상태:</span>
                {['대기중', '처리중', '처리완료'].map(status => {
                  const colors = {
                    '대기중': { bg: '#fef3c7', color: '#d97706', border: '#d97706' },
                    '처리중': { bg: '#dbeafe', color: '#1d4ed8', border: '#1d4ed8' },
                    '처리완료': { bg: '#dcfce7', color: '#16a34a', border: '#16a34a' },
                  };
                  const c = colors[status];
                  const isActive = memoStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setMemoStatus(isActive ? '' : status)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: isActive ? `2px solid ${c.border}` : '1px solid #e5e7eb',
                        background: isActive ? c.bg : 'white',
                        color: isActive ? c.color : '#6b7280',
                        fontSize: '12px',
                        fontWeight: isActive ? '600' : '400',
                        cursor: 'pointer',
                      }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {memoSaved && <span style={{ color: '#16a34a', fontSize: '13px' }}>저장됨</span>}
                <button
                  onClick={saveMemo}
                  disabled={memoSaving}
                  style={{
                    padding: '6px 16px',
                    background: memoSaving ? '#d1d5db' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: memoSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {memoSaving ? '저장 중...' : '메모 저장'}
                </button>
              </div>
            </div>
          </div>

          {/* 자녀별 카드 */}
          {students.map((student) => (
            <div
              key={student.name}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '16px',
                overflow: 'hidden',
              }}
            >
              {/* 학생 헤더 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                    {student.name}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    {student.info?.school || ''} {student.info?.grade ? `· ${student.info.grade}` : ''} {student.info?.math_level ? `· ${student.info.math_level}` : ''}
                  </span>
                </div>

                {editingStudent === student.name ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={saveStudentInfo}
                      disabled={editSaving}
                      style={{
                        padding: '4px 12px',
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {editSaving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => setEditingStudent(null)}
                      style={{
                        padding: '4px 12px',
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => startEditStudent(student.name, student.info)}
                      style={{
                        padding: '4px 12px',
                        background: '#e0e7ff',
                        color: '#4f46e5',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      정보 수정
                    </button>
                    <button
                      onClick={() => setResetPasswordTarget(student)}
                      style={{
                        padding: '4px 12px',
                        background: '#fef3c7',
                        color: '#d97706',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      비밀번호 초기화
                    </button>
                  </div>
                )}
              </div>

              {/* 정보 수정 폼 */}
              {editingStudent === student.name && (
                <div style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: '8px',
                }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>이름</label>
                    <input
                      value={editForm.student_name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, student_name: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>학교</label>
                    <input
                      value={editForm.school || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, school: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>학년</label>
                    <select
                      value={editForm.grade || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, grade: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="">선택</option>
                      {['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>수학 선행</label>
                    <input
                      value={editForm.math_level || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, math_level: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {/* 타임라인 */}
              <div style={{ padding: '12px 16px' }}>
                {student.events.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                    기록 없음
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* 타임라인 라인 */}
                    <div style={{
                      position: 'absolute',
                      left: '15px',
                      top: '8px',
                      bottom: '8px',
                      width: '2px',
                      background: '#e2e8f0',
                    }} />

                    {student.events.map((event, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          marginBottom: idx < student.events.length - 1 ? '12px' : '0',
                          position: 'relative',
                        }}
                      >
                        {/* 아이콘 */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#fff',
                          border: '2px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          zIndex: 1,
                          flexShrink: 0,
                        }}>
                          {event.icon}
                        </div>

                        {/* 내용 */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '600', fontSize: '13px' }}>{event.label}</span>
                            {getStatusBadge(event.status)}
                            {/* 액션 버튼 */}
                            {event.canChange && (
                              <button
                                onClick={() => startScheduleChange(event)}
                                style={{
                                  padding: '2px 8px',
                                  background: 'white',
                                  color: '#0369a1',
                                  border: '1px solid #bae6fd',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                일정변경
                              </button>
                            )}
                            {event.canAssignTest && (
                              <button
                                onClick={() => startTestAssign(event)}
                                style={{
                                  padding: '2px 8px',
                                  background: 'white',
                                  color: '#7c3aed',
                                  border: '1px solid #c4b5fd',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                시험배정
                              </button>
                            )}
                            {event.canDelete && (
                              <button
                                onClick={() => setDeleteTarget(event)}
                                style={{
                                  padding: '2px 8px',
                                  background: 'white',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                삭제
                              </button>
                            )}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{event.detail}</div>
                          {/* 컨설팅 메모 */}
                          {event.consultingMemo && (
                            <div style={{
                              marginTop: '4px',
                              padding: '4px 8px',
                              background: '#f0fdf4',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#166534',
                            }}>
                              {event.consultingMemo}
                              {event.enrollmentStatus && (
                                <span style={{ marginLeft: '8px', fontWeight: '600' }}>
                                  [등록: {event.enrollmentStatus}]
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                            {formatTimestamp(event.rawDate)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 초기 상태 안내 */}
      {!journeyData && !loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <p style={{ fontSize: '15px', marginBottom: '4px' }}>전화번호 또는 학생명을 검색하세요</p>
          <p style={{ fontSize: '13px' }}>학생 정보 수정, 예약 일정변경/삭제를 이 탭에서 통합 관리할 수 있습니다.</p>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              maxWidth: '360px', width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#dc2626' }}>예약 삭제 확인</h3>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
              <strong>{deleteTarget.label}</strong>을(를) 취소하시겠습니까?
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              {deleteTarget.detail}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1, padding: '10px', border: '1px solid #d1d5db',
                  borderRadius: '6px', background: 'white', cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  borderRadius: '6px', background: '#dc2626', color: 'white',
                  cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: '500',
                }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 초기화 확인 모달 */}
      {resetPasswordTarget && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setResetPasswordTarget(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              maxWidth: '360px', width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#d97706' }}>비밀번호 초기화</h3>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
              <strong>{resetPasswordTarget.name}</strong> 학생의 비밀번호를 초기화하시겠습니까?
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              비밀번호가 <strong>000000</strong>으로 초기화됩니다.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setResetPasswordTarget(null)}
                style={{
                  flex: 1, padding: '10px', border: '1px solid #d1d5db',
                  borderRadius: '6px', background: 'white', cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                취소
              </button>
              <button
                onClick={resetStudentPassword}
                disabled={resettingPassword}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  borderRadius: '6px', background: '#d97706', color: 'white',
                  cursor: resettingPassword ? 'not-allowed' : 'pointer', fontWeight: '500',
                }}
              >
                {resettingPassword ? '처리 중...' : '초기화'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 학생 등록 모달 */}
      {showAddForm && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddForm(false)}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              maxWidth: '520px', width: '100%', maxHeight: '85vh', overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', color: '#0f172a' }}>
              신규 학생 등록
            </h3>

            {/* 학생 기본 정보 */}
            <div style={{
              background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151' }}>학생 정보</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    학생명 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    value={addForm.studentName}
                    onChange={(e) => setAddForm(prev => ({ ...prev, studentName: e.target.value }))}
                    placeholder="홍길동"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    학부모 연락처 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    value={addForm.parentPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setAddForm(prev => ({ ...prev, parentPhone: value }));
                    }}
                    placeholder="01012345678"
                    maxLength={11}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>학교</label>
                  <input
                    value={addForm.school}
                    onChange={(e) => setAddForm(prev => ({ ...prev, school: e.target.value }))}
                    placeholder="○○중학교"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    학년 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={addForm.grade}
                    onChange={(e) => setAddForm(prev => ({ ...prev, grade: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">선택</option>
                    {['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>수학 선행정도</label>
                  <input
                    value={addForm.mathLevel}
                    onChange={(e) => setAddForm(prev => ({ ...prev, mathLevel: e.target.value }))}
                    placeholder="예: 중3 (고1 선행 중)"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* 컨설팅 배정 */}
            <div style={{
              background: '#f0fdf4', borderRadius: '8px', padding: '16px', marginBottom: '16px',
              border: '1px solid #bbf7d0',
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📅 컨설팅 배정 <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(선택)</span>
              </h4>
              {slotsLoading ? (
                <div style={{ color: '#64748b', fontSize: '13px' }}>슬롯 로드 중...</div>
              ) : addConsultingSlots.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>배정 가능한 컨설팅 일정이 없습니다.</div>
              ) : (
                <select
                  value={addForm.consultingSlotId}
                  onChange={(e) => setAddForm(prev => ({ ...prev, consultingSlotId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                >
                  <option value="">배정하지 않음</option>
                  {addConsultingSlots.map(slot => {
                    const isFull = slot.current_bookings >= slot.max_capacity;
                    return (
                      <option key={slot.id} value={slot.id} disabled={isFull}>
                        {formatDateTime(slot.date, slot.time)} | {slot.location || '-'} ({slot.current_bookings || 0}/{slot.max_capacity}){isFull ? ' [마감]' : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* 진단검사 배정 */}
            <div style={{
              background: '#eff6ff', borderRadius: '8px', padding: '16px', marginBottom: '20px',
              border: '1px solid #bfdbfe',
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📋 진단검사 배정 <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(선택)</span>
              </h4>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>검사 유형</label>
                <select
                  value={addForm.testType}
                  onChange={(e) => setAddForm(prev => ({ ...prev, testType: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                >
                  <option value="MONO">중1-1 진단검사</option>
                  <option value="DI">중2-1 진단검사</option>
                  <option value="TRI">중3-1 + 공통수학1 진단검사</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>검사 일정</label>
                {slotsLoading ? (
                  <div style={{ color: '#64748b', fontSize: '13px' }}>슬롯 로드 중...</div>
                ) : addTestSlots.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>배정 가능한 진단검사 일정이 없습니다.</div>
                ) : (
                  <select
                    value={addForm.testSlotId}
                    onChange={(e) => setAddForm(prev => ({ ...prev, testSlotId: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">일정 배정하지 않음</option>
                    {addTestSlots.map(slot => {
                      const isFull = slot.current_bookings >= slot.max_capacity;
                      return (
                        <option key={slot.id} value={slot.id} disabled={isFull}>
                          {formatDateTime(slot.date, slot.time)} | {slot.location || '-'} ({slot.current_bookings || 0}/{slot.max_capacity}){isFull ? ' [마감]' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  flex: 1, padding: '12px', border: '1px solid #d1d5db',
                  borderRadius: '6px', background: 'white', cursor: 'pointer',
                  fontWeight: '500', fontSize: '14px',
                }}
              >
                취소
              </button>
              <button
                onClick={handleAddStudent}
                disabled={addSaving}
                style={{
                  flex: 1, padding: '12px', border: 'none',
                  borderRadius: '6px',
                  background: addSaving ? '#d1d5db' : '#16a34a',
                  color: 'white',
                  cursor: addSaving ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '14px',
                }}
              >
                {addSaving ? '등록 중...' : '학생 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정변경 모달 */}
      {scheduleChangeTarget && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setScheduleChangeTarget(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              maxWidth: '440px', width: '100%', maxHeight: '70vh', overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#0369a1' }}>일정 변경</h3>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '4px' }}>
              <strong>{scheduleChangeTarget.label}</strong>
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              현재: {scheduleChangeTarget.detail}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                변경할 일정 선택:
              </label>
              {availableSlots.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>변경 가능한 일정이 없습니다.</p>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  {availableSlots.map((slot) => {
                    const isFull = slot.current_bookings >= slot.max_capacity;
                    const isSelected = selectedNewSlotId === slot.id;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => !isFull && setSelectedNewSlotId(slot.id)}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: isFull ? 'not-allowed' : 'pointer',
                          background: isSelected ? '#e0f2fe' : isFull ? '#f9fafb' : 'white',
                          opacity: isFull ? 0.5 : 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>
                            {formatDateTime(slot.date, slot.time)}
                          </span>
                          <span style={{ marginLeft: '8px', fontSize: '13px', color: '#64748b' }}>
                            {slot.location || ''}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: isFull ? '#dc2626' : '#64748b' }}>
                          {isFull ? '마감' : `${slot.current_bookings || 0}/${slot.max_capacity}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setScheduleChangeTarget(null)}
                style={{
                  flex: 1, padding: '10px', border: '1px solid #d1d5db',
                  borderRadius: '6px', background: 'white', cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                취소
              </button>
              <button
                onClick={executeScheduleChange}
                disabled={!selectedNewSlotId || changingSchedule}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  borderRadius: '6px',
                  background: !selectedNewSlotId || changingSchedule ? '#d1d5db' : '#0369a1',
                  color: 'white',
                  cursor: !selectedNewSlotId || changingSchedule ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                }}
              >
                {changingSchedule ? '변경 중...' : '일정 변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시험 배정 모달 */}
      {testAssignTarget && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setTestAssignTarget(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              maxWidth: '440px', width: '100%', maxHeight: '70vh', overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#7c3aed' }}>시험 일정 배정</h3>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '4px' }}>
              <strong>{testAssignTarget.studentName}</strong>님에게 시험 일정을 배정합니다.
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              검사 유형: {testAssignTarget.testType || 'MONO'}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                배정할 시험 일정 선택:
              </label>
              {testAssignSlots.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>배정 가능한 시험 일정이 없습니다.</p>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  {testAssignSlots.map((slot) => {
                    const isFull = slot.current_bookings >= slot.max_capacity;
                    const isSelected = selectedTestSlotId === slot.id;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => !isFull && setSelectedTestSlotId(slot.id)}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: isFull ? 'not-allowed' : 'pointer',
                          background: isSelected ? '#ede9fe' : isFull ? '#f9fafb' : 'white',
                          opacity: isFull ? 0.5 : 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>
                            {formatDateTime(slot.date, slot.time)}
                          </span>
                          <span style={{ marginLeft: '8px', fontSize: '13px', color: '#64748b' }}>
                            {slot.location || ''}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: isFull ? '#dc2626' : '#64748b' }}>
                          {isFull ? '마감' : `${slot.current_bookings || 0}/${slot.max_capacity}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setTestAssignTarget(null)}
                style={{
                  flex: 1, padding: '10px', border: '1px solid #d1d5db',
                  borderRadius: '6px', background: 'white', cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                취소
              </button>
              <button
                onClick={executeTestAssign}
                disabled={!selectedTestSlotId || assigningTest}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  borderRadius: '6px',
                  background: !selectedTestSlotId || assigningTest ? '#d1d5db' : '#7c3aed',
                  color: 'white',
                  cursor: !selectedTestSlotId || assigningTest ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                }}
              >
                {assigningTest ? '배정 중...' : '시험 배정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
