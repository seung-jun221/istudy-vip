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

      // campaigns와 seminar_slots join해서 조회
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          seminar_slots (*)
        `)
        .eq('status', 'active');

      if (error) throw error;

      // seminar_slots를 평탄화 (각 슬롯을 개별 설명회처럼 표시)
      const allSlots = [];
      campaignsData?.forEach(campaign => {
        campaign.seminar_slots?.forEach(slot => {
          // 미래 날짜만 포함
          if (slot.date >= today && slot.status === 'active') {
            allSlots.push({
              ...slot,
              // 캠페인 정보 추가
              campaign_id: campaign.id,
              campaign_title: campaign.title,
              campaign_location: campaign.location,
              campaign_season: campaign.season,
            });
          }
        });
      });

      // 날짜순 정렬
      allSlots.sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });

      const seminarsWithAvailability = await Promise.all(
        allSlots.map(async (slot) => {
          const { count } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('seminar_slot_id', slot.id)
            .in('status', ['예약', '참석']);

          const reserved = count || 0;
          const available = slot.max_capacity - reserved;

          return {
            ...slot,
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
