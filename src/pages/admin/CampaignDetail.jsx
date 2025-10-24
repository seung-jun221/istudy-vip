import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import AttendeesTab from '../../components/admin/AttendeesTab';
import ConsultingsTab from '../../components/admin/ConsultingsTab';
import TestsTab from '../../components/admin/TestsTab';
import SettingsTab from '../../components/admin/SettingsTab';
import './CampaignDetail.css';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadCampaignDetail, authMode, logout } = useAdmin();

  const [activeTab, setActiveTab] = useState('attendees');
  const [campaignData, setCampaignData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignDetail();
  }, [id]);

  const fetchCampaignDetail = async () => {
    setLoading(true);
    const data = await loadCampaignDetail(id);
    if (data) {
      setCampaignData(data);
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  if (loading) {
    return (
      <div className="campaign-detail-loading">
        <div className="spinner"></div>
        <p>캠페인 정보 로드 중...</p>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="campaign-detail-error">
        <p>캠페인 정보를 불러올 수 없습니다.</p>
        <button className="btn btn-primary" onClick={() => navigate('/admin/campaigns')}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const { campaign, attendees, consultings, consultingSlots, tests, testSlots } = campaignData;

  // 통계 계산
  const stats = {
    attendees: attendees.length,
    consultings: consultings.length,
    tests: tests.length,
    enrolled: consultings.filter((c) => c.enrollment_status === '확정').length,
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/admin/login');
    }
  };

  return (
    <div className="campaign-detail-container">
      {/* 헤더 */}
      <header className="campaign-detail-header">
        {authMode === 'super' ? (
          <button className="btn-back" onClick={() => navigate('/admin/campaigns')}>
            ← 목록으로
          </button>
        ) : (
          <button className="btn-back" onClick={handleLogout}>
            로그아웃
          </button>
        )}
        <div className="campaign-header-info">
          <h1>{campaign.title || campaign.location}</h1>
          <p>
            {formatDate(campaign.date)} {formatTime(campaign.time)} | {campaign.location}
          </p>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'attendees' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendees')}
        >
          설명회 예약자 ({stats.attendees})
        </button>
        <button
          className={`tab-btn ${activeTab === 'consultings' ? 'active' : ''}`}
          onClick={() => setActiveTab('consultings')}
        >
          컨설팅 현황 ({stats.consultings})
        </button>
        <button
          className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          진단검사 예약 ({stats.tests})
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          캠페인 설정
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="tab-content">
        {activeTab === 'attendees' && <AttendeesTab attendees={attendees} campaign={campaign} />}
        {activeTab === 'consultings' && (
          <ConsultingsTab
            consultings={consultings}
            consultingSlots={consultingSlots}
            onUpdate={fetchCampaignDetail}
          />
        )}
        {activeTab === 'tests' && <TestsTab tests={tests} testSlots={testSlots} />}
        {activeTab === 'settings' && (
          <SettingsTab
            campaign={campaign}
            consultingSlots={consultingSlots}
            testSlots={testSlots}
            onUpdate={fetchCampaignDetail}
          />
        )}
      </div>
    </div>
  );
}
