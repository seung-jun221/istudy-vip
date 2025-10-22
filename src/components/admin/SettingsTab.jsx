import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './AdminTabs.css';
import './SettingsTab.css';

export default function SettingsTab({ campaign, onUpdate }) {
  const { updateCampaign } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: campaign.title || '',
    date: campaign.date || '',
    time: campaign.time || '',
    location: campaign.location || '',
    max_capacity: campaign.max_capacity || 0,
    display_capacity: campaign.display_capacity || campaign.max_capacity || 0,
    status: campaign.status || 'active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    const success = await updateCampaign(campaign.id, formData);

    setSaving(false);

    if (success) {
      setEditing(false);
      onUpdate(); // 부모 컴포넌트에서 데이터 새로고침
    }
  };

  const handleCancel = () => {
    setFormData({
      title: campaign.title || '',
      date: campaign.date || '',
      time: campaign.time || '',
      location: campaign.location || '',
      max_capacity: campaign.max_capacity || 0,
      display_capacity: campaign.display_capacity || campaign.max_capacity || 0,
      status: campaign.status || 'active',
    });
    setEditing(false);
  };

  return (
    <div className="tab-container settings-tab">
      <div className="settings-header">
        <h3>캠페인 기본 설정</h3>
        {!editing && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            수정하기
          </button>
        )}
      </div>

      <div className="settings-form">
        {/* 설명회명 */}
        <div className="form-group">
          <label className="form-label">설명회명</label>
          {editing ? (
            <input
              type="text"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              placeholder="예: i.study VIP 수학설명회"
            />
          ) : (
            <div className="form-value">{campaign.title || '-'}</div>
          )}
        </div>

        {/* 날짜 */}
        <div className="form-group">
          <label className="form-label">날짜</label>
          {editing ? (
            <input
              type="date"
              name="date"
              className="form-input"
              value={formData.date}
              onChange={handleChange}
            />
          ) : (
            <div className="form-value">{campaign.date}</div>
          )}
        </div>

        {/* 시간 */}
        <div className="form-group">
          <label className="form-label">시간</label>
          {editing ? (
            <input
              type="time"
              name="time"
              className="form-input"
              value={formData.time}
              onChange={handleChange}
            />
          ) : (
            <div className="form-value">{campaign.time}</div>
          )}
        </div>

        {/* 장소 */}
        <div className="form-group">
          <label className="form-label">장소</label>
          {editing ? (
            <input
              type="text"
              name="location"
              className="form-input"
              value={formData.location}
              onChange={handleChange}
              placeholder="예: 분당점, 대치점"
            />
          ) : (
            <div className="form-value">{campaign.location}</div>
          )}
        </div>

        {/* 정원 (실제 수용 인원) */}
        <div className="form-group">
          <label className="form-label">정원 (실제 수용 인원)</label>
          {editing ? (
            <input
              type="number"
              name="max_capacity"
              className="form-input"
              value={formData.max_capacity}
              onChange={handleChange}
              min="0"
            />
          ) : (
            <div className="form-value">{campaign.max_capacity}명</div>
          )}
          <div className="form-hint">실제로 수용 가능한 최대 인원 수입니다.</div>
        </div>

        {/* 정원 (노출용) */}
        <div className="form-group">
          <label className="form-label">정원 (노출용)</label>
          {editing ? (
            <input
              type="number"
              name="display_capacity"
              className="form-input"
              value={formData.display_capacity}
              onChange={handleChange}
              min="0"
            />
          ) : (
            <div className="form-value">
              {campaign.display_capacity || campaign.max_capacity}명
            </div>
          )}
          <div className="form-hint">
            고객에게 보여지는 정원 수입니다. 실제보다 작게 설정 가능합니다.
          </div>
        </div>

        {/* 상태 */}
        <div className="form-group">
          <label className="form-label">상태</label>
          {editing ? (
            <select
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">진행중</option>
              <option value="inactive">종료</option>
            </select>
          ) : (
            <div className="form-value">
              <span className={`status-badge status-${campaign.status}`}>
                {campaign.status === 'active' ? '진행중' : '종료'}
              </span>
            </div>
          )}
        </div>

        {/* 버튼 영역 */}
        {editing && (
          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              취소
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>

      {/* 추가 정보 섹션 */}
      <div className="settings-info-section">
        <h3>슬롯 관리</h3>
        <p className="info-text">
          컨설팅 슬롯 및 진단검사 슬롯은 Supabase 대시보드에서 직접 관리하세요.
        </p>
        <div className="info-box">
          <div className="info-item">
            <strong>컨설팅 슬롯 테이블:</strong> consulting_slots
          </div>
          <div className="info-item">
            <strong>진단검사 슬롯 테이블:</strong> test_slots
          </div>
        </div>
      </div>
    </div>
  );
}
