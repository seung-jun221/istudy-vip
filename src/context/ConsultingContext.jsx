// src/context/ConsultingContext.jsx - 진단검사 기능 추가
import { createContext, useContext, useState } from 'react';
import { supabase, hashPassword } from '../utils/supabase';
import { formatPhone, formatDateShort, getDayOfWeekKR } from '../utils/format';

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
  const [selectedSeminarId, setSelectedSeminarId] = useState(null); // 설명회 예약자용
  const [selectedSlotId, setSelectedSlotId] = useState(null); // 선택한 슬롯 ID
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  // 컨설팅 유형 관련 (대표이사/원장)
  const [consultantType, setConsultantType] = useState('ceo'); // 'ceo' | 'director'
  const [isCeoSlotsFull, setIsCeoSlotsFull] = useState(false); // 대표 컨설팅 마감 여부
  const [isEligibleForCeo, setIsEligibleForCeo] = useState(false); // ⭐ 대표 컨설팅 자격 여부

  // ⭐ 진단검사 예약 관련 (신규)
  const [testMethod, setTestMethod] = useState(null); // 'onsite' or 'home'
  const [availableTestDates, setAvailableTestDates] = useState([]);
  const [selectedTestDate, setSelectedTestDate] = useState(null);
  const [selectedTestTime, setSelectedTestTime] = useState(null);
  const [testTimeSlots, setTestTimeSlots] = useState([]);

  // 자동 슬롯 오픈 체크 (비동기, 에러 발생해도 예약은 성공)
  const checkAndOpenNextSlots = async (campaignId) => {
    try {
      console.log('🔍 자동 슬롯 오픈 체크 시작...', campaignId);

      // localStorage에서 auto_open_threshold 가져오기
      const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
      const threshold = settings[campaignId]?.auto_open_threshold;

      if (!threshold || threshold <= 0) {
        console.log('⏭️ 자동 슬롯 오픈 설정이 없습니다.');
        return;
      }

      console.log('📊 임계값:', threshold);

      // 1. 해당 캠페인의 모든 컨설팅 슬롯 조회
      const { data: allSlots, error: slotsError } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('linked_seminar_id', campaignId) // ⭐ 원본 그대로 사용 (_campaign 포함)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (slotsError) throw slotsError;
      if (!allSlots || allSlots.length === 0) {
        console.log('⏭️ 슬롯이 없습니다.');
        return;
      }

      // 2. 현재 오픈된 슬롯만 필터링
      const availableSlots = allSlots.filter((slot) => slot.is_available);

      // 3. 예약된 슬롯 조회
      const { data: reservations, error: reservationsError } = await supabase
        .from('consulting_reservations')
        .select('slot_id')
        .eq('linked_seminar_id', campaignId) // ⭐ 원본 그대로 사용 (_campaign 포함)
        .not('status', 'in', '(cancelled,auto_cancelled,취소)');

      if (reservationsError) throw reservationsError;

      // 4. 남은 슬롯 수 계산
      const reservedSlotIds = new Set(reservations?.map((r) => r.slot_id) || []);
      const remainingSlots = availableSlots.filter((slot) => !reservedSlotIds.has(slot.id));
      const remainingCount = remainingSlots.length;

      console.log(`📈 전체 슬롯: ${allSlots.length}개`);
      console.log(`📈 오픈된 슬롯: ${availableSlots.length}개`);
      console.log(`📈 예약된 슬롯: ${reservedSlotIds.size}개`);
      console.log(`📈 남은 슬롯: ${remainingCount}개`);

      // 5. 임계값 체크
      if (remainingCount > threshold) {
        console.log('✅ 남은 슬롯이 충분합니다.');
        return;
      }

      console.log('🚨 임계값 이하! 다음 날짜 슬롯 오픈 필요');

      // 6. 현재 오픈된 슬롯의 마지막 날짜 찾기
      const openedDates = [...new Set(availableSlots.map((slot) => slot.date))].sort();
      const lastOpenedDate = openedDates[openedDates.length - 1];

      console.log('📅 마지막 오픈 날짜:', lastOpenedDate);

      // 7. 다음 날짜의 슬롯 찾기
      const closedSlots = allSlots.filter((slot) => !slot.is_available);
      const closedDates = [...new Set(closedSlots.map((slot) => slot.date))].sort();
      const nextDate = closedDates.find((date) => date > lastOpenedDate);

      if (!nextDate) {
        console.log('⚠️ 오픈할 다음 날짜가 없습니다.');
        return;
      }

      console.log('🎯 다음 오픈 날짜:', nextDate);

      // 8. 해당 날짜의 슬롯을 모두 오픈
      const slotsToOpen = closedSlots.filter((slot) => slot.date === nextDate);
      const slotIdsToOpen = slotsToOpen.map((slot) => slot.id);

      console.log(`🔓 ${slotIdsToOpen.length}개 슬롯 오픈 중...`);

      const { error: updateError } = await supabase
        .from('consulting_slots')
        .update({ is_available: true })
        .in('id', slotIdsToOpen);

      if (updateError) throw updateError;

      console.log(`✅ ${nextDate} 날짜의 ${slotIdsToOpen.length}개 슬롯이 자동 오픈되었습니다!`);
    } catch (error) {
      console.error('❌ 자동 슬롯 오픈 체크 실패:', error);
      // 실패해도 예약은 계속 진행되도록 에러를 던지지 않음
    }
  };

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

      // ⭐ campaigns와 seminar_slots에서 active 캠페인의 location 조회
      const { data: activeCampaigns } = await supabase
        .from('campaigns')
        .select(`
          location,
          seminar_slots!inner (date)
        `)
        .eq('status', 'active')
        .gte('seminar_slots.date', today);

      // ⭐ consulting_slots의 location과 정확히 매칭하기 위해 원본 location 사용
      const mappedActiveLocations =
        activeCampaigns
          ?.map((c) => c.location)
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

      // ⭐ 'active' 상태의 설명회 지역에 속하고, 예약 가능한 슬롯만 필터링
      const bookableSlots = availableSlots.filter(
        (slot) =>
          slot.current_bookings < slot.max_capacity &&
          mappedActiveLocations.includes(slot.location)
      );

      const locationMap = new Map();

      bookableSlots.forEach((slot) => {
        if (!locationMap.has(slot.location)) {
          locationMap.set(slot.location, {
            location: slot.location,
            nextAvailableDate: slot.date,
            availableDates: new Set(), // 고유한 날짜를 Set으로 수집
          });
        }

        const locInfo = locationMap.get(slot.location);
        if (slot.date < locInfo.nextAvailableDate) {
          locInfo.nextAvailableDate = slot.date;
        }
        // 날짜를 Set에 추가 (자동으로 중복 제거)
        locInfo.availableDates.add(slot.date);
      });

      // Set 크기를 날짜 개수로 변환
      const locations = Array.from(locationMap.values())
        .map((loc) => ({
          location: loc.location,
          nextAvailableDate: loc.nextAvailableDate,
          availableDateCount: loc.availableDates.size, // Set 크기 = 고유한 날짜 개수
        }))
        .sort((a, b) => new Date(a.nextAvailableDate) - new Date(b.nextAvailableDate));

      setAvailableLocations(locations);
    } catch (error) {
      console.error('지역 로드 실패:', error);
      showToast('지역 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 날짜 로드 (컨설팅 유형별 분리)
  // ⭐ eligibleForCeo: 대표 컨설팅 자격 여부 (설명회 참석 + 시간 경과)
  // ⭐ 캠페인별 분리: 같은 지점이라도 캠페인이 다르면 별도 슬롯 사용
  const loadAvailableDates = async (locationOrSeminarId, useSeminarId = false, eligibleForCeo = false) => {
    try {
      setLoading(true);
      setIsEligibleForCeo(eligibleForCeo); // ⭐ 자격 상태 저장
      const today = new Date().toISOString().split('T')[0];

      console.log('📅 날짜 로드 시작:', { locationOrSeminarId, useSeminarId, eligibleForCeo });

      // ⭐ seminarId가 전달된 경우, 해당 캠페인의 location 조회
      let targetLocation = locationOrSeminarId;
      let targetCampaignId = null; // ⭐ 캠페인 ID 추가

      if (useSeminarId) {
        targetCampaignId = locationOrSeminarId; // ⭐ 캠페인 ID 저장
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('location')
          .eq('id', locationOrSeminarId)
          .single();

        if (campaign?.location) {
          targetLocation = campaign.location;
          console.log('📍 캠페인 location 조회:', targetLocation, '캠페인 ID:', targetCampaignId);
        }
      }

      let slotsToUse = [];
      let isCeoFull = false;

      // ⭐ 대표 컨설팅 자격이 있는 경우에만 대표 슬롯 확인
      if (eligibleForCeo) {
        // 1. 대표이사 슬롯 확인 - ⭐ 캠페인 ID로 필터링 (캠페인별 분리)
        let query = supabase
          .from('consulting_slots')
          .select('*')
          .gte('date', today)
          .eq('is_available', true)
          .eq('consultant_type', 'ceo');

        // ⭐ 캠페인 ID가 있으면 캠페인별 필터링, 없으면 location 기반
        if (targetCampaignId) {
          query = query.eq('linked_seminar_id', targetCampaignId);
        } else {
          query = query.eq('location', targetLocation);
        }

        const { data: ceoSlots, error: ceoError } = await query.order('date', { ascending: true });

        if (ceoError) throw ceoError;

        // 대표 슬롯 중 예약 가능한 슬롯이 있는지 확인
        const availableCeoSlots = ceoSlots?.filter(
          (slot) => slot.max_capacity - slot.current_bookings > 0
        ) || [];

        if (availableCeoSlots.length > 0) {
          slotsToUse = ceoSlots;
          setConsultantType('ceo');
          console.log('✅ 대표 컨설팅 슬롯 사용');
        } else {
          isCeoFull = true;
          console.log('🔄 대표이사 컨설팅 마감, 원장 컨설팅으로 전환');
        }
      } else {
        console.log('⚠️ 대표 컨설팅 자격 없음 - 원장 컨설팅으로 진행');
        isCeoFull = true; // 자격이 없으면 대표 컨설팅 비활성화
      }

      // 2. 대표 슬롯 사용 불가 시 원장 슬롯 로드 - ⭐ 캠페인 ID로 필터링
      if (isCeoFull || slotsToUse.length === 0) {
        console.log('🔄 원장 컨설팅 슬롯 로드');

        let query = supabase
          .from('consulting_slots')
          .select('*')
          .gte('date', today)
          .eq('is_available', true)
          .eq('consultant_type', 'director');

        // ⭐ 캠페인 ID가 있으면 캠페인별 필터링, 없으면 location 기반
        if (targetCampaignId) {
          query = query.eq('linked_seminar_id', targetCampaignId);
        } else {
          query = query.eq('location', targetLocation);
        }

        const { data: directorSlots, error: directorError } = await query.order('date', { ascending: true });

        if (directorError) throw directorError;

        slotsToUse = directorSlots || [];
        isCeoFull = true;
        setConsultantType('director');
      } else {
        setConsultantType('ceo');
      }

      setIsCeoSlotsFull(isCeoFull);

      const dateMap = new Map();

      slotsToUse.forEach((slot) => {
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

  // 선택한 날짜의 시간 슬롯 로드 (컨설팅 유형별)
  // ⭐ 캠페인별 분리: 같은 지점이라도 캠페인이 다르면 별도 슬롯 사용
  const loadTimeSlots = async (date, location) => {
    try {
      setLoading(true);
      console.log('⏰ 시간 슬롯 로드 시작:', { date, location, selectedSeminarId, consultantType });

      // ⭐ 캠페인 ID가 있으면 캠페인별 필터링, 없으면 location 기반
      let query = supabase
        .from('consulting_slots')
        .select('*')
        .eq('date', date)
        .eq('is_available', true)
        .eq('consultant_type', consultantType);

      if (selectedSeminarId) {
        query = query.eq('linked_seminar_id', selectedSeminarId);
        console.log('📌 캠페인 ID로 필터링:', selectedSeminarId);
      } else {
        query = query.eq('location', location);
        console.log('📌 location으로 필터링:', location);
      }

      const { data: slots, error } = await query.order('time');

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

      // 선택한 슬롯 찾기 (실제 location 정보 필요)
      const selectedSlot = timeSlots.find(
        (slot) => slot.time.slice(0, 5) === selectedTime
      );

      if (!selectedSlot) {
        throw new Error('선택한 슬롯을 찾을 수 없습니다.');
      }

      console.log('📝 예약 생성 파라미터:', {
        date: selectedDate,
        time: selectedTime,
        location: selectedSlot.location, // 실제 DB location 사용
        slotId: selectedSlot.id,
        isSeminarAttendee: reservationData.isSeminarAttendee,
      });

      // ⭐ 설명회 예약자는 이미 해싱된 비밀번호를 가져오므로 재해싱 방지
      const passwordToUse = reservationData.isSeminarAttendee
        ? reservationData.password // 이미 해싱됨
        : hashPassword(reservationData.password); // 미예약자는 해싱 필요

      const { data, error } = await supabase.rpc(
        'create_consulting_reservation',
        {
          p_slot_id: selectedSlot.id, // ⭐ slot_id 추가
          p_slot_date: selectedDate,
          p_slot_time: selectedTime + ':00',
          p_slot_location: selectedSlot.location, // 실제 슬롯의 location 사용
          p_student_name: reservationData.studentName,
          p_parent_phone: formatPhone(reservationData.parentPhone),
          p_school: reservationData.school || 'UNKNOWN',
          p_grade: reservationData.grade || 'UNKNOWN',
          p_math_level: reservationData.mathLevel || '상담 시 확인',
          p_password: passwordToUse, // ⭐ 조건부 해싱 적용
          p_is_seminar_attendee: reservationData.isSeminarAttendee || false,
          p_linked_seminar_id: reservationData.linkedSeminarId || null, // ⭐ 원본 그대로 전달 (_campaign 포함)
          p_privacy_consent: reservationData.privacyConsent || null,
          // ⭐ 동의 정보 추가
          p_test_deadline_agreed: reservationData.testDeadlineAgreed || false,
          p_test_deadline_agreed_at: reservationData.testDeadlineAgreedAt || null,
        }
      );

      if (error) throw error;

      console.log('RPC 반환 데이터:', data);

      // ⭐ RPC 함수가 반환하는 값 형식에 따라 처리 (배열/객체/문자열 모두 대응)
      const reservationId = Array.isArray(data)
        ? (data[0]?.reservation_id || data[0])
        : (typeof data === 'string' ? data : data?.reservation_id || data);

      console.log('예약 ID:', reservationId);

      const { data: reservation, error: fetchError } = await supabase
        .from('consulting_reservations')
        .select('*, consulting_slots(*)')
        .eq('id', reservationId)
        .single();

      if (fetchError) throw fetchError;

      // 자동 슬롯 오픈 체크 (비동기로 실행, 실패해도 예약은 성공)
      if (checkAndOpenNextSlots && reservationData.linkedSeminarId) {
        checkAndOpenNextSlots(reservationData.linkedSeminarId).catch((err) =>
          console.error('자동 슬롯 오픈 체크 중 오류:', err)
        );
      }

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
    // ⚠️ 임시: 사직점 오픈 기간(3개월) 동안 모든 지점 방문테스트로 고정
    // TODO: 추후 원인 파악 후 복원 필요
    setTestMethod('onsite');
    return 'onsite';
  };

  // 진단검사 가능 날짜 로드 (컨설팅 날짜 전까지만)
  // ⭐ 캠페인별 분리: selectedSeminarId(캠페인 ID)로 필터링
  const loadAvailableTestDates = async (location, consultingDate) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      console.log('🧪 진단검사 날짜 로드 시작:', {
        location,
        consultingDate,
        today,
        selectedSeminarId, // ⭐ 캠페인 ID 로깅
      });

      // ⭐ 캠페인 ID가 있으면 캠페인별 필터링, 없으면 location 기반
      let query = supabase
        .from('test_slots')
        .select('*')
        .gte('date', today)
        .lt('date', consultingDate) // 컨설팅 날짜 전까지만
        .eq('status', 'active');

      if (selectedSeminarId) {
        query = query.eq('campaign_id', selectedSeminarId);
        console.log('📌 캠페인 ID로 test_slots 필터링:', selectedSeminarId);
      } else {
        query = query.eq('location', location);
        console.log('📌 location으로 test_slots 필터링:', location);
      }

      const { data: slots, error } = await query.order('date', { ascending: true });

      if (error) throw error;

      console.log('✅ 로드된 test_slots:', slots);
      console.log('📊 test_slots 개수:', slots?.length || 0);

      // ✅ current_bookings 대신 실제 예약 레코드 수를 카운트 (정확한 잔여석 계산)
      const slotIds = slots.map(s => s.id);
      let bookingCounts = {};
      if (slotIds.length > 0) {
        const { data: reservations } = await supabase
          .from('test_reservations')
          .select('slot_id')
          .in('slot_id', slotIds)
          .in('status', ['confirmed', '예약']);

        (reservations || []).forEach(r => {
          bookingCounts[r.slot_id] = (bookingCounts[r.slot_id] || 0) + 1;
        });
      }

      const dateMap = new Map();

      slots.forEach((slot) => {
        const actualBookings = bookingCounts[slot.id] || 0;
        const availableSlots = slot.max_capacity - actualBookings;

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

      console.log('📅 최종 진단검사 날짜 목록:', dates);
      setAvailableTestDates(dates);
    } catch (error) {
      console.error('진단검사 날짜 로드 실패:', error);
      showToast('날짜 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 진단검사 시간 슬롯 로드
  // ⭐ 캠페인별 분리: selectedSeminarId(캠페인 ID)로 필터링
  const loadTestTimeSlots = async (date, location) => {
    try {
      setLoading(true);

      // ⭐ 캠페인 ID가 있으면 캠페인별 필터링, 없으면 location 기반
      let query = supabase
        .from('test_slots')
        .select('*')
        .eq('date', date)
        .eq('status', 'active');

      if (selectedSeminarId) {
        query = query.eq('campaign_id', selectedSeminarId);
        console.log('📌 캠페인 ID로 test_slots 시간 필터링:', selectedSeminarId);
      } else {
        query = query.eq('location', location);
        console.log('📌 location으로 test_slots 시간 필터링:', location);
      }

      const { data: slots, error } = await query.order('time', { ascending: true });

      if (error) throw error;

      // ✅ current_bookings 대신 실제 예약 레코드 수를 카운트 (정확한 잔여석 계산)
      const slotIds = slots.map(s => s.id);
      let bookingCounts = {};
      if (slotIds.length > 0) {
        const { data: reservations } = await supabase
          .from('test_reservations')
          .select('slot_id')
          .in('slot_id', slotIds)
          .in('status', ['confirmed', '예약']);

        (reservations || []).forEach(r => {
          bookingCounts[r.slot_id] = (bookingCounts[r.slot_id] || 0) + 1;
        });
      }

      const formattedSlots = slots.map((slot) => {
        const actualBookings = bookingCounts[slot.id] || 0;
        return {
          ...slot,
          timeDisplay: slot.time.slice(0, 5),
          availableSeats: slot.max_capacity - actualBookings,
          isFull: actualBookings >= slot.max_capacity,
        };
      });

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

  // ⭐ 입학테스트 전용 예약 생성 (컨설팅 없이 독립 예약)
  const createEntranceTestReservation = async (testData) => {
    try {
      setLoading(true);

      // 선택한 시간의 슬롯 정보 찾기
      const selectedSlot = testTimeSlots.find((slot) => {
        const slotTime = slot.time.slice(0, 5);
        return slotTime === selectedTestTime;
      });

      if (!selectedSlot) {
        showToast('선택한 시간 슬롯을 찾을 수 없습니다.', 'error');
        throw new Error('Slot not found');
      }

      // 슬롯 여유 확인
      if (selectedSlot.current_bookings >= selectedSlot.max_capacity) {
        showToast('해당 시간은 이미 마감되었습니다.', 'error');
        throw new Error('Slot is full');
      }

      // 같은 전화번호의 confirmed 컨설팅 예약 찾기 (자동 연결)
      const formattedPhone = formatPhone(testData.parentPhone);
      let consultingReservationId = null;
      const { data: existingConsulting } = await supabase
        .from('consulting_reservations')
        .select('id')
        .eq('parent_phone', formattedPhone)
        .eq('student_name', testData.studentName)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingConsulting && existingConsulting.length > 0) {
        consultingReservationId = existingConsulting[0].id;
      }

      // 직접 INSERT
      const { data: reservation, error: insertError } = await supabase
        .from('test_reservations')
        .insert({
          slot_id: selectedSlot.id,
          consulting_reservation_id: consultingReservationId, // 자동 연결
          parent_phone: formattedPhone,
          student_name: testData.studentName,
          school: testData.school,
          grade: testData.grade,
          math_level: testData.mathLevel,
          location: testData.location,
          password: testData.password,
          status: '예약',
          reservation_type: 'entrance_test', // ⭐ 입학테스트 유형
          test_date: selectedSlot.date, // ⭐ 슬롯 날짜 추가
          test_time: selectedSlot.time, // ⭐ 슬롯 시간 추가
        })
        .select('*, test_slots(*)')
        .single();

      if (insertError) throw insertError;

      // 슬롯 예약 카운트 증가
      const { error: updateError } = await supabase
        .from('test_slots')
        .update({ current_bookings: selectedSlot.current_bookings + 1 })
        .eq('id', selectedSlot.id);

      if (updateError) {
        console.error('슬롯 카운트 업데이트 실패:', updateError);
        // 예약은 이미 생성되었으므로 에러를 던지지 않음
      }

      showToast('입학테스트 예약이 완료되었습니다!', 'success');
      return reservation;
    } catch (error) {
      console.error('입학테스트 예약 실패:', error);

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

  // ⭐ 입학테스트용 날짜 로드 (컨설팅 날짜 제약 없음)
  // ⭐ 캠페인별 분리: 해당 location의 active 캠페인 슬롯만 조회
  const loadEntranceTestDates = async (location) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      console.log('🎯 입학테스트 날짜 로드:', { location, today });

      // ⭐ 해당 location의 active 캠페인 찾기
      const { data: activeCampaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('location', location)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let query = supabase
        .from('test_slots')
        .select('*')
        .gte('date', today)
        .eq('status', 'active');

      // ⭐ active 캠페인이 있으면 캠페인별 필터링, 없으면 location 기반 (폴백)
      if (activeCampaign?.id) {
        query = query.eq('campaign_id', activeCampaign.id);
        console.log('📌 입학테스트: 캠페인 ID로 필터링:', activeCampaign.id);
      } else {
        query = query.eq('location', location);
        console.log('📌 입학테스트: location으로 필터링 (active 캠페인 없음):', location);
      }

      const { data: slots, error } = await query.order('date', { ascending: true });

      if (error) throw error;

      console.log('✅ 로드된 test_slots:', slots);

      // ✅ current_bookings 대신 실제 예약 레코드 수를 카운트 (정확한 잔여석 계산)
      const slotIds = slots.map(s => s.id);
      let bookingCounts = {};
      if (slotIds.length > 0) {
        const { data: reservations } = await supabase
          .from('test_reservations')
          .select('slot_id')
          .in('slot_id', slotIds)
          .in('status', ['confirmed', '예약']);

        (reservations || []).forEach(r => {
          bookingCounts[r.slot_id] = (bookingCounts[r.slot_id] || 0) + 1;
        });
      }

      const dateMap = new Map();

      slots.forEach((slot) => {
        const actualBookings = bookingCounts[slot.id] || 0;
        const availableSlots = slot.max_capacity - actualBookings;

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

      console.log('📅 최종 입학테스트 날짜 목록:', dates);
      setAvailableTestDates(dates);
    } catch (error) {
      console.error('입학테스트 날짜 로드 실패:', error);
      showToast('날짜 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 유틸리티 함수들
  // ========================================

  const formatDateDisplay = formatDateShort;
  const getDayOfWeek = getDayOfWeekKR;

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
    selectedSeminarId,
    setSelectedSeminarId,
    availableDates,
    loadAvailableDates,
    selectedDate,
    setSelectedDate,
    timeSlots,
    loadTimeSlots,
    selectedTime,
    setSelectedTime,
    createConsultingReservation,

    // 컨설팅 유형 관련 (대표/원장)
    consultantType,
    isCeoSlotsFull,
    isEligibleForCeo, // ⭐ 대표 컨설팅 자격 여부

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
    refreshTestTimeSlots: loadTestTimeSlots,
    // ⭐ 입학테스트 전용 (컨설팅 없이)
    createEntranceTestReservation,
    loadEntranceTestDates,
  };

  return (
    <ConsultingContext.Provider value={value}>
      {children}
    </ConsultingContext.Provider>
  );
}
