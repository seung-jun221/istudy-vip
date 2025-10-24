import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import CreateCampaignModal from '../../components/admin/CreateCampaignModal';
import './CampaignList.css';

export default function CampaignList() {
  const navigate = useNavigate();
  const { logout, loadCampaigns } = useAdmin();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const data = await loadCampaigns();
    setCampaigns(data);
    setLoading(false);
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/admin/login');
    }
  };

  const handleCloseModal = (updated) => {
    setShowCreateModal(false);
    if (updated) {
      fetchCampaigns(); // 캠페인 목록 새로고침
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  return (
    <div className="campaign-list-container">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-title">
            <img
              src="/assets/images/istudy-logo.png"
              alt="아이스터디"
              className="admin-logo"
            />
            <h1>통합 예약관리 시스템</h1>
          </div>
          <div className="admin-header-actions">
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + 신규 캠페인 추가
            </button>
            <button className="btn btn-secondary" onClick={fetchCampaigns}>
              새로고침
            </button>
            <button className="btn btn-outline" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="campaign-list-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>캠페인 로드 중...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <p>등록된 캠페인이 없습니다.</p>
          </div>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`campaign-card ${campaign.status === 'inactive' ? 'campaign-card-inactive' : ''}`}
                onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
              >
                <div className="campaign-card-header">
                  <div className="campaign-title">
                    {campaign.title || campaign.location}
                  </div>
                  <span
                    className={`campaign-status ${campaign.status === 'active' ? 'active' : 'inactive'}`}
                  >
                    {campaign.status === 'active' ? '진행중' : '종료'}
                  </span>
                </div>

                <div className="campaign-info">
                  <div className="info-row">
                    <span className="info-label">날짜:</span>
                    <span className="info-value">{formatDate(campaign.date)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">시간:</span>
                    <span className="info-value">{formatTime(campaign.time)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">장소:</span>
                    <span className="info-value">{campaign.location}</span>
                  </div>
                </div>

                <div className="campaign-stats">
                  <div className="stat-item">
                    <div className="stat-value">{campaign.stats.attendees}</div>
                    <div className="stat-label">설명회 예약</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{campaign.stats.consultings}</div>
                    <div className="stat-label">컨설팅 예약</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{campaign.stats.tests}</div>
                    <div className="stat-label">진단검사</div>
                  </div>
                  <div className="stat-item highlight">
                    <div className="stat-value">{campaign.stats.enrolled}</div>
                    <div className="stat-label">최종 등록</div>
                  </div>
                </div>

                <div className="campaign-card-footer">
                  <button className="btn-link">상세 보기 →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 신규 캠페인 생성 모달 */}
      {showCreateModal && <CreateCampaignModal onClose={handleCloseModal} />}
    </div>
  );
}
