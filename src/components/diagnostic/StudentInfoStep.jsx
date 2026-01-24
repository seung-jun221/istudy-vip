import { useState } from 'react';
import { useDiagnostic } from '../../context/DiagnosticContext';
import Input from '../common/Input';
import Button from '../common/Button';
import './StudentInfoStep.css';

export default function StudentInfoStep() {
  const { studentInfo, setStudentInfo, setCurrentStep, showToast } = useDiagnostic();

  const handleChange = (field, value) => {
    setStudentInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // 유효성 검사
    if (studentInfo.studentName.length < 2) {
      showToast('학생명을 정확히 입력해주세요.', 'error');
      return;
    }

    if (!/^010\d{8}$/.test(studentInfo.parentPhone.replace(/-/g, ''))) {
      showToast('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    if (!studentInfo.grade) {
      showToast('학년을 선택해주세요.', 'error');
      return;
    }

    setCurrentStep('test-select');
  };

  return (
    <div className="student-info-step">
      <h2 className="step-title">학생 정보 입력</h2>
      <p className="step-description">
        진단검사 결과를 확인하기 위한 정보를 입력해주세요.
      </p>

      <form className="info-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        {/* 학생명 */}
        <Input
          label="학생명"
          value={studentInfo.studentName}
          onChange={(e) => handleChange('studentName', e.target.value)}
          placeholder="홍길동"
          required
        />

        {/* 학부모 연락처 */}
        <Input
          label="학부모 연락처"
          value={studentInfo.parentPhone}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, '');
            handleChange('parentPhone', value);
          }}
          placeholder="01012345678"
          maxLength={11}
          required
        />
        <p className="field-hint">
          ⚠️ 결과 조회 시 사용되므로 정확히 입력해주세요.
        </p>

        {/* 학교 */}
        <Input
          label="학교"
          value={studentInfo.school}
          onChange={(e) => handleChange('school', e.target.value)}
          placeholder="○○중학교"
        />

        {/* 학년 */}
        <div className="form-group">
          <label className="form-label">
            학년 <span className="required">*</span>
          </label>
          <select
            value={studentInfo.grade}
            onChange={(e) => handleChange('grade', e.target.value)}
            className="form-select"
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

        {/* 수학 선행정도 */}
        <Input
          label="수학 선행정도"
          value={studentInfo.mathLevel}
          onChange={(e) => handleChange('mathLevel', e.target.value)}
          placeholder="예: 중3 (고1 선행 중)"
        />

        <Button type="submit" className="next-button">
          다음 단계 →
        </Button>
      </form>
    </div>
  );
}
