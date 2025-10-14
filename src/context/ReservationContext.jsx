import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const ReservationContext = createContext();

export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation must be used within ReservationProvider');
  }
  return context;
}

export function ReservationProvider({ children }) {
  const [seminars, setSeminars] = useState([]);
  const [selectedSeminar, setSelectedSeminar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadSeminars();
  }, []);

  const loadSeminars = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('seminars')
        .select('*')
        .gte('date', today)
        .eq('status', 'active')
        .order('date', { ascending: true });

      if (error) throw error;

      const seminarsWithAvailability = await Promise.all(
        data.map(async (seminar) => {
          const { count } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('seminar_id', seminar.id)
            .in('status', ['예약', '참석']);

          const reserved = count || 0;
          const available = seminar.max_capacity - reserved;

          return {
            ...seminar,
            reserved,
            available,
            isFull: available <= 0,
          };
        })
      );

      setSeminars(seminarsWithAvailability);
    } catch (error) {
      console.error('설명회 로드 실패:', error);
      showToast('설명회 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  // duration 파라미터 추가
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  const value = {
    seminars,
    selectedSeminar,
    setSelectedSeminar,
    loading,
    setLoading,
    toast,
    showToast,
    hideToast,
    loadSeminars,
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}
