import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './ConsultingResultModal.css';

export default function CreateCampaignModal({ onClose }) {
  const { createCampaign } = useAdmin();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    max_capacity: 100,
    display_capacity: 100,
    status: 'active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    // 필수 입력 검증
    if (!formData.title || !formData.date || !formData.time || !formData.location) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setSaving(true);

    const success = await createCampaign({
      ...formData,
      max_capacity: parseInt(formData.max_capacity),
      display_capacity: parseInt(formData.display_capacity),
    });

    setSaving(false);

    if (success) {
      onClose(true); // true를 전달하여 새로고침 필요함을 알림
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>새 캠페인 생성</h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* 설명회명 */}
          <div className="form-group">
            <label className="form-label">
              설명회명 <span className="required">*</span>
            </label>
            <input
              type="text"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              placeholder="예: i.study VIP 수학설명회"
            />
          </div>

          {/* 날짜 */}
          <div className="form-group">
            <label className="form-label">
              날짜 <span className="required">*</span>
            </label>
            <input
              type="date"
              name="date"
              className="form-input"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          {/* 시간 */}
          <div className="form-group">
            <label className="form-label">
              시간 <span className="required">*</span>
            </label>
            <input
              type="time"
              name="time"
              className="form-input"
              value={formData.time}
              onChange={handleChange}
            />
          </div>

          {/* 장소 */}
          <div className="form-group">
            <label className="form-label">
              장소 <span className="required">*</span>
            </label>
            <input
              type="text"
              name="location"
              className="form-input"
              value={formData.location}
              onChange={handleChange}
              placeholder="예: 분당점, 대치점"
            />
          </div>

          {/* 정원 (실제) */}
          <div className="form-group">
            <label className="form-label">정원 (실제 수용 인원)</label>
            <input
              type="number"
              name="max_capacity"
              className="form-input"
              value={formData.max_capacity}
              onChange={handleChange}
              min="1"
            />
            <div className="form-hint">실제로 수용 가능한 최대 인원 수입니다.</div>
          </div>

          {/* 정원 (노출용) */}
          <div className="form-group">
            <label className="form-label">정원 (노출용)</label>
            <input
              type="number"
              name="display_capacity"
              className="form-input"
              value={formData.display_capacity}
              onChange={handleChange}
              min="1"
            />
            <div className="form-hint">
              고객에게 보여지는 정원 수입니다. 실제보다 작게 설정 가능합니다.
            </div>
          </div>

          {/* 상태 */}
          <div className="form-group">
            <label className="form-label">상태</label>
            <select
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">진행중</option>
              <option value="inactive">종료</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => onClose(false)}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
