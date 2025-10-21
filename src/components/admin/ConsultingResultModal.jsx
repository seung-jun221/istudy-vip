import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './ConsultingResultModal.css';

export default function ConsultingResultModal({ consulting, onClose }) {
  const { updateConsultingResult } = useAdmin();
  const [notes, setNotes] = useState(consulting.consultant_notes || '');
  const [enrollmentStatus, setEnrollmentStatus] = useState(
    consulting.enrollment_status || '미정'
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    const success = await updateConsultingResult(consulting.id, {
      notes,
      enrollmentStatus,
    });

    setSaving(false);

    if (success) {
      onClose(true); // true를 전달하여 업데이트 필요함을 알림
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>컨설팅 결과 작성</h2>
          <button className="modal-close" onClick={() => onClose(false)}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* 학생 정보 */}
          <div className="student-info-box">
            <div className="info-row">
              <span className="info-label">학생명:</span>
              <span className="info-value">{consulting.student_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">학년:</span>
              <span className="info-value">{consulting.grade || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">학교:</span>
              <span className="info-value">{consulting.school || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">수학 선행:</span>
              <span className="info-value">{consulting.math_level || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">연락처:</span>
              <span className="info-value">{consulting.parent_phone}</span>
            </div>
          </div>

          {/* 등록 여부 선택 */}
          <div className="form-group">
            <label className="form-label">등록 여부</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="enrollmentStatus"
                  value="미정"
                  checked={enrollmentStatus === '미정'}
                  onChange={(e) => setEnrollmentStatus(e.target.value)}
                />
                <span
                  className={`radio-text ${enrollmentStatus === '미정' ? 'active' : ''}`}
                >
                  미정
                </span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="enrollmentStatus"
                  value="확정"
                  checked={enrollmentStatus === '확정'}
                  onChange={(e) => setEnrollmentStatus(e.target.value)}
                />
                <span
                  className={`radio-text success ${enrollmentStatus === '확정' ? 'active' : ''}`}
                >
                  확정
                </span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="enrollmentStatus"
                  value="불가"
                  checked={enrollmentStatus === '불가'}
                  onChange={(e) => setEnrollmentStatus(e.target.value)}
                />
                <span
                  className={`radio-text danger ${enrollmentStatus === '불가' ? 'active' : ''}`}
                >
                  불가
                </span>
              </label>
            </div>
          </div>

          {/* 메모 입력 */}
          <div className="form-group">
            <label className="form-label">컨설팅 메모</label>
            <textarea
              className="form-textarea"
              rows="8"
              placeholder="컨설팅 내용, 학생 특성, 추천 과정 등을 자유롭게 작성하세요..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
