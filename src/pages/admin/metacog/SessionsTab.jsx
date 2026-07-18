import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import SessionAttendanceView from './SessionAttendanceView';

const TRACK_LABELS = {
  mono: '모노',
  tri: '트라이',
  tetra: '테트라',
};

export default function SessionsTab({ branchId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [addTitle, setAddTitle] = useState('');
  const [addTrack, setAddTrack] = useState('mono');
  const [saving, setSaving] = useState(false);

  // 드릴다운: 클릭한 회차 (null이면 목록 화면)
  const [selectedSession, setSelectedSession] = useState(null);

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('metacog_sessions')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (err) {
      console.error('회차 로드 실패:', err);
      setError('회차 로드 실패');
      setSessions([]);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (branchId) loadSessions();
  }, [branchId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addTitle.trim()) {
      setError('회차 제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('metacog_sessions').insert([
      {
        branch_id: branchId,
        title: addTitle.trim(),
        track: addTrack,
        status: 'open',
      },
    ]);
    setSaving(false);
    if (err) {
      console.error('회차 생성 실패:', err);
      setError('생성 실패: ' + err.message);
    } else {
      setAddTitle('');
      loadSessions();
    }
  };

  const handleToggleStatus = async (session) => {
    const newStatus = session.status === 'open' ? 'closed' : 'open';
    if (!window.confirm(`이 회차를 "${newStatus === 'open' ? '오픈' : '마감'}" 상태로 변경하시겠습니까?`))
      return;
    const { error: err } = await supabase
      .from('metacog_sessions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', session.id);
    if (err) {
      alert('변경 실패: ' + err.message);
    } else {
      loadSessions();
    }
  };

  const handleDelete = async (session) => {
    if (
      !window.confirm(
        `"${session.title}" 회차를 완전히 삭제하시겠습니까?\n\n응시 기록이 있으면 함께 삭제됩니다.`
      )
    )
      return;
    const { error: err } = await supabase
      .from('metacog_sessions')
      .delete()
      .eq('id', session.id);
    if (err) {
      alert('삭제 실패: ' + err.message);
    } else {
      loadSessions();
    }
  };

  // 드릴다운 뷰
  if (selectedSession) {
    return (
      <SessionAttendanceView
        session={selectedSession}
        onBack={() => {
          setSelectedSession(null);
          loadSessions();
        }}
      />
    );
  }

  return (
    <div>
      {/* 회차 생성 폼 */}
      <form
        onSubmit={handleAdd}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="회차 제목 (예: 2026년 6월 누테 메타인지)"
          value={addTitle}
          onChange={(e) => setAddTitle(e.target.value)}
          style={{
            padding: '7px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            flex: '1 1 260px',
          }}
        />
        <select
          value={addTrack}
          onChange={(e) => setAddTrack(e.target.value)}
          style={{
            padding: '7px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <option value="mono">모노</option>
          <option value="tri">트라이</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: '7px 14px', fontSize: '13px' }}
        >
          + 회차 생성
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

      {/* 회차 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>로드 중...</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          회차가 없습니다. 위 폼으로 생성해주세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                padding: '14px 16px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {TRACK_LABELS[s.track] || s.track} · 생성{' '}
                  {new Date(s.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  background: s.status === 'open' ? '#e8f5e9' : '#f5f5f5',
                  color: s.status === 'open' ? '#2e7d32' : '#666',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {s.status === 'open' ? '오픈' : '마감'}
              </span>
              <button
                onClick={() => setSelectedSession(s)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#0d3b2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                응시 현황
              </button>
              <button
                onClick={() => handleToggleStatus(s)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                {s.status === 'open' ? '마감 처리' : '오픈 처리'}
              </button>
              <button
                onClick={() => handleDelete(s)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
