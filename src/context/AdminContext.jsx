import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, hashPassword } from '../utils/supabase';

const AdminContext = createContext();

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}

export function AdminProvider({ children }) {
  // 로컬스토리지에서 인증 상태 동기적으로 복원 (초기값으로)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('admin_authenticated') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [authMode, setAuthMode] = useState(() => {
    return localStorage.getItem('admin_auth_mode') || 'super';
  });
  const [allowedCampaignId, setAllowedCampaignId] = useState(() => {
    return localStorage.getItem('admin_campaign_id') || null;
  });

  // 로그인
  const login = async (password) => {
    // 환경변수에서 비밀번호 가져오기 (없으면 기본값)
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1234';

    // 수퍼 관리자 로그인
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setAuthMode('super');
      setAllowedCampaignId(null);
      localStorage.setItem('admin_authenticated', 'true');
      localStorage.setItem('admin_auth_mode', 'super');
      localStorage.removeItem('admin_campaign_id');
      return { success: true, mode: 'super' };
    }

    // 캠페인 비밀번호 확인
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, access_password, title, location')
        .not('access_password', 'is', null);

      if (error) throw error;

      const matchedCampaign = campaigns?.find(c => c.access_password === password);

      if (matchedCampaign) {
        setIsAuthenticated(true);
        setAuthMode('campaign');
        setAllowedCampaignId(matchedCampaign.id);
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_auth_mode', 'campaign');
        localStorage.setItem('admin_campaign_id', matchedCampaign.id);
        return {
          success: true,
          mode: 'campaign',
          campaignId: matchedCampaign.id,
          campaignTitle: matchedCampaign.title || matchedCampaign.location
        };
      }
    } catch (error) {
      console.error('캠페인 비밀번호 확인 중 오류:', error);
    }

    return { success: false };
  };

  // 로그아웃
  const logout = () => {
    setIsAuthenticated(false);
    setAuthMode('super');
    setAllowedCampaignId(null);
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_auth_mode');
    localStorage.removeItem('admin_campaign_id');
  };

  // Toast 표시
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  // ========================================
  // 캠페인(설명회) 관련 함수
  // ========================================

  // 모든 캠페인 조회 (campaigns + seminar_slots)
  const loadCampaigns = async () => {
    try {
      setLoading(true);

      // 1. campaigns와 seminar_slots join해서 조회
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          seminar_slots (*)
        `);

      if (campaignsError) throw campaignsError;

      // 2. 각 캠페인별 통계 계산
      const campaignsWithStats = await Promise.all(
        campaignsData.map(async (campaign) => {
          // 설명회 예약 수 (해당 캠페인의 모든 슬롯에 대한 예약)
          const slotIds = campaign.seminar_slots?.map(s => s.id) || [];

          // 컨설팅 슬롯 ID 목록 (별도 조회)
          const { data: consultingSlotsData } = await supabase
            .from('consulting_slots')
            .select('id')
            .eq('linked_seminar_id', campaign.id);
          const consultingSlotIds = consultingSlotsData?.map(s => s.id) || [];

          const { count: attendeeCount } = slotIds.length > 0
            ? await supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .in('seminar_slot_id', slotIds)
                .in('status', ['예약', '참석'])
            : { count: 0 };

          // 컨설팅 예약 수 (slot_id 기반으로 조회)
          const { count: consultingCount } = consultingSlotIds.length > 0
            ? await supabase
                .from('consulting_reservations')
                .select('*', { count: 'exact', head: true })
                .in('slot_id', consultingSlotIds)
                .not('status', 'in', '(cancelled,auto_cancelled,취소)')
            : { count: 0 };

          // 진단검사 예약 수
          const { data: consultingIds } = consultingSlotIds.length > 0
            ? await supabase
                .from('consulting_reservations')
                .select('id')
                .in('slot_id', consultingSlotIds)
                .not('status', 'in', '(cancelled,auto_cancelled,취소)')
            : { data: [] };

          const consultingIdList = consultingIds?.map(c => c.id) || [];

          const { count: testCount } = consultingIdList.length > 0
            ? await supabase
                .from('test_reservations')
                .select('*', { count: 'exact', head: true })
                .in('consulting_reservation_id', consultingIdList)
                .in('status', ['confirmed', '예약'])
            : { count: 0 };

          // 최종 등록 수 (slot_id 기반으로 조회)
          const { count: enrolledCount } = consultingSlotIds.length > 0
            ? await supabase
                .from('consulting_reservations')
                .select('*', { count: 'exact', head: true })
                .in('slot_id', consultingSlotIds)
                .eq('enrollment_status', '확정')
                .not('status', 'in', '(cancelled,auto_cancelled,취소)')
            : { count: 0 };

          // 첫 번째 슬롯의 날짜/시간을 대표값으로 사용 (정렬용)
          const firstSlot = campaign.seminar_slots?.[0];

          return {
            ...campaign,
            // 호환성을 위해 첫 슬롯의 날짜/시간 추가
            date: firstSlot?.date || null,
            time: firstSlot?.time || null,
            stats: {
              attendees: attendeeCount || 0,
              consultings: consultingCount || 0,
              tests: testCount || 0,
              enrolled: enrolledCount || 0,
            },
          };
        })
      );

      // 캠페인 정렬: active 먼저 + 날짜 오름차순
      const sortedCampaigns = campaignsWithStats.sort((a, b) => {
        // 1. status 우선 정렬
        if (a.status !== b.status) {
          return a.status === 'active' ? -1 : 1;
        }

        // 2. 날짜 오름차순 (null은 맨 뒤)
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;

        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;

        // 3. 시간 오름차순
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return 0;
      });

      return sortedCampaigns;
    } catch (error) {
      console.error('캠페인 로드 실패:', error);
      showToast('캠페인을 불러오는데 실패했습니다.', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 특정 캠페인 상세 조회
  const loadCampaignDetail = async (campaignId) => {
    try {
      setLoading(true);
      console.log('🔍 캠페인 상세 조회 시작:', campaignId);

      // 1. 캠페인 기본 정보 + 설명회 슬롯
      console.log('1️⃣ 캠페인 기본 정보 조회...');
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          seminar_slots (*)
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError) {
        console.error('❌ 캠페인 기본 정보 조회 실패:', campaignError);
        throw campaignError;
      }
      console.log('✅ 캠페인 정보:', campaign);

      // 2. 설명회 참석자 목록 (캠페인의 모든 슬롯에 대한 예약)
      console.log('2️⃣ 설명회 참석자 조회...');
      const slotIds = campaign.seminar_slots?.map(s => s.id) || [];

      let attendees = [];
      if (slotIds.length > 0) {
        const { data: attendeesData, error: attendeesError } = await supabase
          .from('reservations')
          .select('*')
          .in('seminar_slot_id', slotIds)
          .order('id', { ascending: false });

        if (attendeesError) {
          console.error('❌ 참석자 조회 실패:', attendeesError);
          throw attendeesError;
        }
        attendees = attendeesData || [];
      }
      console.log('✅ 참석자 수:', attendees?.length || 0);

      // 3. 먼저 해당 캠페인의 컨설팅 슬롯 ID 목록 조회
      console.log('3️⃣ 컨설팅 슬롯 ID 조회...');
      const { data: campaignConsultingSlots } = await supabase
        .from('consulting_slots')
        .select('id')
        .eq('linked_seminar_id', campaignId);

      const consultingSlotIds = campaignConsultingSlots?.map(s => s.id) || [];
      console.log('✅ 캠페인 컨설팅 슬롯 수:', consultingSlotIds.length);

      // 3-1. 컨설팅 예약 목록 (linked_seminar_id 또는 slot_id로 조회)
      console.log('3️⃣-1 컨설팅 예약 조회...');
      let consultings = [];

      if (consultingSlotIds.length > 0) {
        // slot_id 기반으로 조회 (linked_seminar_id가 null인 경우도 포함)
        const { data: consultingsBySlot, error: consultingsError } = await supabase
          .from('consulting_reservations')
          .select('*')
          .in('slot_id', consultingSlotIds)
          .not('status', 'in', '(cancelled,auto_cancelled,취소)')
          .order('id', { ascending: false });

        if (consultingsError) {
          console.error('❌ 컨설팅 조회 실패:', consultingsError);
          throw consultingsError;
        }
        consultings = consultingsBySlot || [];
      }

      console.log('✅ 컨설팅 예약 수:', consultings?.length || 0);

      // 3-1-1. 취소된 컨설팅 예약 조회 (auto_cancelled 또는 cancelled)
      console.log('3️⃣-1-1 취소된 컨설팅 예약 조회...');
      let cancelledConsultings = [];

      if (consultingSlotIds.length > 0) {
        const { data: cancelledData, error: cancelledError } = await supabase
          .from('consulting_reservations')
          .select('*')
          .in('slot_id', consultingSlotIds)
          .in('status', ['cancelled', 'auto_cancelled', '취소'])
          .order('cancelled_at', { ascending: false });

        if (cancelledError) {
          console.error('❌ 취소된 컨설팅 조회 실패:', cancelledError);
        } else {
          cancelledConsultings = cancelledData || [];
        }
      }
      console.log('✅ 취소된 컨설팅 예약 수:', cancelledConsultings?.length || 0);

      // 취소된 컨설팅에 슬롯 정보 추가
      const cancelledWithSlots = await Promise.all(
        (cancelledConsultings || []).map(async (consulting) => {
          let result = { ...consulting };

          if (consulting.slot_id) {
            const { data: slot } = await supabase
              .from('consulting_slots')
              .select('*')
              .eq('id', consulting.slot_id)
              .single();
            result.consulting_slots = slot;
          }

          return result;
        })
      );

      // 3-1. 컨설팅 슬롯 정보 및 진단검사 정보 추가
      const consultingsWithSlots = await Promise.all(
        (consultings || []).map(async (consulting) => {
          let result = { ...consulting };

          // 슬롯 정보 추가
          if (consulting.slot_id) {
            const { data: slot } = await supabase
              .from('consulting_slots')
              .select('*')
              .eq('id', consulting.slot_id)
              .single();
            result.consulting_slots = slot;
          }

          // 진단검사 정보 추가 (consulting_reservation_id 또는 전화번호로 조회)
          // 1차: consulting_reservation_id로 조회
          let { data: testReservations } = await supabase
            .from('test_reservations')
            .select(`
              *,
              test_slots (
                date,
                time
              )
            `)
            .eq('consulting_reservation_id', consulting.id)
            .in('status', ['confirmed', '예약'])
            .order('created_at', { ascending: false })
            .limit(1);

          // 2차: consulting_reservation_id로 못 찾으면 전화번호로 조회
          // (학부모가 진단검사 취소 후 재예약한 경우)
          if ((!testReservations || testReservations.length === 0) && consulting.parent_phone) {
            const { data: testByPhone } = await supabase
              .from('test_reservations')
              .select(`
                *,
                test_slots (
                  date,
                  time
                )
              `)
              .eq('parent_phone', consulting.parent_phone)
              .in('status', ['confirmed', '예약'])
              .order('created_at', { ascending: false })
              .limit(1);
            testReservations = testByPhone;
          }

          result.test_reservation = testReservations?.[0] || null;

          return result;
        })
      );

      // 3-2. 해당 캠페인의 모든 컨설팅 슬롯 조회 (빈 슬롯 표시용)
      console.log('3️⃣-2 모든 컨설팅 슬롯 조회...');
      const { data: allConsultingSlots, error: slotsError } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('linked_seminar_id', campaignId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (slotsError) {
        console.error('❌ 컨설팅 슬롯 조회 실패:', slotsError);
      }
      console.log('✅ 컨설팅 슬롯 수:', allConsultingSlots?.length || 0);

      // 4. 진단검사 예약 목록 (consulting_reservations를 통해 간접 조회 + 전화번호 기반 조회)
      console.log('4️⃣ 진단검사 예약 조회...');

      // 4-1. 해당 캠페인의 컨설팅 예약 ID 및 전화번호 목록 조회
      const consultingIdList = consultingsWithSlots?.map(c => c.id) || [];
      const consultingPhones = [...new Set(consultingsWithSlots?.map(c => c.parent_phone).filter(Boolean) || [])];

      let tests = [];
      const testIds = new Set(); // 중복 방지용

      // 4-1-1. consulting_reservation_id로 조회
      if (consultingIdList.length > 0) {
        const { data: testsData, error: testsError } = await supabase
          .from('test_reservations')
          .select('*, consulting_reservations(student_name, school, grade, math_level, parent_phone)')
          .in('consulting_reservation_id', consultingIdList)
          .in('status', ['confirmed', '예약'])
          .order('id', { ascending: false });

        if (testsError) {
          console.error('❌ 진단검사 조회 실패:', testsError);
          throw testsError;
        }

        // 컨설팅 정보를 평탄화 (flatten)
        (testsData || []).forEach((test) => {
          testIds.add(test.id);
          tests.push({
            ...test,
            student_name: test.consulting_reservations?.student_name || test.student_name,
            school: test.consulting_reservations?.school || test.school,
            grade: test.consulting_reservations?.grade || test.grade,
            math_level: test.consulting_reservations?.math_level || test.math_level,
            parent_phone: test.consulting_reservations?.parent_phone || test.parent_phone,
          });
        });
      }

      // 4-1-2. 전화번호로 추가 조회 (취소 후 재예약한 경우 - 입학테스트 경로로 예약해도 포함)
      if (consultingPhones.length > 0) {
        const { data: testsByPhone } = await supabase
          .from('test_reservations')
          .select('*')
          .in('parent_phone', consultingPhones)
          .in('status', ['confirmed', '예약'])
          .order('id', { ascending: false });

        // 컨설팅 정보 매핑
        const consultingByPhone = {};
        consultingsWithSlots?.forEach(c => {
          consultingByPhone[c.parent_phone] = c;
        });

        // 중복되지 않는 것만 추가
        (testsByPhone || []).forEach((test) => {
          if (!testIds.has(test.id)) {
            testIds.add(test.id);
            const consulting = consultingByPhone[test.parent_phone];
            tests.push({
              ...test,
              student_name: consulting?.student_name || test.student_name,
              school: consulting?.school || test.school,
              grade: consulting?.grade || test.grade,
              math_level: consulting?.math_level || test.math_level,
            });
          }
        });
      }

      // 4-1-3. 입학테스트 독립 예약 조회 (컨설팅 없이 바로 진단검사 예약한 경우)
      const { data: entranceTests } = await supabase
        .from('test_reservations')
        .select('*, test_slots(*)')
        .eq('reservation_type', 'entrance_test')
        .in('status', ['confirmed', '예약'])
        .order('created_at', { ascending: false });

      // 해당 캠페인 지역과 일치하는 입학테스트만 추가
      (entranceTests || []).forEach((test) => {
        if (!testIds.has(test.id) && test.test_slots?.location === campaign.location) {
          testIds.add(test.id);
          tests.push({
            ...test,
            test_date: test.test_slots?.date,
            test_time: test.test_slots?.time,
            location: test.test_slots?.location,
          });
        }
      });

      // 4-1-4. ⭐ 관리자 수동 배정(manual) 예약 조회
      //        통합학생관리에서 수동 배정된 test_reservations는 consulting_reservation_id가
      //        없을 수 있어 기존 경로(1~3)로 안 잡힌다. 현재 캠페인에 속한 test_slots를
      //        통해 scoping 하여 추가.
      const { data: manualTests } = await supabase
        .from('test_reservations')
        .select('*, test_slots(*)')
        .eq('reservation_type', 'manual')
        .in('status', ['confirmed', '예약'])
        .order('created_at', { ascending: false });

      (manualTests || []).forEach((test) => {
        if (testIds.has(test.id)) return;

        // 캠페인 scoping: 1) slot의 campaign_id 일치, 2) 폴백으로 지역 일치
        const slotCampaignId = test.test_slots?.campaign_id;
        const slotLocation = test.test_slots?.location;
        const matchesCampaign = slotCampaignId
          ? slotCampaignId === campaignId
          : slotLocation === campaign.location;

        if (!matchesCampaign) return;

        testIds.add(test.id);
        tests.push({
          ...test,
          test_date: test.test_slots?.date,
          test_time: test.test_slots?.time,
          location: test.test_slots?.location,
        });
      });

      console.log('✅ 진단검사 예약 수:', tests?.length || 0);

      // 4-2. 진단검사 슬롯 정보 추가
      const testsWithSlots = await Promise.all(
        (tests || []).map(async (test) => {
          if (test.slot_id) {
            const { data: slot } = await supabase
              .from('test_slots')
              .select('*')
              .eq('id', test.slot_id)
              .single();
            return { ...test, test_slots: slot };
          }
          return test;
        })
      );

      // 4-3. 해당 캠페인의 모든 진단검사 슬롯 조회 (슬롯 관리용)
      // ⭐ 캠페인별 분리: campaign_id로 필터링 (location 폴백)
      console.log('4️⃣-3 모든 진단검사 슬롯 조회...');

      // 먼저 campaign_id로 조회 시도
      let { data: allTestSlots, error: testSlotsError } = await supabase
        .from('test_slots')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      // campaign_id로 슬롯이 없으면 location 기반으로 폴백 (마이그레이션 전 데이터 호환)
      if (!allTestSlots || allTestSlots.length === 0) {
        console.log('📌 campaign_id로 슬롯 없음, location 기반 폴백');
        const { data: locationSlots, error: locationError } = await supabase
          .from('test_slots')
          .select('*')
          .eq('location', campaign.location)
          .is('campaign_id', null) // campaign_id가 null인 것만 (미연결 슬롯)
          .order('date', { ascending: true })
          .order('time', { ascending: true });

        if (!locationError) {
          allTestSlots = locationSlots;
        }
        testSlotsError = locationError;
      }

      if (testSlotsError) {
        console.error('❌ 진단검사 슬롯 조회 실패:', testSlotsError);
      }
      console.log('✅ 진단검사 슬롯 수:', allTestSlots?.length || 0);

      // 4-4. ⭐ 진단검사 탭 '전체' 합계와 일치하는 카운터 계산
      //      TestsTab.allStudents 의 3개 소스를 동일하게 집계:
      //      (1) tests (이미 로드됨)
      //      (2) diagnostic_submissions registrations
      //      (3) entrance_test test_reservations 중 tests에 없는 것
      const [{ count: registrationsCount }, { data: entranceTestsForCount }] =
        await Promise.all([
          supabase
            .from('diagnostic_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('submission_type', 'registration'),
          supabase
            .from('test_reservations')
            .select('id, test_slots!inner(location)')
            .eq('reservation_type', 'entrance_test')
            .in('status', ['confirmed', '예약']),
        ]);

      // 해당 캠페인 지역과 일치하고 tests에 아직 포함되지 않은 entrance_test만 +1
      const extraEntranceTestsCount = (entranceTestsForCount || []).filter(
        (et) => et.test_slots?.location === campaign.location && !testIds.has(et.id)
      ).length;

      const testCount =
        (testsWithSlots?.length || 0) +
        (registrationsCount || 0) +
        extraEntranceTestsCount;

      console.log('🎉 캠페인 상세 조회 완료!');
      return {
        campaign,
        attendees: attendees || [],
        consultings: consultingsWithSlots || [],
        cancelledConsultings: cancelledWithSlots || [], // ⭐ 취소된 컨설팅 예약
        consultingSlots: allConsultingSlots || [],
        tests: testsWithSlots || [],
        testCount, // ⭐ TestsTab '전체' 합계와 일치하는 통합 카운터
        testSlots: allTestSlots || [],
        seminarSlots: campaign.seminar_slots || [], // ⭐ 설명회 슬롯 명시적 추가
      };
    } catch (error) {
      console.error('💥 캠페인 상세 조회 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      showToast('캠페인 정보를 불러오는데 실패했습니다.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 컨설팅 결과 작성
  // ========================================

  const updateConsultingResult = async (consultingId, resultData) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('consulting_reservations')
        .update({
          consultation_memo: resultData.notes,
          enrollment_status: resultData.enrollmentStatus, // 미정/확정/불가
          consulted_at: new Date().toISOString(),
        })
        .eq('id', consultingId);

      if (error) throw error;

      showToast('컨설팅 결과가 저장되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('컨설팅 결과 저장 실패:', error);
      showToast('결과 저장에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 캠페인 설정 관리
  // ========================================

  const createCampaign = async (campaignData) => {
    try {
      setLoading(true);

      console.log('📝 캠페인 생성 시작:', campaignData);

      // 1. campaigns 테이블에 캠페인 기본 정보 삽입
      const { data: campaignRecord, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          title: campaignData.title,
          location: campaignData.location,
          season: campaignData.season || null,
          status: campaignData.status || 'active',
          access_password: campaignData.access_password || null,
        })
        .select()
        .single();

      if (campaignError) {
        console.error('❌ 캠페인 생성 DB 오류:', campaignError);
        throw campaignError;
      }

      const id = campaignRecord.id;
      console.log('✅ 캠페인 기본 정보 생성 완료, ID:', id);

      // 2. seminar_slots 테이블에 설명회 슬롯 삽입
      if (campaignData.seminarSlots && campaignData.seminarSlots.length > 0) {
        console.log('📅 설명회 슬롯 생성 중:', campaignData.seminarSlots.length + '개');

        const seminarSlotsToInsert = campaignData.seminarSlots.map((slot, index) => ({
          campaign_id: id,
          session_number: index + 1,
          date: slot.date,
          time: slot.time,
          location: slot.location || campaignData.location,
          max_capacity: slot.max_capacity || 100,
          display_capacity: slot.display_capacity || slot.max_capacity || 100,
          current_bookings: 0,
          status: 'active',
          test_method: slot.testMethod || campaignData.testMethod || 'home',
        }));

        const { error: slotsError } = await supabase
          .from('seminar_slots')
          .insert(seminarSlotsToInsert);

        if (slotsError) {
          console.error('❌ 설명회 슬롯 생성 실패:', slotsError);
          throw slotsError;
        }

        console.log('✅ 설명회 슬롯 생성 완료');
      } else {
        // seminarSlots가 없으면 기본 슬롯 1개 생성 (호환성)
        console.log('📅 기본 설명회 슬롯 1개 생성');

        const { error: slotError } = await supabase
          .from('seminar_slots')
          .insert({
            campaign_id: id,
            session_number: 1,
            date: campaignData.date,
            time: campaignData.time,
            location: campaignData.location,
            max_capacity: campaignData.max_capacity || 100,
            display_capacity: campaignData.display_capacity || campaignData.max_capacity || 100,
            current_bookings: 0,
            status: 'active',
            test_method: campaignData.testMethod || 'home',
          });

        if (slotError) {
          console.error('❌ 기본 슬롯 생성 실패:', slotError);
          throw slotError;
        }

        console.log('✅ 기본 슬롯 생성 완료');
      }

      // 컨설팅 슬롯 생성
      if (campaignData.consultingSlots && campaignData.consultingSlots.length > 0) {
        console.log('📅 컨설팅 슬롯 생성 중:', campaignData.consultingSlots.length + '개');

        const slotsToInsert = campaignData.consultingSlots.map(slot => ({
          date: slot.date,
          time: slot.time,
          day_of_week: slot.dayOfWeek,
          location: slot.location,
          max_capacity: slot.capacity || 1,
          current_bookings: 0,
          is_available: true,
          linked_seminar_id: id,
        }));

        const { error: slotsError } = await supabase
          .from('consulting_slots')
          .insert(slotsToInsert);

        if (slotsError) {
          console.error('❌ 컨설팅 슬롯 생성 실패:', slotsError);
          throw slotsError;
        }

        console.log('✅ 컨설팅 슬롯 생성 완료');
      }

      // 진단검사 방식 저장
      if (campaignData.testMethod) {
        console.log('🧪 진단검사 방식 저장:', campaignData.testMethod);

        const methodDescriptions = {
          home: '가정 셀프 테스트',
          onsite: '방문 진단검사',
          both: '가정 + 방문 선택',
          offline: '현장접수 (종이 신청서)',
        };

        const { error: methodError } = await supabase
          .from('test_methods')
          .insert({
            location: campaignData.location,
            method: campaignData.testMethod, // 'home' | 'onsite' | 'both' | 'offline'
            description:
              methodDescriptions[campaignData.testMethod] || '방문 진단검사',
          });

        if (methodError && methodError.code !== '23505') { // 중복 키 에러는 무시 (이미 존재)
          console.error('❌ 진단검사 방식 저장 실패:', methodError);
          // 진단검사 방식은 실패해도 캠페인은 생성됨
        }
      }

      // 방문 진단검사 슬롯 생성
      // ⭐ 캠페인별 분리: campaign_id로 슬롯을 캠페인에 연결
      if ((campaignData.testMethod === 'onsite' || campaignData.testMethod === 'both') && campaignData.testSlots && campaignData.testSlots.length > 0) {
        console.log('🧪 진단검사 슬롯 생성 중:', campaignData.testSlots.length + '개');

        const testSlotsToInsert = campaignData.testSlots.map(slot => ({
          date: slot.date,
          time: slot.time,
          location: campaignData.location,
          max_capacity: slot.capacity || 1,
          current_bookings: 0,
          status: 'active',
          campaign_id: id, // ⭐ 캠페인 ID 추가
        }));

        const { error: testSlotsError } = await supabase
          .from('test_slots')
          .insert(testSlotsToInsert);

        if (testSlotsError) {
          console.error('❌ 진단검사 슬롯 생성 실패:', testSlotsError);
          // 진단검사 슬롯은 실패해도 캠페인은 생성됨
        } else {
          console.log('✅ 진단검사 슬롯 생성 완료');
        }
      }

      // auto_open_threshold를 localStorage에 저장 (seminars 테이블에 컬럼이 없으므로)
      if (campaignData.auto_open_threshold) {
        const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
        settings[id] = {
          auto_open_threshold: campaignData.auto_open_threshold,
        };
        localStorage.setItem('campaign_settings', JSON.stringify(settings));
        console.log('✅ 자동 슬롯 오픈 설정 저장:', campaignData.auto_open_threshold);
      }

      showToast('새 캠페인이 생성되었습니다!', 'success');
      return true;
    } catch (error) {
      console.error('💥 캠페인 생성 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      showToast(`캠페인 생성에 실패했습니다: ${error.message}`, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCampaign = async (campaignId, campaignData) => {
    try {
      setLoading(true);

      console.log('📝 캠페인 업데이트 시작:', campaignId);
      console.log('📊 업데이트할 데이터:', campaignData);

      // campaigns 테이블 업데이트 (campaign 레벨 데이터만)
      const campaignUpdateData = {
        title: campaignData.title,
        location: campaignData.location,
        season: campaignData.season,
        status: campaignData.status,
        access_password: campaignData.access_password,
        allow_duplicate_reservation: campaignData.allow_duplicate_reservation, // ⭐ 중복 예약 설정
      };

      const { data, error } = await supabase
        .from('campaigns')
        .update(campaignUpdateData)
        .eq('id', campaignId)
        .select();

      if (error) {
        console.error('❌ 업데이트 DB 오류:', error);
        throw error;
      }

      console.log('✅ 캠페인 업데이트 성공:', data);

      // seminar_slots 업데이트 (필요시 - 일반적으로 슬롯은 별도 관리)
      // 기본 슬롯 정보 업데이트 (date, time, max_capacity, test_method 등)
      if (campaignData.date || campaignData.time || campaignData.max_capacity !== undefined ||
          campaignData.testMethod || campaignData.test_method) {
        console.log('📅 설명회 슬롯 업데이트 중...');

        const slotUpdateData = {};
        if (campaignData.date) slotUpdateData.date = campaignData.date;
        if (campaignData.time) slotUpdateData.time = campaignData.time;
        if (campaignData.max_capacity !== undefined) slotUpdateData.max_capacity = campaignData.max_capacity;
        if (campaignData.display_capacity !== undefined) slotUpdateData.display_capacity = campaignData.display_capacity;
        // ⭐ snake_case와 camelCase 둘 다 지원
        if (campaignData.testMethod) slotUpdateData.test_method = campaignData.testMethod;
        if (campaignData.test_method) slotUpdateData.test_method = campaignData.test_method;

        if (Object.keys(slotUpdateData).length > 0) {
          const { error: slotError } = await supabase
            .from('seminar_slots')
            .update(slotUpdateData)
            .eq('campaign_id', campaignId);

          if (slotError) {
            console.error('⚠️ 슬롯 업데이트 실패:', slotError);
            // 슬롯 업데이트 실패해도 캠페인은 업데이트됨
          } else {
            console.log('✅ 슬롯 업데이트 완료');
          }
        }
      }

      showToast('캠페인 정보가 업데이트되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('💥 캠페인 업데이트 실패:', error);
      showToast(`업데이트에 실패했습니다: ${error.message}`, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      setLoading(true);
      console.log('🗑️ 캠페인 삭제 시작:', campaignId);

      // 0. 캠페인 정보 및 슬롯 조회
      console.log('0️⃣ 캠페인 정보 조회 중...');
      const { data: campaign, error: campaignFetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          seminar_slots (id),
          consulting_slots (id)
        `)
        .eq('id', campaignId)
        .single();

      if (campaignFetchError) {
        console.error('❌ 캠페인 정보 조회 실패:', campaignFetchError);
        throw campaignFetchError;
      }

      console.log('✅ 캠페인 정보:', campaign);
      const slotIds = campaign.seminar_slots?.map(s => s.id) || [];
      const consultingSlotIds = campaign.consulting_slots?.map(s => s.id) || [];

      // 1. 컨설팅 예약 조회 (test_reservations 삭제를 위해) - slot_id 기반으로 조회
      console.log('1️⃣ 컨설팅 예약 조회 중...');
      const { data: consultings } = consultingSlotIds.length > 0
        ? await supabase
            .from('consulting_reservations')
            .select('id')
            .in('slot_id', consultingSlotIds)
        : { data: [] };

      const consultingIds = consultings?.map(c => c.id) || [];
      console.log('📋 컨설팅 예약 ID 목록:', consultingIds.length + '개');

      // 2. 진단검사 예약 삭제 (컨설팅 예약을 참조하므로 먼저 삭제)
      if (consultingIds.length > 0) {
        console.log('2️⃣ 진단검사 예약 삭제 중...');
        const { error: testReservationsError, count: testResCount } = await supabase
          .from('test_reservations')
          .delete({ count: 'exact' })
          .in('consulting_reservation_id', consultingIds);

        if (testReservationsError) {
          console.error('❌ 진단검사 예약 삭제 실패:', testReservationsError);
          throw testReservationsError;
        }
        console.log('✅ 진단검사 예약 삭제 완료:', testResCount + '개');
      } else {
        console.log('⏭️ 진단검사 예약이 없습니다.');
      }

      // 3. 컨설팅 예약 삭제 (slot_id 기반)
      console.log('3️⃣ 컨설팅 예약 삭제 중...');
      let consultingCount = 0;
      if (consultingSlotIds.length > 0) {
        const { error: consultingsError, count } = await supabase
          .from('consulting_reservations')
          .delete({ count: 'exact' })
          .in('slot_id', consultingSlotIds);

        if (consultingsError) {
          console.error('❌ 컨설팅 예약 삭제 실패:', consultingsError);
          throw consultingsError;
        }
        consultingCount = count || 0;
      }
      console.log('✅ 컨설팅 예약 삭제 완료:', consultingCount + '개');

      // 4. 컨설팅 슬롯 삭제
      console.log('4️⃣ 컨설팅 슬롯 삭제 중...');
      const { error: slotsError, count: slotsCount } = await supabase
        .from('consulting_slots')
        .delete({ count: 'exact' })
        .eq('linked_seminar_id', campaignId);

      if (slotsError) {
        console.error('❌ 컨설팅 슬롯 삭제 실패:', slotsError);
        throw slotsError;
      }
      console.log('✅ 컨설팅 슬롯 삭제 완료:', slotsCount + '개');

      // 5. 설명회 참석자 삭제 (seminar_slots 기반)
      if (slotIds.length > 0) {
        console.log('5️⃣ 설명회 참석자 삭제 중...');
        const { error: attendeesError, count: attendeesCount } = await supabase
          .from('reservations')
          .delete({ count: 'exact' })
          .in('seminar_slot_id', slotIds);

        if (attendeesError) {
          console.error('❌ 설명회 참석자 삭제 실패:', attendeesError);
          throw attendeesError;
        }
        console.log('✅ 설명회 참석자 삭제 완료:', attendeesCount + '개');
      } else {
        console.log('⏭️ 설명회 슬롯이 없습니다.');
      }

      // 6. 진단검사 방식 확인 (location 기반 - 다른 캠페인도 같은 location을 사용할 수 있으므로 주의)
      console.log('6️⃣ 진단검사 방식 확인 중 (location: ' + campaign.location + ')...');

      // 같은 location을 사용하는 다른 캠페인이 있는지 확인
      const { data: otherCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('location', campaign.location)
        .neq('id', campaignId);

      if (otherCampaigns && otherCampaigns.length > 0) {
        console.log('⚠️ 같은 location을 사용하는 다른 캠페인이 있어 test_methods는 유지합니다:', otherCampaigns.length + '개');
      } else {
        console.log('🗑️ 같은 location을 사용하는 다른 캠페인이 없으므로 test_methods 삭제...');
        const { error: testMethodsError } = await supabase
          .from('test_methods')
          .delete()
          .eq('location', campaign.location);

        if (testMethodsError) {
          console.error('⚠️ test_methods 삭제 실패 (무시):', testMethodsError);
        } else {
          console.log('✅ test_methods 삭제 완료');
        }
      }

      // 7. 캠페인 자체 삭제 (seminar_slots는 CASCADE로 자동 삭제됨)
      console.log('7️⃣ 캠페인 자체 삭제 중...');
      const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (deleteError) {
        console.error('❌ 캠페인 삭제 실패:', deleteError);
        throw deleteError;
      }

      console.log('✅ 캠페인 삭제 완료 (seminar_slots도 CASCADE로 자동 삭제됨)');

      console.log('🎉 캠페인 삭제 완료!');

      // localStorage에서도 설정 제거
      const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
      delete settings[campaignId];
      localStorage.setItem('campaign_settings', JSON.stringify(settings));

      showToast('캠페인이 삭제되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('💥 캠페인 삭제 실패:', error);
      console.error('전체 에러:', JSON.stringify(error, null, 2));
      showToast(`삭제에 실패했습니다: ${error.message}`, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 컨설팅 슬롯 생성 (배치)
  const createConsultingSlots = async (campaignId, slots) => {
    try {
      setLoading(true);

      const slotsToInsert = slots.map((slot) => ({
        linked_seminar_id: campaignId,
        date: slot.date,
        time: slot.time,
        location: slot.location,
        max_capacity: slot.capacity,
        day_of_week: slot.dayOfWeek,
        is_available: slot.isAvailable !== undefined ? slot.isAvailable : true,
        consultant_type: slot.consultantType || 'ceo',
      }));

      const { error } = await supabase.from('consulting_slots').insert(slotsToInsert);

      if (error) throw error;

      showToast(`${slots.length}개의 슬롯이 추가되었습니다.`, 'success');
      return true;
    } catch (error) {
      console.error('슬롯 생성 실패:', error);
      showToast('슬롯 추가에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 컨설팅 슬롯 수정
  const updateConsultingSlot = async (slotId, slotData) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('consulting_slots')
        .update(slotData)
        .eq('id', slotId);

      if (error) throw error;

      showToast('슬롯이 수정되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('슬롯 수정 실패:', error);
      showToast('슬롯 수정에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 컨설팅 슬롯 삭제
  const deleteConsultingSlot = async (slotId) => {
    try {
      setLoading(true);

      // 1. 해당 슬롯에 연결된 컨설팅 예약 ID 조회
      const { data: reservations } = await supabase
        .from('consulting_reservations')
        .select('id')
        .eq('slot_id', slotId);

      const reservationIds = reservations?.map(r => r.id) || [];

      // 2. 연결된 진단검사 예약 삭제 (있는 경우)
      if (reservationIds.length > 0) {
        await supabase
          .from('test_reservations')
          .delete()
          .in('consulting_reservation_id', reservationIds);

        // 3. 컨설팅 예약 삭제
        await supabase
          .from('consulting_reservations')
          .delete()
          .eq('slot_id', slotId);
      }

      // 4. 컨설팅 슬롯 삭제
      const { error } = await supabase.from('consulting_slots').delete().eq('id', slotId);

      if (error) throw error;

      showToast('슬롯이 삭제되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('슬롯 삭제 실패:', error);
      showToast('슬롯 삭제에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 진단검사 슬롯 생성 (배치)
  // ⭐ 캠페인별 분리: campaign_id로 슬롯을 캠페인에 연결
  const createTestSlots = async (campaignId, slots) => {
    try {
      setLoading(true);

      const slotsToInsert = slots.map((slot) => ({
        date: slot.date,
        time: slot.time,
        location: slot.location,
        max_capacity: slot.capacity,
        current_bookings: 0,
        status: 'active',
        campaign_id: campaignId, // ⭐ 캠페인 ID 추가
      }));

      const { error } = await supabase.from('test_slots').insert(slotsToInsert);

      if (error) throw error;

      showToast(`${slots.length}개의 검사 슬롯이 추가되었습니다.`, 'success');
      return true;
    } catch (error) {
      console.error('검사 슬롯 생성 실패:', error);
      showToast('검사 슬롯 추가에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 진단검사 슬롯 삭제
  const deleteTestSlot = async (slotId) => {
    try {
      setLoading(true);

      const { error, count } = await supabase
        .from('test_slots')
        .delete({ count: 'exact' })
        .eq('id', slotId);

      if (error) throw error;

      if (count === 0) {
        showToast('삭제 권한이 없거나 슬롯을 찾을 수 없습니다. RLS 설정을 확인해주세요.', 'error');
        return false;
      }

      showToast('검사 슬롯이 삭제되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('검사 슬롯 삭제 실패:', error);
      showToast('검사 슬롯 삭제에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 진단검사 슬롯 수정
  const updateTestSlot = async (slotId, slotData) => {
    try {
      setLoading(true);

      // ⭐ .select()로 실제 영향받은 row 확인
      //    RLS UPDATE 정책 미설정 시 에러 없이 0 row 반환되므로
      //    이를 실패로 감지하여 관리자에게 안내
      const { data, error } = await supabase
        .from('test_slots')
        .update(slotData)
        .eq('id', slotId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        console.error('검사 슬롯 수정: 0 row 업데이트 (RLS UPDATE 정책 누락 가능성)');
        showToast(
          "검사 슬롯 수정이 반영되지 않았습니다. DB RLS 정책을 확인해주세요. " +
            "(add_slot_update_delete_rls_policies.sql 실행 필요)",
          'error'
        );
        return false;
      }

      showToast('검사 슬롯이 수정되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('검사 슬롯 수정 실패:', error);
      showToast('검사 슬롯 수정에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 설명회 슬롯 관리
  // ========================================

  // 설명회 슬롯 생성 (배치)
  const createSeminarSlots = async (campaignId, slots) => {
    try {
      setLoading(true);

      const slotsToInsert = slots.map((slot, index) => ({
        campaign_id: campaignId,
        session_number: slot.session_number || index + 1,
        title: slot.title || null,
        date: slot.date,
        time: slot.time,
        location: slot.location,
        max_capacity: slot.max_capacity || 100,
        display_capacity: slot.display_capacity || slot.max_capacity || 100,
        current_bookings: 0,
        status: 'active',
        test_method: slot.test_method || 'home',
      }));

      const { error } = await supabase.from('seminar_slots').insert(slotsToInsert);

      if (error) throw error;

      showToast(`${slots.length}개의 설명회 슬롯이 추가되었습니다.`, 'success');
      return true;
    } catch (error) {
      console.error('설명회 슬롯 생성 실패:', error);
      showToast('설명회 슬롯 추가에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 설명회 슬롯 수정
  const updateSeminarSlot = async (slotId, slotData) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('seminar_slots')
        .update(slotData)
        .eq('id', slotId);

      if (error) throw error;

      showToast('설명회 슬롯이 수정되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('설명회 슬롯 수정 실패:', error);
      showToast('설명회 슬롯 수정에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 설명회 슬롯 삭제
  const deleteSeminarSlot = async (slotId) => {
    try {
      setLoading(true);

      // 해당 슬롯에 예약이 있는지 확인
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('seminar_slot_id', slotId);

      if (count > 0) {
        showToast('예약이 있는 슬롯은 삭제할 수 없습니다.', 'error');
        return false;
      }

      const { error } = await supabase.from('seminar_slots').delete().eq('id', slotId);

      if (error) throw error;

      showToast('설명회 슬롯이 삭제되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('설명회 슬롯 삭제 실패:', error);
      showToast('설명회 슬롯 삭제에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 자동 슬롯 오픈 체크 (컨설팅 예약 생성 시 호출)
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
        .eq('linked_seminar_id', campaignId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (slotsError) throw slotsError;
      if (!allSlots || allSlots.length === 0) {
        console.log('⏭️ 슬롯이 없습니다.');
        return;
      }

      // 2. 현재 오픈된 슬롯만 필터링 (is_available = true)
      const availableSlots = allSlots.filter((slot) => slot.is_available);

      // 3. 각 슬롯의 예약 수 조회 (slot_id 기반)
      const slotIdList = allSlots.map(s => s.id);
      const { data: reservations, error: reservationsError } = await supabase
        .from('consulting_reservations')
        .select('slot_id')
        .in('slot_id', slotIdList)
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

      // 7. 다음 날짜의 슬롯 찾기 (is_available = false인 것 중 가장 빠른 날짜)
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
      showToast(
        `잔여 슬롯이 ${threshold}개 이하가 되어 ${nextDate} 날짜의 ${slotIdsToOpen.length}개 슬롯이 자동 오픈되었습니다.`,
        'success'
      );
    } catch (error) {
      console.error('❌ 자동 슬롯 오픈 체크 실패:', error);
      // 실패해도 예약은 계속 진행되도록 에러를 던지지 않음
    }
  };

  // 설명회 예약 상태 업데이트
  const updateReservationStatus = async (reservationId, newStatus) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', reservationId);

      if (error) throw error;

      showToast('상태가 변경되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      showToast('상태 변경에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 설명회 예약 정보 업데이트 (학생 정보 수정)
  const updateReservationInfo = async (reservationId, updateData) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', reservationId);

      if (error) throw error;

      showToast('정보가 수정되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('정보 업데이트 실패:', error);
      showToast('정보 수정에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 컨설팅 예약 일정 변경
  // ========================================

  const changeConsultingSlot = async (reservationId, oldSlotId, newSlotId) => {
    try {
      setLoading(true);
      console.log('📅 컨설팅 일정 변경 시작:', { reservationId, oldSlotId, newSlotId });

      // 1. 새 슬롯 정보 조회
      const { data: newSlot, error: slotError } = await supabase
        .from('consulting_slots')
        .select('*')
        .eq('id', newSlotId)
        .single();

      if (slotError) throw slotError;

      // 2. 새 슬롯의 실제 예약 수 확인 (취소 상태 제외)
      const { count: actualBookings, error: countError } = await supabase
        .from('consulting_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', newSlotId)
        .not('status', 'in', '(cancelled,auto_cancelled,취소)');

      if (countError) throw countError;

      if (actualBookings >= newSlot.max_capacity) {
        showToast('선택한 슬롯이 이미 만석입니다.', 'error');
        return false;
      }

      // 3. 예약의 slot_id 변경
      const { error: updateError } = await supabase
        .from('consulting_reservations')
        .update({ slot_id: newSlotId })
        .eq('id', reservationId);

      if (updateError) throw updateError;

      // 4. 기존 슬롯의 current_bookings 재계산 (실제 예약 수 기반)
      const { count: oldSlotActualBookings } = await supabase
        .from('consulting_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', oldSlotId)
        .not('status', 'in', '(cancelled,auto_cancelled,취소)');

      await supabase
        .from('consulting_slots')
        .update({ current_bookings: oldSlotActualBookings || 0 })
        .eq('id', oldSlotId);

      // 5. 새 슬롯의 current_bookings 재계산 (실제 예약 수 기반)
      const { count: newSlotActualBookings } = await supabase
        .from('consulting_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', newSlotId)
        .not('status', 'in', '(cancelled,auto_cancelled,취소)');

      await supabase
        .from('consulting_slots')
        .update({ current_bookings: newSlotActualBookings || 0 })
        .eq('id', newSlotId);

      console.log('✅ 컨설팅 일정 변경 완료');
      showToast('컨설팅 일정이 변경되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('❌ 컨설팅 일정 변경 실패:', error);
      showToast('일정 변경에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 비밀번호 일괄 초기화
  // ========================================

  const resetAllPasswords = async (campaignId) => {
    try {
      setLoading(true);
      const defaultPassword = hashPassword('000000');
      let resetCount = 0;

      // 1. 해당 캠페인의 설명회 슬롯 ID 조회
      const { data: seminarSlots } = await supabase
        .from('seminar_slots')
        .select('id')
        .eq('campaign_id', campaignId);

      const seminarSlotIds = seminarSlots?.map(s => s.id) || [];

      // 2. 설명회 예약자 비밀번호 초기화
      if (seminarSlotIds.length > 0) {
        const { count, error: resError } = await supabase
          .from('reservations')
          .update({ password: defaultPassword }, { count: 'exact' })
          .in('seminar_slot_id', seminarSlotIds);

        if (resError) throw resError;
        resetCount += count || 0;
      }

      // 3. 해당 캠페인의 컨설팅 슬롯 ID 조회
      const { data: consultingSlots } = await supabase
        .from('consulting_slots')
        .select('id')
        .eq('linked_seminar_id', campaignId);

      const consultingSlotIds = consultingSlots?.map(s => s.id) || [];

      // 4. 컨설팅 예약자 비밀번호 초기화
      if (consultingSlotIds.length > 0) {
        const { count, error: conError } = await supabase
          .from('consulting_reservations')
          .update({ password: defaultPassword }, { count: 'exact' })
          .in('slot_id', consultingSlotIds);

        if (conError) throw conError;
        resetCount += count || 0;
      }

      showToast(`총 ${resetCount}건의 비밀번호가 초기화되었습니다.`, 'success');
      return true;
    } catch (error) {
      console.error('비밀번호 초기화 실패:', error);
      showToast('비밀번호 초기화에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    authMode,
    allowedCampaignId,
    loading,
    toast,
    showToast,
    hideToast,
    login,
    logout,
    loadCampaigns,
    loadCampaignDetail,
    updateConsultingResult,
    updateCampaign,
    createCampaign,
    deleteCampaign,
    createSeminarSlots,
    updateSeminarSlot,
    deleteSeminarSlot,
    createConsultingSlots,
    updateConsultingSlot,
    deleteConsultingSlot,
    createTestSlots,
    updateTestSlot,
    deleteTestSlot,
    checkAndOpenNextSlots,
    updateReservationStatus,
    updateReservationInfo,
    changeConsultingSlot,
    resetAllPasswords,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
