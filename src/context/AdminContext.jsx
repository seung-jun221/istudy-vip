import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AdminContext = createContext();

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}

export function AdminProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // 로컬스토리지에서 인증 상태 복원
  useEffect(() => {
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 로그인
  const login = (password) => {
    // 환경변수에서 비밀번호 가져오기 (없으면 기본값)
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1234';

    if (password === adminPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_authenticated', 'true');
      return true;
    }
    return false;
  };

  // 로그아웃
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
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

  // 모든 캠페인 조회
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seminars')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;

      // 각 캠페인별 통계 계산
      const campaignsWithStats = await Promise.all(
        data.map(async (campaign) => {
          // 설명회 참석자 수
          const { count: attendeeCount } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('seminar_id', campaign.id)
            .in('status', ['예약', '참석']);

          // 컨설팅 예약 수 (설명회 참석자 기준)
          const { count: consultingCount } = await supabase
            .from('consulting_reservations')
            .select('*', { count: 'exact', head: true })
            .eq('linked_seminar_id', campaign.id);

          // 진단검사 예약 수 (consulting_reservations를 통해 간접적으로 조회)
          const { data: consultingIds } = await supabase
            .from('consulting_reservations')
            .select('id')
            .eq('linked_seminar_id', campaign.id);

          const consultingIdList = consultingIds?.map(c => c.id) || [];

          const { count: testCount } = consultingIdList.length > 0
            ? await supabase
                .from('test_reservations')
                .select('*', { count: 'exact', head: true })
                .in('consulting_reservation_id', consultingIdList)
            : { count: 0 };

          // 최종 등록 수 (등록여부가 '확정'인 경우)
          const { count: enrolledCount } = await supabase
            .from('consulting_reservations')
            .select('*', { count: 'exact', head: true })
            .eq('linked_seminar_id', campaign.id)
            .eq('enrollment_status', '확정');

          return {
            ...campaign,
            stats: {
              attendees: attendeeCount || 0,
              consultings: consultingCount || 0,
              tests: testCount || 0,
              enrolled: enrolledCount || 0,
            },
          };
        })
      );

      return campaignsWithStats;
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

      // 1. 캠페인 기본 정보
      console.log('1️⃣ 캠페인 기본 정보 조회...');
      const { data: campaign, error: campaignError } = await supabase
        .from('seminars')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) {
        console.error('❌ 캠페인 기본 정보 조회 실패:', campaignError);
        throw campaignError;
      }
      console.log('✅ 캠페인 정보:', campaign);

      // 2. 설명회 참석자 목록
      console.log('2️⃣ 설명회 참석자 조회...');
      const { data: attendees, error: attendeesError } = await supabase
        .from('reservations')
        .select('*')
        .eq('seminar_id', campaignId)
        .order('id', { ascending: false });

      if (attendeesError) {
        console.error('❌ 참석자 조회 실패:', attendeesError);
        throw attendeesError;
      }
      console.log('✅ 참석자 수:', attendees?.length || 0);

      // 3. 컨설팅 예약 목록 (취소된 예약 제외)
      console.log('3️⃣ 컨설팅 예약 조회...');
      const { data: consultings, error: consultingsError } = await supabase
        .from('consulting_reservations')
        .select('*')
        .eq('linked_seminar_id', campaignId)
        .neq('status', 'cancelled') // 취소된 예약 제외
        .order('id', { ascending: false });

      if (consultingsError) {
        console.error('❌ 컨설팅 조회 실패:', consultingsError);
        throw consultingsError;
      }
      console.log('✅ 컨설팅 예약 수:', consultings?.length || 0);

      // 3-1. 컨설팅 슬롯 정보 추가
      const consultingsWithSlots = await Promise.all(
        (consultings || []).map(async (consulting) => {
          if (consulting.slot_id) {
            const { data: slot } = await supabase
              .from('consulting_slots')
              .select('*')
              .eq('id', consulting.slot_id)
              .single();
            return { ...consulting, consulting_slots: slot };
          }
          return consulting;
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

      // 4. 진단검사 예약 목록 (consulting_reservations를 통해 간접 조회)
      console.log('4️⃣ 진단검사 예약 조회...');

      // 4-1. 해당 캠페인의 컨설팅 예약 ID 목록 조회
      const consultingIdList = consultingsWithSlots?.map(c => c.id) || [];

      let tests = [];
      if (consultingIdList.length > 0) {
        const { data: testsData, error: testsError } = await supabase
          .from('test_reservations')
          .select('*')
          .in('consulting_reservation_id', consultingIdList)
          .order('id', { ascending: false });

        if (testsError) {
          console.error('❌ 진단검사 조회 실패:', testsError);
          throw testsError;
        }
        tests = testsData || [];
      }

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
      console.log('4️⃣-3 모든 진단검사 슬롯 조회...');
      const { data: allTestSlots, error: testSlotsError } = await supabase
        .from('test_slots')
        .select('*')
        .eq('linked_seminar_id', campaignId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (testSlotsError) {
        console.error('❌ 진단검사 슬롯 조회 실패:', testSlotsError);
      }
      console.log('✅ 진단검사 슬롯 수:', allTestSlots?.length || 0);

      console.log('🎉 캠페인 상세 조회 완료!');
      return {
        campaign,
        attendees: attendees || [],
        consultings: consultingsWithSlots || [],
        consultingSlots: allConsultingSlots || [],
        tests: testsWithSlots || [],
        testSlots: allTestSlots || [],
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

      // ID 생성 (날짜 기반)
      const id = `seminar_${Date.now()}`;

      console.log('📝 캠페인 생성 시작:', { id, ...campaignData });

      const { error } = await supabase.from('seminars').insert({
        id,
        title: campaignData.title,
        date: campaignData.date,
        time: campaignData.time,
        location: campaignData.location,
        max_capacity: campaignData.max_capacity || 100,
        display_capacity: campaignData.display_capacity || campaignData.max_capacity || 100,
        status: campaignData.status || 'active',
      });

      if (error) {
        console.error('❌ 캠페인 생성 DB 오류:', error);
        throw error;
      }

      console.log('✅ 캠페인 기본 정보 생성 완료');

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

        const { error: methodError } = await supabase
          .from('test_methods')
          .insert({
            location: campaignData.location,
            method: campaignData.testMethod, // 'home' or 'onsite'
            description: campaignData.testMethod === 'home' ? '가정 셀프 테스트' : '방문 진단검사',
          });

        if (methodError && methodError.code !== '23505') { // 중복 키 에러는 무시 (이미 존재)
          console.error('❌ 진단검사 방식 저장 실패:', methodError);
          // 진단검사 방식은 실패해도 캠페인은 생성됨
        }
      }

      // 방문 진단검사 슬롯 생성
      if (campaignData.testMethod === 'onsite' && campaignData.testSlots && campaignData.testSlots.length > 0) {
        console.log('🧪 진단검사 슬롯 생성 중:', campaignData.testSlots.length + '개');

        const testSlotsToInsert = campaignData.testSlots.map(slot => ({
          date: slot.date,
          time: slot.time,
          location: campaignData.location,
          max_capacity: slot.capacity || 1,
          current_bookings: 0,
          status: 'active',
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

      const { error } = await supabase
        .from('seminars')
        .update(campaignData)
        .eq('id', campaignId);

      if (error) throw error;

      showToast('캠페인 정보가 업데이트되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('캠페인 업데이트 실패:', error);
      showToast('업데이트에 실패했습니다.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('seminars')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      showToast('캠페인이 삭제되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('캠페인 삭제 실패:', error);
      showToast('삭제에 실패했습니다.', 'error');
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
        is_available: true,
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
  const createTestSlots = async (campaignId, slots) => {
    try {
      setLoading(true);

      const slotsToInsert = slots.map((slot) => ({
        linked_seminar_id: campaignId,
        date: slot.date,
        time: slot.time,
        location: slot.location,
        max_capacity: slot.capacity,
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

      const { error } = await supabase.from('test_slots').delete().eq('id', slotId);

      if (error) throw error;

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

  const value = {
    isAuthenticated,
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
    createConsultingSlots,
    updateConsultingSlot,
    deleteConsultingSlot,
    createTestSlots,
    deleteTestSlot,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
