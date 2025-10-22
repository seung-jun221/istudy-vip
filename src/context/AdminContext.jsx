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
          // 설명회 예약 수
          const { count: attendeeCount } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('seminar_id', campaign.id)
            .in('status', ['예약', '참석']);

          // 컨설팅 예약 수 (취소 제외)
          const { count: consultingCount } = await supabase
            .from('consulting_reservations')
            .select('*', { count: 'exact', head: true })
            .eq('linked_seminar_id', campaign.id)
            .neq('status', 'cancelled');

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
      // 주의: test_slots는 location 기반으로 작동 (캠페인이 아닌 장소별로 관리됨)
      console.log('4️⃣-3 모든 진단검사 슬롯 조회...');
      const { data: allTestSlots, error: testSlotsError } = await supabase
        .from('test_slots')
        .select('*')
        .eq('location', campaign.location)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (testSlotsError) {
        console.error('❌ 진단검사 슬롯 조회 실패:', testSlotsError);
      }
      console.log('✅ 진단검사 슬롯 수 (location 기준):', allTestSlots?.length || 0);

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

      console.log('📝 캠페인 생성 시작:', campaignData);

      // seminars 테이블에 삽입하고 생성된 ID를 반환받음
      const { data: campaignRecord, error } = await supabase
        .from('seminars')
        .insert({
          title: campaignData.title,
          date: campaignData.date,
          time: campaignData.time,
          location: campaignData.location,
          max_capacity: campaignData.max_capacity || 100,
          display_capacity: campaignData.display_capacity || campaignData.max_capacity || 100,
          status: campaignData.status || 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ 캠페인 생성 DB 오류:', error);
        throw error;
      }

      const id = campaignRecord.id; // Supabase가 자동 생성한 UUID 사용
      console.log('✅ 캠페인 기본 정보 생성 완료, ID:', id);

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
      console.log('🗑️ 캠페인 삭제 시작:', campaignId);
      console.log('📊 캠페인 ID 타입:', typeof campaignId, campaignId);

      // 0. 캠페인 정보 조회 (location 정보 필요)
      console.log('0️⃣ 캠페인 정보 조회 중...');
      const { data: campaign, error: campaignFetchError } = await supabase
        .from('seminars')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignFetchError) {
        console.error('❌ 캠페인 정보 조회 실패:', campaignFetchError);
        throw campaignFetchError;
      }

      console.log('✅ 캠페인 정보:', campaign);
      const campaignLocation = campaign.location;

      // 1. 컨설팅 예약 조회 (test_reservations 삭제를 위해)
      console.log('1️⃣ 컨설팅 예약 조회 중...');
      const { data: consultings } = await supabase
        .from('consulting_reservations')
        .select('id')
        .eq('linked_seminar_id', campaignId);

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

      // 3. 컨설팅 예약 삭제
      console.log('3️⃣ 컨설팅 예약 삭제 중...');
      const { error: consultingsError, count: consultingCount } = await supabase
        .from('consulting_reservations')
        .delete({ count: 'exact' })
        .eq('linked_seminar_id', campaignId);

      if (consultingsError) {
        console.error('❌ 컨설팅 예약 삭제 실패:', consultingsError);
        throw consultingsError;
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

      // 5. 설명회 참석자 삭제
      console.log('5️⃣ 설명회 참석자 삭제 중...');
      const { error: attendeesError, count: attendeesCount } = await supabase
        .from('reservations')
        .delete({ count: 'exact' })
        .eq('seminar_id', campaignId);

      if (attendeesError) {
        console.error('❌ 설명회 참석자 삭제 실패:', attendeesError);
        throw attendeesError;
      }
      console.log('✅ 설명회 참석자 삭제 완료:', attendeesCount + '개');

      // 6. 진단검사 방식 삭제 (location 기반 - 다른 캠페인도 같은 location을 사용할 수 있으므로 주의)
      console.log('6️⃣ 진단검사 방식 확인 중 (location: ' + campaignLocation + ')...');

      // 같은 location을 사용하는 다른 캠페인이 있는지 확인
      const { data: otherCampaigns, error: otherCampaignsError } = await supabase
        .from('seminars')
        .select('id')
        .eq('location', campaignLocation)
        .neq('id', campaignId);

      if (otherCampaignsError) {
        console.error('❌ 다른 캠페인 확인 실패:', otherCampaignsError);
      } else if (otherCampaigns && otherCampaigns.length > 0) {
        console.log('⚠️ 같은 location을 사용하는 다른 캠페인이 있어 test_methods는 유지합니다:', otherCampaigns.length + '개');
      } else {
        console.log('🗑️ 같은 location을 사용하는 다른 캠페인이 없으므로 test_methods 삭제...');
        const { error: testMethodsError } = await supabase
          .from('test_methods')
          .delete()
          .eq('location', campaignLocation);

        if (testMethodsError) {
          console.error('⚠️ test_methods 삭제 실패 (무시):', testMethodsError);
          // test_methods 삭제 실패는 무시하고 계속 진행
        } else {
          console.log('✅ test_methods 삭제 완료');
        }
      }

      // 7. 캠페인 자체 삭제
      console.log('7️⃣ 캠페인 자체 삭제 중...');
      console.log('📍 삭제 대상 ID:', campaignId, '(타입:', typeof campaignId + ')');

      const { data: deleteResult, error: deleteError, count: deleteCount } = await supabase
        .from('seminars')
        .delete({ count: 'exact' })
        .eq('id', campaignId)
        .select();

      if (deleteError) {
        console.error('❌ 캠페인 삭제 실패 - 전체 에러 객체:', deleteError);
        console.error('에러 코드:', deleteError.code);
        console.error('에러 메시지:', deleteError.message);
        console.error('에러 details:', deleteError.details);
        console.error('에러 hint:', deleteError.hint);
        throw deleteError;
      }

      console.log('📊 삭제 결과 count:', deleteCount);
      console.log('📊 삭제된 데이터:', deleteResult);

      if (!deleteCount || deleteCount === 0) {
        console.error('⚠️ 캠페인이 삭제되지 않았습니다! (count: ' + deleteCount + ')');
        console.error('캠페인 ID가 존재하지 않거나 이미 삭제되었을 수 있습니다.');

        // 실제로 레코드가 남아있는지 재확인
        const { data: verifyData, error: verifyError } = await supabase
          .from('seminars')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (verifyError && verifyError.code === 'PGRST116') {
          console.log('✅ 캠페인이 존재하지 않음 - 삭제된 것으로 간주');
        } else if (verifyData) {
          console.error('❌ 캠페인이 여전히 존재합니다!', verifyData);
          throw new Error('캠페인 삭제가 실행되었으나 레코드가 남아있습니다.');
        }
      }

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
  // 주의: test_slots는 linked_seminar_id를 사용하지 않고 location 기반으로 작동
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

      // 3. 각 슬롯의 예약 수 조회
      const { data: reservations, error: reservationsError } = await supabase
        .from('consulting_reservations')
        .select('slot_id')
        .eq('linked_seminar_id', campaignId)
        .neq('status', 'cancelled');

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
    checkAndOpenNextSlots,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
