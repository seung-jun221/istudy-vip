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

// 우선예약 상태 계산 함수
function getPriorityReservationStatus(slot) {
  // 우선예약 설정이 없으면 일반 상태
  if (!slot.priority_open_at && !slot.public_open_at) {
    return { type: 'normal', canReserve: true, isPriorityPeriod: false };
  }

  const now = new Date();
  const priorityOpenAt = slot.priority_open_at ? new Date(slot.priority_open_at) : null;
  const publicOpenAt = slot.public_open_at ? new Date(slot.public_open_at) : null;

  // 우선예약 오픈 전
  if (priorityOpenAt && now < priorityOpenAt) {
    return {
      type: 'not_opened',
      canReserve: false,
      isPriorityPeriod: false,
      openAt: priorityOpenAt,
      message: `${priorityOpenAt.toLocaleDateString('ko-KR')} ${priorityOpenAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 오픈 예정`,
    };
  }

  // 우선예약 기간 (기존 참석자만)
  if (publicOpenAt && now < publicOpenAt) {
    return {
      type: 'priority_only',
      canReserve: true,
      isPriorityPeriod: true,
      publicOpenAt: publicOpenAt,
      message: `기존 참석자 우선예약 중 (${publicOpenAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}부터 일반 오픈)`,
    };
  }

  // 일반 오픈
  return { type: 'public', canReserve: true, isPriorityPeriod: false };
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
            status = 'warning';   // 마감 임박 (노출정원 기준)
          }

          // 우선예약 상태 계산
          const priorityStatus = getPriorityReservationStatus(slot);

          return {
            ...slot,
            reserved,
            available: displayAvailable,      // 노출용 잔여석
            actualAvailable,                  // 실제 잔여석
            isFull: actualAvailable <= 0,     // 실제정원 기준 마감
            isWaitlist: actualAvailable <= 0, // 대기자 예약 상태
            isClosed: slot.isClosed,          // 관리자 마감 처리
            status,                           // 'available' | 'warning' | 'waitlist' | 'closed'
            // 우선예약 관련 정보
            priorityStatus,                   // 우선예약 상태 객체
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

  // 기존 참석자 여부 확인 (우선예약 기간에 사용)
  // ⭐ 모든 캠페인의 설명회 참석 여부를 확인 (현재 캠페인 제외)
  const checkExistingAttendee = async (phone, currentCampaignId) => {
    try {
      // 다른 캠페인에서 참석한 기록이 있는지 확인
      const { data, error } = await supabase
        .from('reservations')
        .select('id, status, student_name, campaign_id')
        .eq('parent_phone', phone)
        .eq('status', '참석')
        .neq('campaign_id', currentCampaignId)  // 현재 캠페인은 제외
        .limit(1);

      if (error) throw error;

      return {
        isAttendee: data && data.length > 0,
        reservation: data?.[0] || null,
      };
    } catch (error) {
      console.error('기존 참석자 확인 실패:', error);
      return { isAttendee: false, reservation: null };
    }
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
    checkExistingAttendee,  // 기존 참석자 확인 함수
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}
