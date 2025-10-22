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
  });

  const [consultingSlots, setConsultingSlots] = useState([]);
  const [testMethod, setTestMethod] = useState('home'); // 'home' or 'onsite'
  const [testSlots, setTestSlots] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addConsultingSlot = () => {
    setConsultingSlots([
      ...consultingSlots,
      {
        id: Date.now(),
        date: formData.date, // 기본값: 캠페인 날짜
        time: '14:00',
        location: formData.location, // 기본값: 캠페인 장소
        capacity: 1,
        dayOfWeek: '',
      },
    ]);
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
            </div>
          )}

          {/* Step 2: 컨설팅 슬롯 */}
          {step === 2 && (
            <div className="step-content">
              <h3 className="step-title">2단계: 컨설팅 슬롯 설정</h3>
              <p className="step-description">
                컨설팅 가능한 날짜와 시간을 추가하세요. (나중에도 추가 가능)
              </p>

              <button className="btn btn-secondary mb-3" onClick={addConsultingSlot}>
                + 컨설팅 슬롯 추가
              </button>

              <div className="slots-list">
                {consultingSlots.map((slot, index) => (
                  <div key={slot.id} className="slot-item">
                    <div className="slot-header">
                      <span className="slot-number">슬롯 {index + 1}</span>
                      <button
                        className="btn-remove"
                        onClick={() => removeConsultingSlot(slot.id)}
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
                            handleSlotDateChange(slot.id, e.target.value)
                          }
                        />
                        {slot.dayOfWeek && (
                          <span className="day-badge">{slot.dayOfWeek}요일</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">시간</label>
                        <input
                          type="time"
                          className="form-input"
                          value={slot.time}
                          onChange={(e) =>
                            updateConsultingSlot(slot.id, 'time', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">지점</label>
                        <input
                          type="text"
                          className="form-input"
                          value={slot.location}
                          onChange={(e) =>
                            updateConsultingSlot(slot.id, 'location', e.target.value)
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
                            updateConsultingSlot(
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

                {consultingSlots.length === 0 && (
                  <div className="empty-slots">
                    컨설팅 슬롯을 추가하지 않으면 컨설팅 예약을 받을 수 없습니다.
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
