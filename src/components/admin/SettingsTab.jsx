import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import './AdminTabs.css';
import './SettingsTab.css';

export default function SettingsTab({ campaign, consultingSlots, testSlots, onUpdate }) {
  const navigate = useNavigate();
  const {
    updateCampaign,
    createConsultingSlots,
    updateConsultingSlot,
    deleteConsultingSlot,
    createTestSlots,
    deleteTestSlot,
    deleteCampaign,
  } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // localStorage에서 auto_open_threshold 읽기
  const [autoOpenThreshold, setAutoOpenThreshold] = useState(0);

  const [formData, setFormData] = useState({
    title: campaign.title || '',
    date: campaign.date || '',
    time: campaign.time || '',
    location: campaign.location || '',
    max_capacity: campaign.max_capacity || 0,
    display_capacity: campaign.display_capacity || campaign.max_capacity || 0,
    status: campaign.status || 'active',
  });

  // campaign가 업데이트되면 formData도 업데이트
  useEffect(() => {
    setFormData({
      title: campaign.title || '',
      date: campaign.date || '',
      time: campaign.time || '',
      location: campaign.location || '',
      max_capacity: campaign.max_capacity || 0,
      display_capacity: campaign.display_capacity || campaign.max_capacity || 0,
      status: campaign.status || 'active',
    });

    const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
    const threshold = settings[campaign.id]?.auto_open_threshold || 0;
    setAutoOpenThreshold(threshold);
  }, [campaign]);

  // 컨설팅 슬롯 생성기 상태
  const [consultingGenerator, setConsultingGenerator] = useState({
    date: '',
    startTime: '14:00',
    endTime: '17:00',
    location: campaign.location || '',
    capacity: 1,
    isAvailable: true, // 기본값: 즉시 오픈
  });

  // 진단검사 슬롯 생성기 상태
  const [testGenerator, setTestGenerator] = useState({
    date: '',
    time: '14:00',
    location: campaign.location || '',
    capacity: 1,
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

    // auto_open_threshold를 localStorage에 저장
    if (success) {
      const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
      settings[campaign.id] = {
        auto_open_threshold: autoOpenThreshold,
      };
      localStorage.setItem('campaign_settings', JSON.stringify(settings));
    }

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
    // autoOpenThreshold도 원래 값으로 되돌리기
    const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
    const threshold = settings[campaign.id]?.auto_open_threshold || 0;
    setAutoOpenThreshold(threshold);
    setEditing(false);
  };

  // 컨설팅 슬롯 생성기 - 시간대별 슬롯 생성
  const generateConsultingSlots = async () => {
    const { date, startTime, endTime, location, capacity, isAvailable } = consultingGenerator;

    if (!date || !startTime || !endTime || !location) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (startMinutes >= endMinutes) {
      alert('종료시간은 시작시간보다 늦어야 합니다.');
      return;
    }

    // 요일 계산
    const dateObj = new Date(date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = days[dateObj.getDay()];

    const slots = [];
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      slots.push({
        date,
        time: timeStr,
        location,
        capacity,
        dayOfWeek,
        isAvailable,
      });
    }

    const success = await createConsultingSlots(campaign.id, slots);
    if (success) {
      onUpdate(); // 데이터 새로고침
      setConsultingGenerator({
        date: '',
        startTime: '14:00',
        endTime: '17:00',
        location: campaign.location || '',
        capacity: 1,
        isAvailable: true,
      });
    }
  };

  // 컨설팅 슬롯 삭제
  const handleDeleteConsultingSlot = async (slotId) => {
    if (!window.confirm('이 슬롯을 삭제하시겠습니까?')) return;

    const success = await deleteConsultingSlot(slotId);
    if (success) {
      onUpdate();
    }
  };

  // 컨설팅 슬롯 공개/비공개 토글
  const handleToggleSlotAvailability = async (slotId, currentStatus) => {
    const newStatus = !currentStatus;
    const statusText = newStatus ? '공개' : '비공개';

    if (!window.confirm(`이 슬롯을 ${statusText}로 변경하시겠습니까?`)) return;

    const success = await updateConsultingSlot(slotId, { is_available: newStatus });
    if (success) {
      onUpdate();
    }
  };

  // 진단검사 슬롯 추가
  const addTestSlot = async () => {
    const { date, time, location, capacity } = testGenerator;

    if (!date || !time || !location) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    const success = await createTestSlots(campaign.id, [
      { date, time, location, capacity },
    ]);

    if (success) {
      onUpdate();
      setTestGenerator({
        date: '',
        time: '14:00',
        location: campaign.location || '',
        capacity: 1,
      });
    }
  };

  // 진단검사 슬롯 삭제
  const handleDeleteTestSlot = async (slotId) => {
    if (!window.confirm('이 슬롯을 삭제하시겠습니까?')) return;

    const success = await deleteTestSlot(slotId);
    if (success) {
      onUpdate();
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  // 캠페인 삭제
  const handleDeleteCampaign = async () => {
    const confirmText = `"${campaign.title || campaign.location}" 캠페인을 완전히 삭제하시겠습니까?\n\n⚠️ 경고:\n- 관련된 모든 컨설팅 예약이 삭제됩니다\n- 관련된 모든 진단검사 예약이 삭제됩니다\n- 관련된 모든 슬롯이 삭제됩니다\n- 이 작업은 되돌릴 수 없습니다\n\n정말로 삭제하시겠습니까?`;

    if (!window.confirm(confirmText)) {
      return;
    }

    const doubleConfirm = window.prompt(
      '삭제를 진행하려면 "삭제"를 입력하세요:',
      ''
    );

    if (doubleConfirm !== '삭제') {
      alert('삭제가 취소되었습니다.');
      return;
    }

    const success = await deleteCampaign(campaign.id);
    if (success) {
      navigate('/admin/campaigns');
    }
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

        {/* 자동 슬롯 오픈 임계값 */}
        <div className="form-group">
          <label className="form-label">자동 슬롯 오픈 임계값</label>
          {editing ? (
            <input
              type="number"
              className="form-input"
              value={autoOpenThreshold}
              onChange={(e) => setAutoOpenThreshold(parseInt(e.target.value) || 0)}
              min="0"
            />
          ) : (
            <div className="form-value">{autoOpenThreshold}개</div>
          )}
          <div className="form-hint">
            잔여 예약 가능 슬롯 수가 이 값 이하가 되면 다음 날짜의 슬롯이 자동으로
            오픈됩니다. 0으로 설정하면 자동 오픈이 비활성화됩니다.
          </div>
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

      {/* 컨설팅 슬롯 관리 */}
      <div className="settings-section">
        <h3>컨설팅 슬롯 관리</h3>

        {/* 슬롯 생성기 */}
        <div className="slot-generator">
          <h4 className="generator-title">새 슬롯 생성 (30분 간격 자동 생성)</h4>
          <div className="generator-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">날짜</label>
                <input
                  type="date"
                  className="form-input"
                  value={consultingGenerator.date}
                  onChange={(e) =>
                    setConsultingGenerator({ ...consultingGenerator, date: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">시작 시간</label>
                <input
                  type="time"
                  className="form-input"
                  value={consultingGenerator.startTime}
                  onChange={(e) =>
                    setConsultingGenerator({
                      ...consultingGenerator,
                      startTime: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">종료 시간</label>
                <input
                  type="time"
                  className="form-input"
                  value={consultingGenerator.endTime}
                  onChange={(e) =>
                    setConsultingGenerator({ ...consultingGenerator, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">장소</label>
                <input
                  type="text"
                  className="form-input"
                  value={consultingGenerator.location}
                  onChange={(e) =>
                    setConsultingGenerator({ ...consultingGenerator, location: e.target.value })
                  }
                  placeholder="예: 분당점 2층"
                />
              </div>
              <div className="form-group">
                <label className="form-label">정원 (1명 권장)</label>
                <input
                  type="number"
                  className="form-input"
                  value={consultingGenerator.capacity}
                  onChange={(e) =>
                    setConsultingGenerator({
                      ...consultingGenerator,
                      capacity: parseInt(e.target.value),
                    })
                  }
                  min="1"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={consultingGenerator.isAvailable}
                  onChange={(e) =>
                    setConsultingGenerator({
                      ...consultingGenerator,
                      isAvailable: e.target.checked,
                    })
                  }
                />
                <span>즉시 오픈 (체크 해제 시 비공개로 생성되며, 자동 슬롯 오픈 대상이 됩니다)</span>
              </label>
            </div>
            <button className="btn btn-primary" onClick={generateConsultingSlots}>
              슬롯 생성
            </button>
          </div>
        </div>

        {/* 기존 슬롯 목록 */}
        <div className="slots-list-section">
          <h4>등록된 컨설팅 슬롯 ({consultingSlots?.length || 0}개)</h4>
          {!consultingSlots || consultingSlots.length === 0 ? (
            <div className="empty-slots">등록된 슬롯이 없습니다.</div>
          ) : (
            <div className="slots-table">
              {consultingSlots.map((slot) => (
                <div key={slot.id} className="slot-row">
                  <div className="slot-info">
                    <span className="slot-date">{formatDate(slot.date)}</span>
                    <span className="slot-time">{formatTime(slot.time)}</span>
                    <span className="slot-location">{slot.location}</span>
                    <span className="slot-capacity">정원 {slot.max_capacity}명</span>
                    <span className={`slot-status ${slot.is_available ? 'open' : 'closed'}`}>
                      {slot.is_available ? '공개' : '비공개'}
                    </span>
                  </div>
                  <div className="slot-actions">
                    <button
                      className={`btn-toggle ${slot.is_available ? 'btn-close' : 'btn-open'}`}
                      onClick={() => handleToggleSlotAvailability(slot.id, slot.is_available)}
                    >
                      {slot.is_available ? '비공개로 변경' : '공개로 변경'}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteConsultingSlot(slot.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 진단검사 슬롯 관리 */}
      <div className="settings-section">
        <h3>진단검사 슬롯 관리</h3>

        {/* 슬롯 추가 폼 */}
        <div className="slot-generator">
          <h4 className="generator-title">새 검사 슬롯 추가</h4>
          <div className="generator-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">날짜</label>
                <input
                  type="date"
                  className="form-input"
                  value={testGenerator.date}
                  onChange={(e) => setTestGenerator({ ...testGenerator, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">시간</label>
                <input
                  type="time"
                  className="form-input"
                  value={testGenerator.time}
                  onChange={(e) => setTestGenerator({ ...testGenerator, time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">장소</label>
                <input
                  type="text"
                  className="form-input"
                  value={testGenerator.location}
                  onChange={(e) =>
                    setTestGenerator({ ...testGenerator, location: e.target.value })
                  }
                  placeholder="예: 분당점 3층"
                />
              </div>
              <div className="form-group">
                <label className="form-label">정원</label>
                <input
                  type="number"
                  className="form-input"
                  value={testGenerator.capacity}
                  onChange={(e) =>
                    setTestGenerator({ ...testGenerator, capacity: parseInt(e.target.value) })
                  }
                  min="1"
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={addTestSlot}>
              슬롯 추가
            </button>
          </div>
        </div>

        {/* 기존 슬롯 목록 */}
        <div className="slots-list-section">
          <h4>등록된 검사 슬롯 ({testSlots?.length || 0}개)</h4>
          {!testSlots || testSlots.length === 0 ? (
            <div className="empty-slots">등록된 슬롯이 없습니다.</div>
          ) : (
            <div className="slots-table">
              {testSlots.map((slot) => (
                <div key={slot.id} className="slot-row">
                  <div className="slot-info">
                    <span className="slot-date">{formatDate(slot.date)}</span>
                    <span className="slot-time">{formatTime(slot.time)}</span>
                    <span className="slot-location">{slot.location}</span>
                    <span className="slot-capacity">정원 {slot.max_capacity}명</span>
                  </div>
                  <button className="btn-delete" onClick={() => handleDeleteTestSlot(slot.id)}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 위험 구역 - 캠페인 삭제 */}
      <div className="settings-section danger-zone">
        <h3>⚠️ 위험 구역</h3>
        <div className="danger-zone-content">
          <div className="danger-info">
            <h4>캠페인 삭제</h4>
            <p>
              캠페인을 삭제하면 모든 관련 데이터(예약, 슬롯 등)가 함께 삭제됩니다. 이 작업은
              되돌릴 수 없습니다.
            </p>
          </div>
          <button className="btn-danger" onClick={handleDeleteCampaign}>
            캠페인 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
