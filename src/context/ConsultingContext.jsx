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
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  // 예약 가능한 날짜 로드 (화요일, 목요일만)
  const loadAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const maxDays = 60; // 앞으로 60일

    for (let i = 1; i <= maxDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayOfWeek = date.getDay();
      // 화요일(2) 또는 목요일(4)만 추가
      if (dayOfWeek === 2 || dayOfWeek === 4) {
        dates.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD
          dayOfWeek: dayOfWeek === 2 ? '화' : '목',
          display: `${date.getMonth() + 1}/${date.getDate()}`,
        });
      }

      // 최대 6개 날짜만
      if (dates.length >= 6) break;
    }

    setAvailableDates(dates);
  };

  // 선택한 날짜의 시간 슬롯 로드
  const loadTimeSlots = async (date) => {
    try {
      setLoading(true);

      // 해당 날짜의 슬롯 조회
      const { data: slots, error: slotsError } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('date', date)
        .order('time');

      if (slotsError) throw slotsError;

      // 예약 정보 조회
      let slotsWithBookings = [];

      if (slots && slots.length > 0) {
        const slotIds = slots.map((s) => s.id);

        const { data: reservations } = await supabase
          .from('consulting_reservations')
          .select('slot_id')
          .in('slot_id', slotIds)
          .in('status', ['confirmed', 'pending']);

        slotsWithBookings = slots.map((slot) => {
          const bookingCount =
            reservations?.filter((r) => r.slot_id === slot.id).length || 0;

          return {
            ...slot,
            isAvailable: bookingCount < slot.max_capacity,
            bookingCount,
          };
        });
      } else {
        // 슬롯이 없으면 기본 시간대 생성 (10:30 ~ 14:00, 30분 단위)
        const defaultTimes = [
          '10:30',
          '11:00',
          '11:30',
          '12:00',
          '12:30',
          '13:00',
          '13:30',
          '14:00',
        ];

        slotsWithBookings = defaultTimes.map((time) => ({
          time: time + ':00',
          date,
          isAvailable: true,
          bookingCount: 0,
          isNew: true, // 새로 생성될 슬롯
        }));
      }

      setTimeSlots(slotsWithBookings);
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

      // 슬롯 ID 찾기 또는 생성
      let slotId = reservationData.slotId;

      if (!slotId) {
        // 슬롯이 없으면 새로 생성
        const { data: newSlot, error: slotError } = await supabase
          .from('consulting_slots')
          .insert([
            {
              date: selectedDate,
              time: selectedTime + ':00',
              day_of_week: availableDates.find((d) => d.date === selectedDate)
                ?.dayOfWeek,
              max_capacity: 1,
              current_bookings: 0,
              is_available: true,
            },
          ])
          .select()
          .single();

        if (slotError) throw slotError;
        slotId = newSlot.id;
      }

      // 예약 생성
      const { data, error } = await supabase
        .from('consulting_reservations')
        .insert([
          {
            slot_id: slotId,
            student_name: reservationData.studentName,
            parent_phone: reservationData.parentPhone,
            school: reservationData.school || 'UNKNOWN',
            grade: reservationData.grade || 'UNKNOWN',
            test_type: 'UNKNOWN',
            test_completed: false,
            status: 'confirmed',
            notes: `${selectedDate} ${selectedTime} 컨설팅 예약`,
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
