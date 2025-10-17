// src/context/ConsultingContext.jsx - 진단검사 기능 추가
import { createContext, useContext, useState } from 'react';
import { supabase } from '../utils/supabase';

const ConsultingContext = createContext();

export function useConsulting() {
  const context = useContext(ConsultingContext);
  if (!context) {
    throw new Error('useConsulting must be used within ConsultingProvider');
  }
  return context;
}

export function ConsultingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // 컨설팅 예약 관련
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  // ⭐ 진단검사 예약 관련 (신규)
  const [testMethod, setTestMethod] = useState(null); // 'onsite' or 'home'
  const [availableTestDates, setAvailableTestDates] = useState([]);
  const [selectedTestDate, setSelectedTestDate] = useState(null);
  const [selectedTestTime, setSelectedTestTime] = useState(null);
  const [testTimeSlots, setTestTimeSlots] = useState([]);

  // 지역 매핑 함수
  const getSimpleLocation = (location) => {
    if (!location) return null;
    const loc = location.toLowerCase();

    if (loc.includes('수내') || loc.includes('분당')) return '분당점';
    if (loc.includes('대치')) return '대치점';
    if (loc.includes('강남')) return '강남점';
    if (loc.includes('서초')) return '서초점';
    if (loc.includes('역삼')) return '역삼점';

    return location;
  };

  // ========================================
  // 컨설팅 예약 관련 함수들 (기존)
  // ========================================

  // 예약 가능한 지역 동적 로드
  const loadAvailableLocations = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: activeSeminars } = await supabase
        .from('seminars')
        .select('location')
        .eq('status', 'active')
        .gte('date', today);

      const mappedActiveLocations =
        activeSeminars
          ?.map((s) => getSimpleLocation(s.location))
          .filter(Boolean) || [];

      const { data: availableSlots } = await supabase
        .from('consulting_slots')
        .select('location, date, time, current_bookings, max_capacity')
        .gte('date', today)
        .eq('is_available', true);

      if (!availableSlots) {
        setAvailableLocations([]);
        return;
      }

      const bookableSlots = availableSlots.filter(
        (slot) => slot.current_bookings < slot.max_capacity
      );

      const locationMap = new Map();

      bookableSlots.forEach((slot) => {
        if (!locationMap.has(slot.location)) {
          locationMap.set(slot.location, {
            location: slot.location,
            nextAvailableDate: slot.date,
            availableDateCount: 0,
          });
        }

        const locInfo = locationMap.get(slot.location);
        if (slot.date < locInfo.nextAvailableDate) {
          locInfo.nextAvailableDate = slot.date;
        }
      });

      bookableSlots.forEach((slot) => {
        const locInfo = locationMap.get(slot.location);
        locInfo.availableDateCount++;
      });

      const locations = Array.from(locationMap.values()).sort(
        (a, b) => new Date(a.nextAvailableDate) - new Date(b.nextAvailableDate)
      );

      setAvailableLocations(locations);
    } catch (error) {
      console.error('지역 로드 실패:', error);
      showToast('지역 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 날짜 로드
  const loadAvailableDates = async (location) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: slots, error } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('location', location)
        .gte('date', today)
        .eq('is_available', true)
        .order('date', { ascending: true });

      if (error) throw error;

      const dateMap = new Map();

      slots.forEach((slot) => {
        const availableSlots = slot.max_capacity - slot.current_bookings;

        if (!dateMap.has(slot.date)) {
          dateMap.set(slot.date, {
            date: slot.date,
            display: formatDateDisplay(slot.date),
            dayOfWeek: getDayOfWeek(slot.date),
            availableSlotCount: 0,
          });
        }

        const dateInfo = dateMap.get(slot.date);
        dateInfo.availableSlotCount += availableSlots;
      });

      const dates = Array.from(dateMap.values()).map((dateInfo) => ({
        ...dateInfo,
        status:
          dateInfo.availableSlotCount === 0
            ? 'full'
            : dateInfo.availableSlotCount < 4
            ? 'warning'
            : 'available',
      }));

      setAvailableDates(dates);
    } catch (error) {
      console.error('날짜 로드 실패:', error);
      showToast('날짜 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 선택한 날짜의 시간 슬롯 로드
  const loadTimeSlots = async (date, location) => {
    try {
      setLoading(true);
      console.log('⏰ 시간 슬롯 로드 시작:', { date, location });

      const { data: slots, error } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('date', date)
        .eq('location', location)
        .eq('is_available', true) // ⭐ 활성화된 슬롯만
        .order('time');

      if (error) throw error;

      console.log('✅ 로드된 슬롯:', slots);

      // ⭐ 모든 슬롯 표시 (마감 여부와 관계없이)
      const slotsWithAvailability = slots.map((slot) => ({
        ...slot,
        isAvailable: slot.current_bookings < slot.max_capacity,
        timeStr: slot.time.slice(0, 5),
      }));

      console.log('📋 전체 슬롯 (마감 포함):', slotsWithAvailability);

      setTimeSlots(slotsWithAvailability); // ⭐ 마감된 슬롯도 포함

      // 예약 가능한 슬롯이 하나도 없을 때만 경고
      const hasAvailable = slotsWithAvailability.some(
        (slot) => slot.isAvailable
      );

      if (!hasAvailable && slotsWithAvailability.length > 0) {
        showToast('해당 날짜의 모든 시간이 마감되었습니다.', 'warning');
      }
    } catch (error) {
      console.error('❌ 시간 슬롯 로드 실패:', error);
      showToast('시간 정보를 불러오는데 실패했습니다.', 'error');
      setTimeSlots([]); // 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  };

  // 컨설팅 예약 생성 (RPC 함수 사용)
  const createConsultingReservation = async (reservationData) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc(
        'create_consulting_reservation',
        {
          p_slot_date: selectedDate,
          p_slot_time: selectedTime + ':00',
          p_slot_location: selectedLocation,
          p_student_name: reservationData.studentName,
          p_parent_phone: reservationData.parentPhone,
          p_school: reservationData.school || 'UNKNOWN',
          p_grade: reservationData.grade || 'UNKNOWN',
          p_is_seminar_attendee: reservationData.isSeminarAttendee || false,
          p_linked_seminar_id: reservationData.linkedSeminarId || null,
          p_privacy_consent: reservationData.privacyConsent || null,
        }
      );

      if (error) throw error;

      const { data: reservation, error: fetchError } = await supabase
        .from('consulting_reservations')
        .select('*, consulting_slots(*)')
        .eq('id', data.reservation_id)
        .single();

      if (fetchError) throw fetchError;

      showToast('예약이 완료되었습니다!', 'success');
      return reservation;
    } catch (error) {
      console.error('예약 생성 실패:', error);

      const errorMessage =
        error.message === '이미 예약이 마감되었습니다'
          ? '해당 시간은 방금 다른 분이 예약하셨습니다. 다른 시간을 선택해주세요.'
          : '예약 처리 중 오류가 발생했습니다.';

      showToast(errorMessage, 'error', 5000);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // ⭐ 진단검사 예약 관련 함수들 (신규)
  // ========================================

  // 지점별 진단검사 방식 확인
  const loadTestMethod = async (location) => {
    try {
      const { data, error } = await supabase
        .from('test_methods')
        .select('method')
        .eq('location', location)
        .single();

      if (error) throw error;

      setTestMethod(data?.method || 'home'); // 기본값: 가정 셀프테스트
      return data?.method || 'home';
    } catch (error) {
      console.error('진단검사 방식 확인 실패:', error);
      setTestMethod('home'); // 오류 시 기본값
      return 'home';
    }
  };

  // 진단검사 가능 날짜 로드 (컨설팅 날짜 전까지만)
  const loadAvailableTestDates = async (location, consultingDate) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: slots, error } = await supabase
        .from('test_slots')
        .select('*')
        .eq('location', location)
        .gte('date', today)
        .lt('date', consultingDate) // 컨설팅 날짜 전까지만
        .eq('status', 'active')
        .order('date', { ascending: true });

      if (error) throw error;

      const dateMap = new Map();

      slots.forEach((slot) => {
        const availableSlots = slot.max_capacity - slot.current_bookings;

        if (!dateMap.has(slot.date)) {
          dateMap.set(slot.date, {
            date: slot.date,
            display: formatDateDisplay(slot.date),
            dayOfWeek: getDayOfWeek(slot.date),
            availableSlotCount: 0,
          });
        }

        const dateInfo = dateMap.get(slot.date);
        dateInfo.availableSlotCount += availableSlots;
      });

      const dates = Array.from(dateMap.values()).map((dateInfo) => ({
        ...dateInfo,
        status:
          dateInfo.availableSlotCount === 0
            ? 'full'
            : dateInfo.availableSlotCount < 4
            ? 'warning'
            : 'available',
      }));

      setAvailableTestDates(dates);
    } catch (error) {
      console.error('진단검사 날짜 로드 실패:', error);
      showToast('날짜 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 진단검사 시간 슬롯 로드
  const loadTestTimeSlots = async (date, location) => {
    try {
      setLoading(true);

      const { data: slots, error } = await supabase
        .from('test_slots')
        .select('*')
        .eq('date', date)
        .eq('location', location)
        .eq('status', 'active')
        .order('time', { ascending: true });

      if (error) throw error;

      const formattedSlots = slots.map((slot) => ({
        ...slot,
        timeDisplay: slot.time.slice(0, 5),
        availableSeats: slot.max_capacity - slot.current_bookings,
        isFull: slot.current_bookings >= slot.max_capacity,
      }));

      setTestTimeSlots(formattedSlots);
    } catch (error) {
      console.error('진단검사 시간 로드 실패:', error);
      showToast('시간 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 진단검사 예약 생성 (RPC 함수 사용)
  const createTestReservation = async (testData) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('create_test_reservation', {
        p_slot_id: testData.slotId,
        p_consulting_reservation_id: testData.consultingReservationId,
        p_parent_phone: testData.parentPhone,
        p_student_name: testData.studentName,
        p_location: testData.location,
        p_test_date: selectedTestDate,
        p_test_time: selectedTestTime + ':00',
      });

      if (error) throw error;

      // 생성된 예약 정보 조회
      const { data: reservation, error: fetchError } = await supabase
        .from('test_reservations')
        .select('*, test_slots(*)')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      showToast('진단검사 예약이 완료되었습니다!', 'success');
      return reservation;
    } catch (error) {
      console.error('진단검사 예약 실패:', error);

      const errorMessage =
        error.message === 'Slot is full'
          ? '해당 시간은 방금 다른 분이 예약하셨습니다. 다른 시간을 선택해주세요.'
          : '예약 처리 중 오류가 발생했습니다.';

      showToast(errorMessage, 'error', 5000);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 유틸리티 함수들
  // ========================================

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  const value = {
    loading,
    setLoading,
    toast,
    showToast,
    hideToast,

    // 컨설팅 예약 관련
    availableLocations,
    loadAvailableLocations,
    selectedLocation,
    setSelectedLocation,
    availableDates,
    loadAvailableDates,
    selectedDate,
    setSelectedDate,
    timeSlots,
    loadTimeSlots,
    selectedTime,
    setSelectedTime,
    createConsultingReservation,

    // ⭐ 진단검사 예약 관련 (신규)
    testMethod,
    loadTestMethod,
    availableTestDates,
    loadAvailableTestDates,
    selectedTestDate,
    setSelectedTestDate,
    testTimeSlots,
    loadTestTimeSlots,
    selectedTestTime,
    setSelectedTestTime,
    createTestReservation,
    refreshTestTimeSlots: loadTestTimeSlots, // ⭐ 추가
  };

  return (
    <ConsultingContext.Provider value={value}>
      {children}
    </ConsultingContext.Provider>
  );
}
