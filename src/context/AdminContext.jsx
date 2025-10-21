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

          // 진단검사 예약 수
          const { count: testCount } = await supabase
            .from('test_reservations')
            .select('*', { count: 'exact', head: true })
            .eq('seminar_id', campaign.id);

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

      // 1. 캠페인 기본 정보
      const { data: campaign, error: campaignError } = await supabase
        .from('seminars')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // 2. 설명회 참석자 목록
      const { data: attendees, error: attendeesError } = await supabase
        .from('reservations')
        .select('*')
        .eq('seminar_id', campaignId)
        .order('created_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      // 3. 컨설팅 예약 목록
      const { data: consultings, error: consultingsError } = await supabase
        .from('consulting_reservations')
        .select('*, consulting_slots(*)')
        .eq('linked_seminar_id', campaignId)
        .order('created_at', { ascending: false });

      if (consultingsError) throw consultingsError;

      // 4. 진단검사 예약 목록
      const { data: tests, error: testsError } = await supabase
        .from('test_reservations')
        .select('*, test_slots(*)')
        .eq('seminar_id', campaignId)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      return {
        campaign,
        attendees: attendees || [],
        consultings: consultings || [],
        tests: tests || [],
      };
    } catch (error) {
      console.error('캠페인 상세 조회 실패:', error);
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
          consultant_notes: resultData.notes,
          enrollment_status: resultData.enrollmentStatus, // 미정/확정/불가
          result_written_at: new Date().toISOString(),
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

  const createCampaign = async (campaignData) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('seminars')
        .insert([campaignData])
        .select()
        .single();

      if (error) throw error;

      showToast('새 캠페인이 생성되었습니다.', 'success');
      return data;
    } catch (error) {
      console.error('캠페인 생성 실패:', error);
      showToast('캠페인 생성에 실패했습니다.', 'error');
      return null;
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
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
