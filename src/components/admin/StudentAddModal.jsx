import { useState } from 'react';
import './StudentAddModal.css';

export default function StudentAddModal({ isOpen, onClose, onAddStudent }) {
  const [formData, setFormData] = useState({
    studentName: '',
    parentPhone: '',
    school: '',
    grade: '',
    mathLevel: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 유효성 검사
    if (formData.studentName.length < 2) {
      alert('학생명을 정확히 입력해주세요.');
      return;
    }

    const phoneNumber = formData.parentPhone.replace(/[^0-9]/g, '');
    if (!/^010\d{8}$/.test(phoneNumber)) {
      alert('올바른 전화번호를 입력해주세요.');
      return;
    }

    if (!formData.grade) {
      alert('학년을 선택해주세요.');
      return;
    }

    // 학생 추가
    onAddStudent({
      ...formData,
      parentPhone: phoneNumber,
      id: `temp_${Date.now()}`, // 임시 ID
      isManuallyAdded: true,
    });

    // 폼 초기화 및 닫기
    setFormData({
      studentName: '',
      parentPhone: '',
      school: '',
      grade: '',
      mathLevel: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>학생 추가</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="student-add-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              학생명 <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.studentName}
              onChange={(e) => handleChange('studentName', e.target.value)}
              placeholder="홍길동"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              학부모 연락처 <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.parentPhone}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                handleChange('parentPhone', value);
              }}
              placeholder="01012345678"
              maxLength={11}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">학교</label>
            <input
              type="text"
              className="form-input"
              value={formData.school}
              onChange={(e) => handleChange('school', e.target.value)}
              placeholder="○○중학교"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              학년 <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={formData.grade}
              onChange={(e) => handleChange('grade', e.target.value)}
              required
            >
              <option value="">선택</option>
              <option value="초5">초등학교 5학년</option>
              <option value="초6">초등학교 6학년</option>
              <option value="중1">중학교 1학년</option>
              <option value="중2">중학교 2학년</option>
              <option value="중3">중학교 3학년</option>
              <option value="고1">고등학교 1학년</option>
              <option value="고2">고등학교 2학년</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">수학 선행정도</label>
            <input
              type="text"
              className="form-input"
              value={formData.mathLevel}
              onChange={(e) => handleChange('mathLevel', e.target.value)}
              placeholder="예: 중3 (고1 선행 중)"
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              취소
            </button>
            <button type="submit" className="btn-primary">
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
