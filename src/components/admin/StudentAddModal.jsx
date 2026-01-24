import { useState, useEffect } from 'react';
import './StudentAddModal.css';

export default function StudentAddModal({ isOpen, onClose, onAddStudent, editMode = false, initialData = null }) {
  const [formData, setFormData] = useState({
    studentName: '',
    parentPhone: '',
    school: '',
    grade: '',
    mathLevel: '',
    testType: 'MONO',
    testDate: '',
    testTime: '',
    location: '',
  });

  // 수정 모드일 때 초기 데이터 로드
  useEffect(() => {
    if (editMode && initialData) {
      setFormData({
        studentName: initialData.studentName || '',
        parentPhone: initialData.parentPhone || '',
        school: initialData.school || '',
        grade: initialData.grade || '',
        mathLevel: initialData.mathLevel || '',
        testType: initialData.testType || 'MONO',
        testDate: initialData.testDate || '',
        testTime: initialData.testTime || '',
        location: initialData.location || '',
      });
    } else if (!editMode) {
      // 추가 모드일 때는 폼 초기화
      setFormData({
        studentName: '',
        parentPhone: '',
        school: '',
        grade: '',
        mathLevel: '',
        testType: 'MONO',
        testDate: '',
        testTime: '',
        location: '',
      });
    }
  }, [editMode, initialData, isOpen]);

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

    // 학생 추가 또는 수정
    const studentData = {
      ...formData,
      parentPhone: phoneNumber,
    };

    if (!editMode) {
      // 추가 모드: 새 ID 생성
      studentData.id = `temp_${Date.now()}`;
      studentData.isManuallyAdded = true;
    } else if (initialData) {
      // 수정 모드: 기존 ID 유지
      studentData.id = initialData.id;
      studentData.isManuallyAdded = initialData.isManuallyAdded;
    }

    onAddStudent(studentData);

    // 폼 초기화 및 닫기
    if (!editMode) {
      setFormData({
        studentName: '',
        parentPhone: '',
        school: '',
        grade: '',
        mathLevel: '',
        testType: 'MONO',
        testDate: '',
        testTime: '',
        location: '',
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editMode ? '학생 정보 수정' : '학생 추가'}</h2>
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
              <option value="초1">초등학교 1학년</option>
              <option value="초2">초등학교 2학년</option>
              <option value="초3">초등학교 3학년</option>
              <option value="초4">초등학교 4학년</option>
              <option value="초5">초등학교 5학년</option>
              <option value="초6">초등학교 6학년</option>
              <option value="중1">중학교 1학년</option>
              <option value="중2">중학교 2학년</option>
              <option value="중3">중학교 3학년</option>
              <option value="고1">고등학교 1학년</option>
              <option value="고2">고등학교 2학년</option>
              <option value="고3">고등학교 3학년</option>
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

          <div className="form-group">
            <label className="form-label">
              진단검사 유형 <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={formData.testType}
              onChange={(e) => handleChange('testType', e.target.value)}
              required
            >
              <option value="MONO">중1-1 진단검사</option>
              <option value="DI">중2-1 진단검사</option>
              <option value="TRI">중3-1 + 공통수학1 진단검사</option>
            </select>
          </div>

          <div className="form-divider" style={{ margin: '1.5rem 0', borderTop: '1px solid #e5e7eb' }}></div>

          <div className="form-group">
            <label className="form-label">진단검사 날짜</label>
            <input
              type="date"
              className="form-input"
              value={formData.testDate}
              onChange={(e) => handleChange('testDate', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">진단검사 시간</label>
            <input
              type="time"
              className="form-input"
              value={formData.testTime}
              onChange={(e) => handleChange('testTime', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">장소</label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="예: 강남점"
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
              {editMode ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
