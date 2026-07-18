// 회차 응시 현황 (드릴다운) — 읽기 전용
// SessionsTab에서 회차 클릭 → 이 화면으로 전환
// - 대상 학생 전체 리스트 (응시자 먼저 + 미응시자 뒤)
// - 상단 요약: 응시 X / 대상 Y, 채점 미완료 Z명
// - 미응시자 필터 토글
// - 각 응시자 행: [채점 입력] / [검증지 출력] 액션 (다음 단계에서 활성화)

import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import GradingPanel from './GradingPanel';

// key를 갖는 Fragment 래퍼 (map 안에서 <>...</>는 key 못 받음)
const FragmentRow = Fragment;

const TRACK_LABELS = { mono: '모노', tri: '트라이', tetra: '테트라' };

function formatKST(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(sec) {
  if (sec == null || sec < 0) return '-';
  // 0은 실제 값이 될 수 없음 (60문항 응시가 0초 안에 끝날 수 없음).
  // 구 클라이언트로 제출된 응시는 answered_at이 모두 같아 MAX-MIN=0.
  if (sec === 0) return '측정 안 됨';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}초`;
  return `${m}분 ${s}초`;
}

export default function SessionAttendanceView({ session, onBack }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNonAttendees, setShowNonAttendees] = useState(true);
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('get_session_roster', {
      p_session_id: session.id,
    });
    if (err) {
      console.error('get_session_roster 오류:', err);
      setError('조회 실패: ' + err.message);
      setRoster([]);
    } else {
      setRoster(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session?.id) load();
  }, [session?.id]);

  const attendees = useMemo(
    () => roster.filter((r) => r.attempt_id),
    [roster]
  );
  const nonAttendees = useMemo(
    () => roster.filter((r) => !r.attempt_id),
    [roster]
  );
  const graded = useMemo(
    () =>
      attendees.filter(
        (r) => r.verify_count > 0 && r.verify_count === r.verify_graded_count
      ),
    [attendees]
  );
  const ungraded = useMemo(
    () =>
      attendees.filter(
        (r) =>
          r.verify_count === 0 || r.verify_count !== r.verify_graded_count
      ),
    [attendees]
  );

  const displayed = showNonAttendees ? roster : attendees;

  return (
    <div>
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '6px 12px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← 회차 목록
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{session.title}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            {TRACK_LABELS[session.track] || session.track} ·{' '}
            {session.status === 'open' ? '오픈' : '마감'}
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <SummaryCard label="응시 완료" value={attendees.length} total={roster.length} color="#0d3b2e" />
        <SummaryCard label="미응시" value={nonAttendees.length} color="#a8543f" />
        <SummaryCard label="채점 완료" value={graded.length} total={attendees.length} color="#3f7d5a" />
        <SummaryCard label="채점 대기" value={ungraded.length} color="#d4a537" />
      </div>

      {/* 필터 */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showNonAttendees}
            onChange={(e) => setShowNonAttendees(e.target.checked)}
          />
          미응시자 포함 표시
        </label>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
          표시 {displayed.length}건
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px',
            marginBottom: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* 리스트 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>로드 중...</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          {showNonAttendees ? '대상 학생이 없습니다.' : '응시자가 없습니다.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <Th>이름</Th>
                <Th>반</Th>
                <Th style={{ textAlign: 'center' }}>응시</Th>
                <Th style={{ textAlign: 'right' }}>있다</Th>
                <Th style={{ textAlign: 'right' }}>없다</Th>
                <Th style={{ textAlign: 'right' }}>시간초과</Th>
                <Th style={{ textAlign: 'right' }}>검증</Th>
                <Th style={{ textAlign: 'right' }}>소요시간</Th>
                <Th>제출일시</Th>
                <Th>채점</Th>
                <Th>액션</Th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => {
                const done = !!r.attempt_id;
                const gradedRow =
                  done && r.verify_count > 0 && r.verify_count === r.verify_graded_count;
                // r.attempt_id가 null(미응시자)이면 확장 로직 자체를 비활성화
                // (null === null이 true라서 모든 미응시자가 확장되던 버그 방지)
                const isExpanded =
                  r.attempt_id != null && expandedAttemptId === r.attempt_id;
                const canGrade = done && r.verify_count > 0;

                return (
                  <FragmentRow key={r.student_id}>
                    <tr
                      style={{
                        borderTop: '1px solid #f0f0f0',
                        background: isExpanded
                          ? '#fffbeb'
                          : done
                          ? 'white'
                          : '#fafafa',
                        color: done ? '#1a1a1a' : '#999',
                      }}
                    >
                      <Td><b>{r.student_name}</b></Td>
                      <Td>{r.class_name || '-'}</Td>
                      <Td style={{ textAlign: 'center' }}>
                        {done ? (
                          <Badge color="#0d3b2e" bg="#e8f5e9">완료</Badge>
                        ) : (
                          <Badge color="#a8543f" bg="#fef2f2">미응시</Badge>
                        )}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>{done ? r.can_count : '-'}</Td>
                      <Td style={{ textAlign: 'right' }}>{done ? r.cannot_count : '-'}</Td>
                      <Td style={{ textAlign: 'right', color: done && r.forced_count > 0 ? '#a8543f' : undefined }}>
                        {done ? r.forced_count : '-'}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>{done ? `${r.verify_count}/5` : '-'}</Td>
                      <Td
                        style={{
                          textAlign: 'right',
                          color: done && r.total_seconds === 0 ? '#999' : undefined,
                          fontStyle: done && r.total_seconds === 0 ? 'italic' : undefined,
                        }}
                      >
                        {done ? formatDuration(r.total_seconds) : '-'}
                      </Td>
                      <Td style={{ fontSize: 12, color: '#666' }}>{done ? formatKST(r.submitted_at) : '-'}</Td>
                      <Td>
                        {done ? (
                          r.verify_count === 0 ? (
                            <Badge color="#666" bg="#f0f0f0">검증 없음</Badge>
                          ) : (
                            <Badge
                              color={gradedRow ? '#0d3b2e' : '#92400e'}
                              bg={gradedRow ? '#e8f5e9' : '#fffbeb'}
                            >
                              {r.verify_graded_count}/{r.verify_count}
                              {gradedRow ? ' ✓' : ''}
                            </Badge>
                          )
                        ) : (
                          '-'
                        )}
                      </Td>
                      <Td>
                        {canGrade ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() =>
                                setExpandedAttemptId(isExpanded ? null : r.attempt_id)
                              }
                              style={{
                                ...actionBtn,
                                background: isExpanded ? '#a8543f' : '#0d3b2e',
                                color: 'white',
                              }}
                            >
                              {isExpanded ? '접기' : gradedRow ? '재채점' : '채점'}
                            </button>
                            <button
                              onClick={() =>
                                window.open(
                                  `/admin/metacog/verify-sheet/${r.attempt_id}`,
                                  '_blank',
                                  'noopener,noreferrer'
                                )
                              }
                              style={{ ...actionBtn, background: '#d4a537', color: '#0d3b2e' }}
                            >
                              검증지
                            </button>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/metacog-report/${r.attempt_id}`;
                                navigator.clipboard?.writeText(url).then(
                                  () => alert('리포트 링크가 복사되었습니다.\n\n' + url),
                                  () => window.open(url, '_blank', 'noopener,noreferrer')
                                );
                              }}
                              style={{ ...actionBtn, background: '#0d3b2e', color: '#d4a537' }}
                              title="학부모 리포트 URL 복사 (카톡 발송용)"
                            >
                              리포트
                            </button>
                          </div>
                        ) : done ? (
                          <span style={{ color: '#999', fontSize: 12 }}>—</span>
                        ) : (
                          '-'
                        )}
                      </Td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#fffbeb' }}>
                        <td colSpan={11} style={{ padding: 0 }}>
                          <GradingPanel
                            attemptId={r.attempt_id}
                            track={session.track}
                            onCancel={() => setExpandedAttemptId(null)}
                            onDone={() => {
                              setExpandedAttemptId(null);
                              load(); // roster 갱신
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#999', marginTop: 12, lineHeight: 1.6 }}>
        · 소요시간 = 첫 답변 ~ 마지막 답변 (MAX-MIN answered_at). 중간 이탈이 있으면 실제와 다를 수 있음.<br />
        · <b>"측정 안 됨"</b> = 클라이언트 시각 저장 이전(초기 버전)에 응시한 데이터. 이후 응시분부터 정상 표시.<br />
        · 검증 = 응시 후 서버 사이드에서 랜덤 고정된 검증 문항 수 (있다 5개 미만이면 그만큼만).
      </p>
    </div>
  );
}

function SummaryCard({ label, value, total, color }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>
        {value}
        {total !== undefined && (
          <span style={{ fontSize: 13, color: '#999', fontWeight: 500, marginLeft: 4 }}>
            / {total}
          </span>
        )}
      </div>
    </div>
  );
}

function Th({ children, style }) {
  return (
    <th
      style={{
        padding: '10px 12px',
        fontSize: 12,
        fontWeight: 700,
        color: '#333',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }) {
  return (
    <td
      style={{
        padding: '10px 12px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        background: bg,
        color,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

const disabledBtn = {
  padding: '4px 8px',
  fontSize: 11,
  background: '#f0f0f0',
  color: '#999',
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  cursor: 'not-allowed',
};

const actionBtn = {
  padding: '5px 10px',
  fontSize: 11,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 700,
};
