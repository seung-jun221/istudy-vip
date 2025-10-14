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

  // 선택한 지역의 예약 가능한 날짜 로드
  const loadAvailableDates = async (location) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: slots } = await supabase
        .from('consulting_slots')
        .select('date, time, current_bookings, max_capacity')
        .eq('location', location)
        .gte('date', today)
        .eq('is_available', true);

      if (!slots) {
        setAvailableDates([]);
        return;
      }

      const bookableSlots = slots.filter(
        (slot) => slot.current_bookings < slot.max_capacity
      );

      const dateMap = {};
      bookableSlots.forEach((slot) => {
        if (!dateMap[slot.date]) {
          dateMap[slot.date] = [];
        }
        dateMap[slot.date].push(slot);
      });

      const dates = Object.keys(dateMap)
        .sort()
        .slice(0, 6)
        .map((date) => {
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay();
          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

          return {
            date,
            dayOfWeek: dayNames[dayOfWeek],
            display: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
            availableSlotCount: dateMap[date].length,
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

  // ⭐ 컨설팅 예약 생성 (수정됨 - current_bookings 증가 로직 추가)
  const createConsultingReservation = async (reservationData) => {
    try {
      setLoading(true);

      // 1. 슬롯 조회
      const { data: slot, error: slotError } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('date', selectedDate)
        .eq('time', selectedTime + ':00')
        .eq('location', selectedLocation)
        .single();

      if (slotError || !slot) {
        throw new Error('슬롯을 찾을 수 없습니다.');
      }

      // ⚠️ 중요: 예약 가능 여부 재확인 (동시 예약 방지)
      if (slot.current_bookings >= slot.max_capacity) {
        showToast(
          '해당 시간은 이미 예약이 마감되었습니다. 다른 시간을 선택해주세요.',
          'error',
          5000
        );
        // 시간 슬롯 새로고침
        await loadTimeSlots(selectedDate, selectedLocation);
        throw new Error('이미 마감된 슬롯입니다.');
      }

      // 2. 예약 생성
      const { data: reservation, error: insertError } = await supabase
        .from('consulting_reservations')
        .insert([
          {
            slot_id: slot.id,
            student_name: reservationData.studentName,
            parent_phone: reservationData.parentPhone,
            school: reservationData.school || 'UNKNOWN',
            grade: reservationData.grade || 'UNKNOWN',
            test_type: 'UNKNOWN',
            test_completed: false,
            status: 'confirmed',
            is_seminar_attendee: reservationData.isSeminarAttendee || false,
            linked_seminar_id: reservationData.linkedSeminarId || null,
            privacy_consent: reservationData.privacyConsent || null,
            notes: `${selectedDate} ${selectedTime} ${selectedLocation} 컨설팅 예약`,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // ✅ 3. 슬롯의 current_bookings 증가 (핵심!)
      const { error: updateError } = await supabase
        .from('consulting_slots')
        .update({
          current_bookings: slot.current_bookings + 1,
        })
        .eq('id', slot.id);

      if (updateError) {
        console.error('슬롯 업데이트 실패:', updateError);
        // 예약은 생성되었지만 카운트 업데이트 실패
        // 이 경우도 예약은 성공으로 처리하되, 로그만 남김
      }

      showToast('예약이 완료되었습니다!', 'success');
      return reservation;
    } catch (error) {
      console.error('예약 생성 실패:', error);

      // 사용자에게 보여줄 에러 메시지
      const errorMessage =
        error.message === '이미 마감된 슬롯입니다.'
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
