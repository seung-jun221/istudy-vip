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
          // 미래 날짜만 포함 (active와 closed 모두 표시)
          if (slot.date >= today && (slot.status === 'active' || slot.status === 'closed')) {
            allSlots.push({
              ...slot,
              // ⭐ 슬롯 title 사용 (없으면 자동 생성)
              title: slot.title || `${campaign.location} ${slot.session_number || 1}차 설명회`,
              // 캠페인 정보 추가
              campaign_id: campaign.id,
              campaign_title: campaign.title,
              campaign_location: campaign.location,
              campaign_season: campaign.season,
              // 관리자가 마감 처리한 경우
              isClosed: slot.status === 'closed',
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
          const displayCapacity = slot.display_capacity || slot.max_capacity;
          const maxCapacity = slot.max_capacity;

          // 노출정원 기준 잔여석 (음수가 되면 0으로)
          const displayAvailable = Math.max(0, displayCapacity - reserved);
          // 실제정원 기준 잔여석
          const actualAvailable = maxCapacity - reserved;

          // 상태 결정: 마감 → closed, 실제정원 초과 → 대기자, 노출정원 기준 6석 이하 → 마감임박, 그 외 → 예약가능
          let status = 'available';
          if (slot.isClosed) {
            status = 'closed';    // 관리자가 마감 처리
          } else if (actualAvailable <= 0) {
            status = 'waitlist';  // 대기자 예약
          } else if (displayAvailable <= 6) {
            status = 'warning';   // 마감 임박
          }

          return {
            ...slot,
            reserved,
            available: displayAvailable,      // 노출용 잔여석
            actualAvailable,                  // 실제 잔여석
            isFull: actualAvailable <= 0,     // 실제정원 기준 마감
            isWaitlist: actualAvailable <= 0, // 대기자 예약 상태
            isClosed: slot.isClosed,          // 관리자 마감 처리
            status,                           // 'available' | 'warning' | 'waitlist' | 'closed'
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
