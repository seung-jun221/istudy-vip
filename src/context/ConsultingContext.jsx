// src/context/ConsultingContext.jsx
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
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

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

      // ✅ 예약 가능한 슬롯만 필터링 (전체 마감 지역 제외용)
      const bookableSlots = availableSlots.filter(
        (slot) => slot.current_bookings < slot.max_capacity
      );

      const locationMap = {};
      bookableSlots.forEach((slot) => {
        if (!locationMap[slot.location]) {
          locationMap[slot.location] = {
            dates: new Set(),
            slots: [],
          };
        }
        locationMap[slot.location].dates.add(slot.date);
        locationMap[slot.location].slots.push(slot);
      });

      const locationDetails = Object.keys(locationMap)
        .filter((loc) => mappedActiveLocations.includes(loc))
        .map((location) => {
          const dates = Array.from(locationMap[location].dates).sort();
          return {
            location,
            availableDateCount: dates.length,
            nextAvailableDate: dates[0],
            allDates: dates,
          };
        })
        .sort((a, b) => a.location.localeCompare(b.location));

      setAvailableLocations(locationDetails);
    } catch (error) {
      console.error('지역 로드 실패:', error);
      showToast('지역 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ⭐ 선택한 지역의 모든 날짜 로드 (마감 포함!)
  const loadAvailableDates = async (location) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // ✅ 모든 슬롯 가져오기 (마감 여부 상관없이)
      const { data: slots } = await supabase
        .from('consulting_slots')
        .select('date, time, current_bookings, max_capacity')
        .eq('location', location)
        .gte('date', today)
        .eq('is_available', true);

      if (!slots || slots.length === 0) {
        setAvailableDates([]);
        return;
      }

      // 날짜별로 그룹핑
      const dateMap = {};
      slots.forEach((slot) => {
        if (!dateMap[slot.date]) {
          dateMap[slot.date] = {
            totalSlots: 0,
            bookedSlots: 0,
            availableSlots: 0,
          };
        }
        dateMap[slot.date].totalSlots += slot.max_capacity;
        dateMap[slot.date].bookedSlots += slot.current_bookings;

        // 예약 가능한 슬롯 수 계산
        if (slot.current_bookings < slot.max_capacity) {
          dateMap[slot.date].availableSlots +=
            slot.max_capacity - slot.current_bookings;
        }
      });

      // ✅ 모든 날짜를 배열로 변환 (마감된 날짜도 포함!)
      const dates = Object.keys(dateMap)
        .sort()
        .slice(0, 6)
        .map((date) => {
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay();
          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

          const remainingSlots = dateMap[date].availableSlots;

          // ⭐ 상태 결정
          let status = 'available'; // 기본: 예약 가능
          if (remainingSlots === 0) {
            status = 'full'; // 예약 마감
          } else if (remainingSlots < 4) {
            status = 'warning'; // 마감 임박 (4석 미만)
          }

          return {
            date,
            dayOfWeek: dayNames[dayOfWeek],
            display: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
            availableSlotCount: remainingSlots,
            totalSlots: dateMap[date].totalSlots,
            status: status, // 'available', 'warning', 'full'
          };
        });

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

      const { data: slots, error } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('date', date)
        .eq('location', location)
        .order('time');

      if (error) throw error;

      const slotsWithAvailability = slots.map((slot) => ({
        ...slot,
        isAvailable: slot.current_bookings < slot.max_capacity,
        timeStr: slot.time.slice(0, 5),
      }));

      setTimeSlots(slotsWithAvailability);
    } catch (error) {
      console.error('시간 슬롯 로드 실패:', error);
      showToast('시간 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ⭐ 컨설팅 예약 생성 (RPC 함수 사용)
  const createConsultingReservation = async (reservationData) => {
    try {
      setLoading(true);

      // RPC 함수 호출
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

      // 예약 정보와 슬롯 정보 조회
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
  };

  return (
    <ConsultingContext.Provider value={value}>
      {children}
    </ConsultingContext.Provider>
  );
}
