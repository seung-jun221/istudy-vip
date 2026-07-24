import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../utils/supabase';

const TRACK_LABELS = {
  mono: '모노',
  tri: '트라이',
  tetra: '테트라',
};

const EMPTY_FORM = { name: '', class_name: '', track: 'mono', verify_code: '' };

export default function StudentsTab({ branchId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 필터
  const [trackFilter, setTrackFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 추가 폼
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // CSV 임포트
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // 편집
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const loadStudents = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('students')
      .select('*')
      .eq('branch_id', branchId)
      .order('class_name', { ascending: true })
      .order('name', { ascending: true });

    if (err) {
      console.error('학생 명부 로드 실패:', err);
      setError('명부 로드 실패');
      setStudents([]);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (branchId) loadStudents();
  }, [branchId]);

  // 필터링
  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (trackFilter !== 'all' && s.track !== trackFilter) return false;
      if (!showInactive && !s.active) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !s.name.toLowerCase().includes(term) &&
          !s.class_name?.toLowerCase().includes(term) &&
          !s.verify_code.includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [students, trackFilter, showInactive, searchTerm]);

  const trackCounts = useMemo(() => {
    const counts = { total: 0 };
    students
      .filter((s) => s.active)
      .forEach((s) => {
        counts.total += 1;
        counts[s.track] = (counts[s.track] || 0) + 1;
      });
    return counts;
  }, [students]);

  const validate = (form) => {
    if (!form.name.trim()) return '이름을 입력해주세요.';
    if (!form.track) return '트랙을 선택해주세요.';
    if (!/^\d{4}$/.test(form.verify_code)) return '확인번호는 숫자 4자리입니다.';
    return null;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const v = validate(addForm);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('students').insert([
      {
        branch_id: branchId,
        name: addForm.name.trim(),
        class_name: addForm.class_name.trim() || null,
        track: addForm.track,
        verify_code: addForm.verify_code,
      },
    ]);

    setSaving(false);
    if (err) {
      console.error('학생 추가 실패:', err);
      setError('추가 실패: ' + err.message);
    } else {
      setAddForm(EMPTY_FORM);
      loadStudents();
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      class_name: s.class_name || '',
      track: s.track,
      verify_code: s.verify_code,
    });
  };

  const handleEditSave = async (id) => {
    const v = validate(editForm);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('students')
      .update({
        name: editForm.name.trim(),
        class_name: editForm.class_name.trim() || null,
        track: editForm.track,
        verify_code: editForm.verify_code,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSaving(false);
    if (err) {
      console.error('학생 수정 실패:', err);
      setError('수정 실패: ' + err.message);
    } else {
      setEditingId(null);
      loadStudents();
    }
  };

  const handleToggleActive = async (s) => {
    const { error: err } = await supabase
      .from('students')
      .update({ active: !s.active, updated_at: new Date().toISOString() })
      .eq('id', s.id);
    if (err) {
      console.error('활성 상태 변경 실패:', err);
      alert('변경 실패');
    } else {
      loadStudents();
    }
  };

  const handleDelete = async (s) => {
    if (
      !window.confirm(
        `${s.name} 학생을 완전히 삭제하시겠습니까? 응시 기록이 있으면 삭제할 수 없습니다.`
      )
    )
      return;
    const { error: err } = await supabase
      .from('students')
      .delete()
      .eq('id', s.id);
    if (err) {
      console.error('학생 삭제 실패:', err);
      alert('삭제 실패: ' + err.message + '\n(응시 기록이 있으면 삭제 불가)');
    } else {
      loadStudents();
    }
  };

  /**
   * CSV 붙여넣기 파싱.
   * 지원 구분자: 탭, 콤마, 공백(연속 가능)
   *   → 한글 이름/반명은 공백을 안 포함하므로 공백도 안전한 구분자
   * 헤더 자동 감지 (첫 줄에 "이름/name" 포함 시 스킵)
   * 열 순서: 이름, 반, 트랙, 뒷4자리
   */
  const parseCSV = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return { rows: [], errors: [] };

    // 헤더 감지
    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes('이름') ||
      firstLine.includes('name') ||
      firstLine.includes('반');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows = [];
    const errors = [];

    dataLines.forEach((line, idx) => {
      // 탭·콤마·공백(1개 이상) 모두 구분자로 인식
      const parts = line.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 4) {
        errors.push(
          `${idx + 1}번째 줄: 4열(이름, 반, 트랙, 뒷4자리) 필요 — 현재 ${parts.length}열 감지됨`
        );
        return;
      }
      const [name, class_name, trackRaw, verify_code] = parts;
      const track = trackRaw.toLowerCase();

      if (!name) {
        errors.push(`${idx + 1}번째 줄: 이름 누락`);
        return;
      }
      if (!['mono', 'tri', 'tetra'].includes(track)) {
        errors.push(`${idx + 1}번째 줄: 트랙 값 오류 (${trackRaw})`);
        return;
      }
      if (!/^\d{4}$/.test(verify_code)) {
        errors.push(`${idx + 1}번째 줄: 뒷4자리 오류 (${verify_code})`);
        return;
      }

      rows.push({
        branch_id: branchId,
        name,
        class_name: class_name || null,
        track,
        verify_code,
      });
    });

    return { rows, errors };
  };

  const handleImport = async () => {
    setError('');
    setImportResult(null);
    const { rows, errors } = parseCSV(csvText);

    if (errors.length > 0) {
      setImportResult({ success: 0, errors });
      return;
    }
    if (rows.length === 0) {
      setImportResult({ success: 0, errors: ['입력 없음'] });
      return;
    }

    setImporting(true);
    const { error: err, count } = await supabase
      .from('students')
      .insert(rows, { count: 'exact' });

    setImporting(false);
    if (err) {
      console.error('일괄 등록 실패:', err);
      setImportResult({ success: 0, errors: [err.message] });
    } else {
      setImportResult({ success: count ?? rows.length, errors: [] });
      setCsvText('');
      loadStudents();
    }
  };

  return (
    <div>
      {/* 통계 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['total', 'mono', 'tri'].map((k) => (
          <div
            key={k}
            style={{
              padding: '10px 16px',
              background: '#f5f5f5',
              borderRadius: '6px',
              minWidth: '90px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#666' }}>
              {k === 'total' ? '전체' : TRACK_LABELS[k] || k}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {trackCounts[k] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="이름/반/뒷4자리 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '7px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        />
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          style={{
            padding: '7px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <option value="all">전체 트랙</option>
          <option value="mono">모노</option>
          <option value="tri">트라이</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          비활성 포함
        </label>
        <button
          onClick={() => setImportOpen((o) => !o)}
          className="btn btn-outline"
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          {importOpen ? '임포트 닫기' : '📋 CSV 붙여넣기 임포트'}
        </button>
      </div>

      {/* CSV 임포트 */}
      {importOpen && (
        <div
          style={{
            padding: '14px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#333', marginBottom: '8px', fontWeight: 600 }}>
            엑셀에서 4열(이름, 반, 트랙, 뒷4자리)을 복사해 붙여넣으세요
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', lineHeight: 1.5 }}>
            • 구분자: 탭 · 콤마 · 공백 모두 가능<br />
            • 트랙 값: <code>mono</code> / <code>tri</code><br />
            • 첫 줄에 "이름"이나 "name" 있으면 헤더로 스킵<br />
            • 예: <code>홍길동 MS_3A mono 1234</code>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={
              '이름\t반\t트랙\t뒷4자리\n홍길동\tMS_3A\tmono\t1234\n김철수\tMS_3B\tmono\t5678'
            }
            rows={7}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              onClick={handleImport}
              disabled={importing || !csvText.trim()}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '7px 14px' }}
            >
              {importing ? '등록 중...' : '일괄 등록'}
            </button>
          </div>
          {importResult && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                background:
                  importResult.errors.length === 0 ? '#e8f5e9' : '#fef2f2',
                fontSize: '13px',
                color: importResult.errors.length === 0 ? '#2e7d32' : '#b91c1c',
              }}
            >
              {importResult.errors.length === 0 ? (
                <>✅ {importResult.success}명 등록 완료</>
              ) : (
                <>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ 오류 {importResult.errors.length}건 — 등록 안 됨:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>... 외 {importResult.errors.length - 5}건</li>
                    )}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 추가 폼 */}
      <form
        onSubmit={handleAdd}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '10px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="이름 *"
          value={addForm.name}
          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', flex: '1 1 120px' }}
        />
        <input
          type="text"
          placeholder="반 (예: MS_3A)"
          value={addForm.class_name}
          onChange={(e) => setAddForm({ ...addForm, class_name: e.target.value })}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', flex: '1 1 120px' }}
        />
        <select
          value={addForm.track}
          onChange={(e) => setAddForm({ ...addForm, track: e.target.value })}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px' }}
        >
          <option value="mono">모노</option>
          <option value="tri">트라이</option>
        </select>
        <input
          type="text"
          placeholder="뒷4자리 *"
          value={addForm.verify_code}
          onChange={(e) =>
            setAddForm({ ...addForm, verify_code: e.target.value.replace(/\D/g, '').slice(0, 4) })
          }
          maxLength={4}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', width: '80px' }}
        />
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          + 추가
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: '10px',
            marginBottom: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* 명부 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>로드 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          {students.length === 0
            ? '학생 명부가 비어 있습니다. 위 CSV 임포트 또는 폼으로 추가하세요.'
            : '필터 조건에 맞는 학생이 없습니다.'}
        </div>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: '6px',
            overflow: 'auto',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>이름</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>반</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>트랙</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>뒷4자리</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>활성</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isEditing = editingId === s.id;
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      opacity: s.active ? 1 : 0.5,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <td style={{ padding: '8px' }}>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            value={editForm.class_name}
                            onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                            style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select
                            value={editForm.track}
                            onChange={(e) => setEditForm({ ...editForm, track: e.target.value })}
                            style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          >
                            <option value="mono">모노</option>
                            <option value="tri">트라이</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            value={editForm.verify_code}
                            onChange={(e) =>
                              setEditForm({ ...editForm, verify_code: e.target.value.replace(/\D/g, '').slice(0, 4) })
                            }
                            maxLength={4}
                            style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', width: '60px' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>—</td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEditSave(s.id)}
                            disabled={saving}
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            저장
                          </button>{' '}
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            취소
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '10px 8px' }}>{s.class_name || '-'}</td>
                        <td style={{ padding: '10px 8px' }}>{TRACK_LABELS[s.track] || s.track}</td>
                        <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{s.verify_code}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <label style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={s.active}
                              onChange={() => handleToggleActive(s)}
                              style={{ width: '16px', height: '16px' }}
                            />
                          </label>
                        </td>
                        <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <button
                            onClick={() => startEdit(s)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            수정
                          </button>{' '}
                          <button
                            onClick={() => handleDelete(s)}
                            className="btn-danger"
                            style={{ padding: '4px 10px', fontSize: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            삭제
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        {filtered.length}명 표시 (활성 총 {trackCounts.total || 0}명)
      </div>
    </div>
  );
}
