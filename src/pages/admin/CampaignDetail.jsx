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
  const { loadCampaignDetail } = useAdmin();

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

  return (
    <div className="campaign-detail-container">
      {/* 헤더 */}
      <header className="campaign-detail-header">
        <button className="btn-back" onClick={() => navigate('/admin/campaigns')}>
          ← 목록으로
        </button>
        <div className="campaign-header-info">
          <h1>{campaign.title || campaign.location}</h1>
          <p>
            {formatDate(campaign.date)} {formatTime(campaign.time)} | {campaign.location}
          </p>
        </div>
      </header>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats.attendees}</div>
            <div className="stat-label">설명회 참석</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{stats.consultings}</div>
            <div className="stat-label">컨설팅 예약</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-number">{stats.tests}</div>
            <div className="stat-label">진단검사 예약</div>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.enrolled}</div>
            <div className="stat-label">최종 등록</div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'attendees' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendees')}
        >
          설명회 참석자 ({stats.attendees})
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
        {activeTab === 'attendees' && <AttendeesTab attendees={attendees} />}
        {activeTab === 'consultings' && (
          <ConsultingsTab
            consultings={consultings}
            consultingSlots={consultingSlots}
            onUpdate={fetchCampaignDetail}
          />
        )}
        {activeTab === 'tests' && <TestsTab tests={tests} />}
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
