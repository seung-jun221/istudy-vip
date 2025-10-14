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

  // 🆕 예약 가능한 지역 동적 로드
  const loadAvailableLocations = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. 활성 설명회 지역 조회
      const { data: activeSeminars } = await supabase
        .from('seminars')
        .select('location')
        .eq('status', 'active')
        .gte('date', today);

      const activeLocations = activeSeminars?.map((s) => s.location) || [];

      // 2. 남은 컨설팅 슬롯 조회
      const { data: availableSlots } = await supabase
        .from('consulting_slots')
        .select('location, date, time, current_bookings, max_capacity')
        .gte('date', today)
        .eq('is_available', true);

      if (!availableSlots) {
        setAvailableLocations([]);
        return;
      }

      // 3. 예약 가능한 슬롯만 필터링
      const bookableSlots = availableSlots.filter(
        (slot) => slot.current_bookings < slot.max_capacity
      );

      // 4. 지역별로 그룹화
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

      // 5. 활성 설명회 지역과 교집합
      const locationDetails = Object.keys(locationMap)
        .filter((loc) => activeLocations.includes(loc))
        .map((location) => {
          const dates = Array.from(locationMap[location].dates).sort();
          return {
            location,
            availableDateCount: dates.length,
            nextAvailableDate: dates[0],
            allDates: dates,
          };
        })
        .sort((a, b) => a.location.localeCompare(b.location)); // 가나다순

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

      // 예약 가능한 슬롯만
      const bookableSlots = slots.filter(
        (slot) => slot.current_bookings < slot.max_capacity
      );

      // 날짜별로 그룹화
      const dateMap = {};
      bookableSlots.forEach((slot) => {
        if (!dateMap[slot.date]) {
          dateMap[slot.date] = [];
        }
        dateMap[slot.date].push(slot);
      });

      // 날짜 정보 생성
      const dates = Object.keys(dateMap)
        .sort()
        .slice(0, 6) // 최대 6개
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

  // 컨설팅 예약 생성
  const createConsultingReservation = async (reservationData) => {
    try {
      setLoading(true);

      // 슬롯 찾기
      const { data: slot } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('date', selectedDate)
        .eq('time', selectedTime + ':00')
        .eq('location', selectedLocation)
        .single();

      if (!slot) throw new Error('슬롯을 찾을 수 없습니다.');

      // 예약 생성
      const { data, error } = await supabase
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

      if (error) throw error;

      showToast('예약이 완료되었습니다!', 'success');
      return data;
    } catch (error) {
      console.error('예약 생성 실패:', error);
      showToast('예약 처리 중 오류가 발생했습니다.', 'error');
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
    selectedTime,
    setSelectedTime,
    timeSlots,
    loadTimeSlots,
    createConsultingReservation,
  };

  return (
    <ConsultingContext.Provider value={value}>
      {children}
    </ConsultingContext.Provider>
  );
}
