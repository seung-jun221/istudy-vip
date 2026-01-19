import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import './AdminTabs.css';
import './SettingsTab.css';

export default function SettingsTab({ campaign, seminarSlots, consultingSlots, testSlots, onUpdate }) {
  const navigate = useNavigate();
  const {
    authMode,
    updateCampaign,
    createSeminarSlots,
    updateSeminarSlot,
    deleteSeminarSlot,
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
    location: campaign.location || '',
    season: campaign.season || '',
    status: campaign.status || 'active',
    access_password: campaign.access_password || '',
    test_method: seminarSlots?.[0]?.test_method || 'home', // ⭐ seminar_slots에서 가져오기
  });

  // campaign가 업데이트되면 formData도 업데이트
  useEffect(() => {
    setFormData({
      title: campaign.title || '',
      location: campaign.location || '',
      season: campaign.season || '',
      status: campaign.status || 'active',
      access_password: campaign.access_password || '',
      test_method: seminarSlots?.[0]?.test_method || 'home', // ⭐ seminar_slots에서 가져오기
    });

    const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
    const threshold = settings[campaign.id]?.auto_open_threshold || 0;
    setAutoOpenThreshold(threshold);
  }, [campaign, seminarSlots]); // ⭐ seminarSlots 의존성 추가

  // 컨설팅 슬롯 생성기 상태
  const [consultingGenerator, setConsultingGenerator] = useState({
    date: '',
    startTime: '14:00',
    endTime: '17:00',
    location: campaign.location || '',
    capacity: 1,
    isAvailable: true, // 기본값: 즉시 오픈
    slotInterval: 30,  // 시간 간격 (분)
    consultantType: 'ceo', // 컨설팅 유형: ceo(대표이사) | director(원장)
  });

  // 설명회 슬롯 생성기 상태
  const [seminarGenerator, setSeminarGenerator] = useState({
    date: '',
    time: '14:00',
    location: campaign.location || '',
    max_capacity: 100,
    display_capacity: 100,
  });

  // 설명회 슬롯 편집 상태
  const [editingSeminarSlot, setEditingSeminarSlot] = useState(null);
  const [seminarSlotFormData, setSeminarSlotFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    max_capacity: 100,
    display_capacity: 100,
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
      location: campaign.location || '',
      season: campaign.season || '',
      status: campaign.status || 'active',
      access_password: campaign.access_password || '',
      test_method: seminarSlots?.[0]?.test_method || 'home', // ⭐ seminar_slots에서 가져오기
    });
    // autoOpenThreshold도 원래 값으로 되돌리기
    const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
    const threshold = settings[campaign.id]?.auto_open_threshold || 0;
    setAutoOpenThreshold(threshold);
    setEditing(false);
  };

  // 컨설팅 슬롯 생성기 - 시간대별 슬롯 생성
  const generateConsultingSlots = async () => {
    const { date, startTime, endTime, location, capacity, isAvailable, slotInterval, consultantType } = consultingGenerator;

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
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotInterval) {
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
        consultantType,
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
        slotInterval: 30,
        consultantType: 'ceo',
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

  // 설명회 슬롯 추가
  const addSeminarSlot = async () => {
    const { date, time, location, max_capacity, display_capacity } = seminarGenerator;

    if (!date || !time || !location) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    // ⭐ 기존 슬롯의 test_method 또는 현재 formData의 test_method 사용
    const currentTestMethod = formData.test_method || seminarSlots?.[0]?.test_method || 'home';

    const success = await createSeminarSlots(campaign.id, [
      {
        date,
        time,
        location,
        max_capacity,
        display_capacity,
        session_number: (seminarSlots?.length || 0) + 1,
        test_method: currentTestMethod, // ⭐ 진단검사 방식 상속
      },
    ]);

    if (success) {
      onUpdate();
      setSeminarGenerator({
        date: '',
        time: '14:00',
        location: campaign.location || '',
        max_capacity: 100,
        display_capacity: 100,
      });
    }
  };

  // 설명회 슬롯 수정 시작
  const startEditingSeminarSlot = (slot) => {
    setEditingSeminarSlot(slot.id);
    setSeminarSlotFormData({
      title: slot.title || '',
      date: slot.date || '',
      time: slot.time || '',
      location: slot.location || '',
      max_capacity: slot.max_capacity || 100,
      display_capacity: slot.display_capacity || 100,
    });
  };

  // 설명회 슬롯 저장
  const saveSeminarSlot = async (slotId) => {
    const { title, date, time, location, max_capacity, display_capacity } = seminarSlotFormData;

    if (!date || !time || !location) {
      alert('날짜, 시간, 장소는 필수 항목입니다.');
      return;
    }

    const success = await updateSeminarSlot(slotId, {
      title: title || null,
      date,
      time,
      location,
      max_capacity: parseInt(max_capacity),
      display_capacity: parseInt(display_capacity),
    });

    if (success) {
      setEditingSeminarSlot(null);
      setSeminarSlotFormData({
        title: '',
        date: '',
        time: '',
        location: '',
        max_capacity: 100,
        display_capacity: 100,
      });
      onUpdate();
    }
  };

  // 설명회 슬롯 수정 취소
  const cancelEditingSeminarSlot = () => {
    setEditingSeminarSlot(null);
    setSeminarSlotFormData({
      title: '',
      date: '',
      time: '',
      location: '',
      max_capacity: 100,
      display_capacity: 100,
    });
  };

  // 설명회 슬롯 삭제
  const handleDeleteSeminarSlot = async (slotId) => {
    if (!window.confirm('이 설명회 슬롯을 삭제하시겠습니까?\n예약이 있는 슬롯은 삭제할 수 없습니다.')) return;

    const success = await deleteSeminarSlot(slotId);
    if (success) {
      onUpdate();
    }
  };

  // 설명회 슬롯 마감/마감해제 처리
  const handleToggleSeminarStatus = async (slotId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    const actionText = newStatus === 'closed' ? '마감' : '마감 해제';

    if (!window.confirm(`이 설명회를 ${actionText} 처리하시겠습니까?`)) return;

    const success = await updateSeminarSlot(slotId, { status: newStatus });
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
      {/* 캠페인 기본 정보 */}
      <div className="settings-section">
        <div className="settings-header">
          <h3>캠페인 기본 정보</h3>
          {!editing && authMode === 'super' && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              수정하기
            </button>
          )}
        </div>

        <div className="settings-form">
          {/* 캠페인명 */}
          <div className="form-group">
            <label className="form-label">캠페인명</label>
            {editing ? (
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleChange}
                placeholder="예: 아이스터디 VIP 학부모 설명회 - 분당 캠페인"
              />
            ) : (
              <div className="form-value">{campaign.title || '-'}</div>
            )}
          </div>

          {/* 지역 */}
          <div className="form-group">
            <label className="form-label">지역</label>
            {editing ? (
              <input
                type="text"
                name="location"
                className="form-input"
                value={formData.location}
                onChange={handleChange}
                placeholder="예: 분당캠퍼스, 대치캠퍼스"
              />
            ) : (
              <div className="form-value">{campaign.location}</div>
            )}
          </div>

          {/* 시즌 */}
          <div className="form-group">
            <label className="form-label">시즌</label>
            {editing ? (
              <input
                type="text"
                name="season"
                className="form-input"
                value={formData.season}
                onChange={handleChange}
                placeholder="예: 2025 겨울방학"
              />
            ) : (
              <div className="form-value">{campaign.season || '-'}</div>
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
      </div>

      {/* 기타 설정 */}
      <div className="settings-section">
        <div className="settings-header">
          <h3>기타 설정</h3>
          {!editing && authMode === 'super' && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              수정하기
            </button>
          )}
        </div>
        <div className="settings-form">
          {/* 상태 */}
          <div className="form-group">
            <label className="form-label">캠페인 상태</label>
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

        {/* 접근 비밀번호 */}
        <div className="form-group">
          <label className="form-label">캠페인 접근 비밀번호</label>
          {editing ? (
            <input
              type="text"
              name="access_password"
              className="form-input"
              value={formData.access_password}
              onChange={handleChange}
              placeholder="담당자 전용 비밀번호를 입력하세요"
            />
          ) : (
            <div className="form-value">
              {campaign.access_password ? '●●●●●●●●' : '(미설정)'}
            </div>
          )}
          <div className="form-hint">
            이 비밀번호로 로그인하면 해당 캠페인 상세 페이지로 직접 접근할 수 있습니다.
            담당자에게만 공유하세요.
          </div>
        </div>

        {/* 진단검사 방식 */}
        <div className="form-group">
          <label className="form-label">진단검사 방식</label>
          {editing ? (
            <div className="radio-group" style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="test_method"
                  value="home"
                  checked={formData.test_method === 'home'}
                  onChange={handleChange}
                />
                <span style={{ whiteSpace: 'nowrap' }}>가정 셀프 테스트만</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="test_method"
                  value="onsite"
                  checked={formData.test_method === 'onsite'}
                  onChange={handleChange}
                />
                <span style={{ whiteSpace: 'nowrap' }}>방문 진단검사만</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="test_method"
                  value="both"
                  checked={formData.test_method === 'both'}
                  onChange={handleChange}
                />
                <span style={{ whiteSpace: 'nowrap' }}>둘 다 가능</span>
              </label>
            </div>
          ) : (
            <div className="form-value">
              {formData.test_method === 'home' && '가정 셀프 테스트만'}
              {formData.test_method === 'onsite' && '방문 진단검사만'}
              {formData.test_method === 'both' && '둘 다 가능'}
            </div>
          )}
          <div className="form-hint">
            • 가정만: 사용자가 시험지 PDF를 다운로드하여 집에서 응시<br />
            • 방문만: 사용자가 날짜/시간을 선택하여 학원에서 응시<br />
            • 둘 다: 사용자가 방문 또는 가정 중 선택 (방문 슬롯 마감 시 가정으로 폴백)
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
      </div>

      {/* 수퍼 관리자 전용 기능 */}
      {authMode === 'super' && (
        <>
          {/* 설명회 슬롯 관리 */}
          <div className="settings-section">
            <h3>설명회 슬롯 관리</h3>

            {/* 슬롯 추가 폼 */}
            <div className="slot-generator">
              <h4 className="generator-title">새 설명회 슬롯 추가</h4>
              <div className="generator-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">날짜</label>
                    <input
                      type="date"
                      className="form-input"
                      value={seminarGenerator.date}
                      onChange={(e) => setSeminarGenerator({ ...seminarGenerator, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">시간</label>
                    <input
                      type="time"
                      className="form-input"
                      value={seminarGenerator.time}
                      onChange={(e) => setSeminarGenerator({ ...seminarGenerator, time: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">장소</label>
                    <input
                      type="text"
                      className="form-input"
                      value={seminarGenerator.location}
                      onChange={(e) => setSeminarGenerator({ ...seminarGenerator, location: e.target.value })}
                      placeholder="예: 분당점 3층"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">정원 (실제)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={seminarGenerator.max_capacity}
                      onChange={(e) => setSeminarGenerator({ ...seminarGenerator, max_capacity: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">정원 (노출)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={seminarGenerator.display_capacity}
                      onChange={(e) => setSeminarGenerator({ ...seminarGenerator, display_capacity: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={addSeminarSlot}>
                  슬롯 추가
                </button>
              </div>
            </div>

            {/* 기존 슬롯 목록 */}
            <div className="slots-list-section">
              <h4>등록된 설명회 슬롯 ({seminarSlots?.length || 0}개)</h4>
              {!seminarSlots || seminarSlots.length === 0 ? (
                <div className="empty-slots">등록된 슬롯이 없습니다.</div>
              ) : (
                <div className="slots-table">
                  {seminarSlots
                    .sort((a, b) => {
                      const dateCompare = new Date(a.date) - new Date(b.date);
                      if (dateCompare !== 0) return dateCompare;
                      return (a.time || '').localeCompare(b.time || '');
                    })
                    .map((slot) => (
                      <div key={slot.id} className="slot-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        {editingSeminarSlot === slot.id ? (
                          /* 편집 모드 */
                          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '4px' }}>
                            <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>슬롯 정보 수정</h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px' }}>제목</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={seminarSlotFormData.title}
                                  onChange={(e) => setSeminarSlotFormData({ ...seminarSlotFormData, title: e.target.value })}
                                  placeholder="예: 대치점 1차 설명회"
                                  style={{ fontSize: '14px' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px' }}>날짜</label>
                                <input
                                  type="date"
                                  className="form-input"
                                  value={seminarSlotFormData.date}
                                  onChange={(e) => setSeminarSlotFormData({ ...seminarSlotFormData, date: e.target.value })}
                                  style={{ fontSize: '14px' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px' }}>시간</label>
                                <input
                                  type="time"
                                  className="form-input"
                                  value={seminarSlotFormData.time}
                                  onChange={(e) => setSeminarSlotFormData({ ...seminarSlotFormData, time: e.target.value })}
                                  style={{ fontSize: '14px' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px' }}>장소</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={seminarSlotFormData.location}
                                  onChange={(e) => setSeminarSlotFormData({ ...seminarSlotFormData, location: e.target.value })}
                                  placeholder="예: 분당점 3층"
                                  style={{ fontSize: '14px' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px' }}>정원 (실제)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={seminarSlotFormData.max_capacity}
                                  onChange={(e) => setSeminarSlotFormData({ ...seminarSlotFormData, max_capacity: parseInt(e.target.value) })}
                                  min="1"
                                  style={{ fontSize: '14px' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px' }}>정원 (노출)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={seminarSlotFormData.display_capacity}
                                  onChange={(e) => setSeminarSlotFormData({ ...seminarSlotFormData, display_capacity: parseInt(e.target.value) })}
                                  min="1"
                                  style={{ fontSize: '14px' }}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary"
                                onClick={cancelEditingSeminarSlot}
                                style={{ padding: '6px 16px', fontSize: '13px' }}
                              >
                                취소
                              </button>
                              <button
                                className="btn btn-primary"
                                onClick={() => saveSeminarSlot(slot.id)}
                                style={{ padding: '6px 16px', fontSize: '13px' }}
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 일반 모드 */
                          <>
                            <div className="slot-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span className="slot-date">{formatDate(slot.date)}</span>
                                <span className="slot-time">{formatTime(slot.time)}</span>
                                <span className="slot-location">{slot.location}</span>
                                <span className="slot-capacity">정원 {slot.max_capacity}명 (노출: {slot.display_capacity}명)</span>
                                <span className={`slot-status ${slot.status === 'active' ? 'open' : 'closed'}`}>
                                  {slot.status === 'active' ? '예약중' : '마감'}
                                </span>
                              </div>
                              <div style={{ fontSize: '14px', color: slot.title ? '#333' : '#999' }}>
                                <strong>제목:</strong> {slot.title || '(제목 없음 - 자동 생성됨)'}
                              </div>
                            </div>
                            <div className="slot-actions" style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className={`btn-toggle ${slot.status === 'active' ? 'btn-close' : 'btn-open'}`}
                                onClick={() => handleToggleSeminarStatus(slot.id, slot.status)}
                                style={{ padding: '6px 12px', fontSize: '13px', minWidth: '80px' }}
                              >
                                {slot.status === 'active' ? '마감 처리' : '마감 해제'}
                              </button>
                              <button
                                className="btn btn-primary"
                                onClick={() => startEditingSeminarSlot(slot)}
                                style={{ padding: '6px 12px', fontSize: '13px', minWidth: '60px' }}
                              >
                                수정
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() => handleDeleteSeminarSlot(slot.id)}
                                style={{ fontSize: '13px', padding: '6px 12px' }}
                              >
                                삭제
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* 컨설팅 슬롯 관리 */}
          <div className="settings-section">
            <h3>컨설팅 슬롯 관리</h3>

            {/* 슬롯 생성기 */}
            <div className="slot-generator">
          <h4 className="generator-title">새 슬롯 생성 (시간 간격별 자동 생성)</h4>
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
              <div className="form-group">
                <label className="form-label">시간 간격</label>
                <select
                  className="form-input"
                  value={consultingGenerator.slotInterval}
                  onChange={(e) =>
                    setConsultingGenerator({
                      ...consultingGenerator,
                      slotInterval: parseInt(e.target.value),
                    })
                  }
                >
                  <option value={10}>10분</option>
                  <option value={15}>15분</option>
                  <option value={20}>20분</option>
                  <option value={25}>25분</option>
                  <option value={30}>30분</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">컨설팅 유형</label>
                <select
                  className="form-input"
                  value={consultingGenerator.consultantType}
                  onChange={(e) =>
                    setConsultingGenerator({
                      ...consultingGenerator,
                      consultantType: e.target.value,
                    })
                  }
                >
                  <option value="ceo">대표이사 컨설팅 (입시상담+입학안내)</option>
                  <option value="director">원장 컨설팅 (입학안내)</option>
                </select>
              </div>
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
                    <span className={`slot-type ${slot.consultant_type === 'director' ? 'director' : 'ceo'}`}>
                      {slot.consultant_type === 'director' ? '원장' : '대표'}
                    </span>
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
        <h3>위험 구역</h3>
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
        </>
      )}
    </div>
  );
}
