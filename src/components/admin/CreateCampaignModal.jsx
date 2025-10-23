import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './ConsultingResultModal.css';
import './CreateCampaignModal.css';

export default function CreateCampaignModal({ onClose }) {
  const { createCampaign } = useAdmin();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: 기본정보, 2: 컨설팅슬롯, 3: 진단검사

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    max_capacity: 100,
    display_capacity: 100,
    status: 'active',
    auto_open_threshold: 5, // 자동 오픈 임계값
  });

  const [consultingSlots, setConsultingSlots] = useState([]);
  const [slotGenerator, setSlotGenerator] = useState({
    date: '',
    startTime: '14:00',
    endTime: '17:00',
    location: '',
    capacity: 1,
  });
  const [testMethod, setTestMethod] = useState('home'); // 'home' or 'onsite'
  const [testSlots, setTestSlots] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateTimeSlots = () => {
    if (!slotGenerator.date || !slotGenerator.startTime || !slotGenerator.endTime) {
      alert('날짜, 시작시간, 종료시간을 모두 입력해주세요.');
      return;
    }

    const start = slotGenerator.startTime.split(':').map(Number);
    const end = slotGenerator.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (startMinutes >= endMinutes) {
      alert('종료시간은 시작시간보다 늦어야 합니다.');
      return;
    }

    const slots = [];
    const dayOfWeek = getDayOfWeek(slotGenerator.date);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      slots.push({
        id: Date.now() + minutes, // 고유 ID
        date: slotGenerator.date,
        time: timeStr,
        location: slotGenerator.location || formData.location,
        capacity: slotGenerator.capacity,
        dayOfWeek,
      });
    }

    setConsultingSlots([...consultingSlots, ...slots]);
    alert(`${slots.length}개의 슬롯이 생성되었습니다.`);
  };

  const updateSlotGenerator = (field, value) => {
    setSlotGenerator((prev) => ({ ...prev, [field]: value }));
  };

  const removeConsultingSlot = (id) => {
    setConsultingSlots(consultingSlots.filter((slot) => slot.id !== id));
  };

  const updateConsultingSlot = (id, field, value) => {
    setConsultingSlots(
      consultingSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot
      )
    );
  };

  const addTestSlot = () => {
    setTestSlots([
      ...testSlots,
      {
        id: Date.now(),
        date: formData.date,
        time: '14:00',
        capacity: 1,
      },
    ]);
  };

  const removeTestSlot = (id) => {
    setTestSlots(testSlots.filter((slot) => slot.id !== id));
  };

  const updateTestSlot = (id, field, value) => {
    setTestSlots(
      testSlots.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  // 슬롯 날짜가 변경될 때 요일 자동 업데이트
  const handleSlotDateChange = (id, value) => {
    const dayOfWeek = getDayOfWeek(value);
    setConsultingSlots(
      consultingSlots.map((slot) =>
        slot.id === id ? { ...slot, date: value, dayOfWeek } : slot
      )
    );
  };

  const handleNext = () => {
    if (step === 1) {
      // 필수 입력 검증
      if (!formData.title || !formData.date || !formData.time || !formData.location) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const success = await createCampaign({
      ...formData,
      max_capacity: parseInt(formData.max_capacity),
      display_capacity: parseInt(formData.display_capacity),
      auto_open_threshold: parseInt(formData.auto_open_threshold),
      consultingSlots,
      testMethod,
      testSlots: testMethod === 'onsite' ? testSlots : [],
    });

    setSaving(false);

    if (success) {
      onClose(true);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div
        className="modal-content create-campaign-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>새 캠페인 생성 - {step}/3 단계</h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Step 1: 기본 정보 */}
          {step === 1 && (
            <div className="step-content">
              <h3 className="step-title">1단계: 기본 정보</h3>

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

              <div className="form-row">
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
              </div>

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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">정원 (실제 수용)</label>
                  <input
                    type="number"
                    name="max_capacity"
                    className="form-input"
                    value={formData.max_capacity}
                    onChange={handleChange}
                    min="1"
                  />
                </div>

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
                </div>
              </div>

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

              <div className="form-group">
                <label className="form-label">자동 슬롯 오픈 임계값</label>
                <input
                  type="number"
                  name="auto_open_threshold"
                  className="form-input"
                  value={formData.auto_open_threshold}
                  onChange={handleChange}
                  min="0"
                />
                <div className="form-hint">
                  잔여 예약 가능 수가 이 값 미만이 되면 다음 날짜의 슬롯이 자동으로
                  오픈됩니다.
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 컨설팅 슬롯 */}
          {step === 2 && (
            <div className="step-content">
              <h3 className="step-title">2단계: 컨설팅 슬롯 설정</h3>
              <p className="step-description">
                시작/종료 시간을 입력하면 30분 간격으로 자동 생성됩니다.
              </p>

              {/* 슬롯 생성기 */}
              <div className="slot-generator">
                <h4 className="generator-title">⚡ 슬롯 자동 생성</h4>

                <div className="form-group">
                  <label className="form-label">날짜</label>
                  <input
                    type="date"
                    className="form-input"
                    value={slotGenerator.date}
                    onChange={(e) => updateSlotGenerator('date', e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">시작 시간</label>
                    <input
                      type="time"
                      className="form-input"
                      value={slotGenerator.startTime}
                      onChange={(e) => updateSlotGenerator('startTime', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">종료 시간</label>
                    <input
                      type="time"
                      className="form-input"
                      value={slotGenerator.endTime}
                      onChange={(e) => updateSlotGenerator('endTime', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">지점</label>
                    <input
                      type="text"
                      className="form-input"
                      value={slotGenerator.location}
                      onChange={(e) => updateSlotGenerator('location', e.target.value)}
                      placeholder={formData.location || '지점명'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">슬롯당 정원</label>
                    <input
                      type="number"
                      className="form-input"
                      value={slotGenerator.capacity}
                      onChange={(e) =>
                        updateSlotGenerator('capacity', parseInt(e.target.value))
                      }
                      min="1"
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary mb-3"
                  onClick={generateTimeSlots}
                  style={{ width: '100%' }}
                >
                  🔄 30분 간격 슬롯 자동 생성
                </button>
              </div>

              {/* 생성된 슬롯 목록 */}
              <h4 className="generator-title" style={{ marginTop: '24px' }}>
                📋 생성된 슬롯 목록 ({consultingSlots.length}개)
              </h4>

              <div className="slots-list compact">
                {consultingSlots.map((slot, index) => (
                  <div key={slot.id} className="slot-item-compact">
                    <div className="slot-info">
                      <span className="slot-number">{index + 1}</span>
                      <span className="slot-detail">
                        {slot.date} ({slot.dayOfWeek}) {slot.time} | {slot.location} | 정원{' '}
                        {slot.capacity}명
                      </span>
                    </div>
                    <button
                      className="btn-remove-sm"
                      onClick={() => removeConsultingSlot(slot.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {consultingSlots.length === 0 && (
                  <div className="empty-slots">
                    위 양식으로 슬롯을 생성해주세요.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: 진단검사 설정 */}
          {step === 3 && (
            <div className="step-content">
              <h3 className="step-title">3단계: 진단검사 설정</h3>

              <div className="form-group">
                <label className="form-label">진단검사 방식</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="testMethod"
                      value="home"
                      checked={testMethod === 'home'}
                      onChange={(e) => setTestMethod(e.target.value)}
                    />
                    <span
                      className={`radio-text ${testMethod === 'home' ? 'active' : ''}`}
                    >
                      가정 셀프 테스트
                    </span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="testMethod"
                      value="onsite"
                      checked={testMethod === 'onsite'}
                      onChange={(e) => setTestMethod(e.target.value)}
                    />
                    <span
                      className={`radio-text ${testMethod === 'onsite' ? 'active' : ''}`}
                    >
                      방문 진단검사
                    </span>
                  </label>
                </div>
              </div>

              {testMethod === 'onsite' && (
                <>
                  <p className="step-description">
                    방문 진단검사 가능한 날짜와 시간을 추가하세요.
                  </p>

                  <button className="btn btn-secondary mb-3" onClick={addTestSlot}>
                    + 진단검사 슬롯 추가
                  </button>

                  <div className="slots-list">
                    {testSlots.map((slot, index) => (
                      <div key={slot.id} className="slot-item">
                        <div className="slot-header">
                          <span className="slot-number">슬롯 {index + 1}</span>
                          <button
                            className="btn-remove"
                            onClick={() => removeTestSlot(slot.id)}
                          >
                            삭제
                          </button>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">날짜</label>
                            <input
                              type="date"
                              className="form-input"
                              value={slot.date}
                              onChange={(e) =>
                                updateTestSlot(slot.id, 'date', e.target.value)
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">시간</label>
                            <input
                              type="time"
                              className="form-input"
                              value={slot.time}
                              onChange={(e) =>
                                updateTestSlot(slot.id, 'time', e.target.value)
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">정원</label>
                            <input
                              type="number"
                              className="form-input"
                              value={slot.capacity}
                              onChange={(e) =>
                                updateTestSlot(
                                  slot.id,
                                  'capacity',
                                  parseInt(e.target.value)
                                )
                              }
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {testSlots.length === 0 && (
                      <div className="empty-slots">
                        진단검사 슬롯을 추가하지 않으면 진단검사 예약을 받을 수 없습니다.
                      </div>
                    )}
                  </div>
                </>
              )}

              {testMethod === 'home' && (
                <div className="info-box">
                  <p>
                    가정 셀프 테스트는 별도의 슬롯 설정이 필요하지 않습니다. 학부모가
                    자유롭게 테스트 자료를 다운로드할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handleBack}>
              이전
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => onClose(false)}>
            취소
          </button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              다음
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '생성 중...' : '생성 완료'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
