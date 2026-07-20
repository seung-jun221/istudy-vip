// v2 채점 인라인 확장 패널 — 누테 25문항 5×5 그리드
// SessionAttendanceView에서 응시자 행 클릭 시 하단에 펼쳐짐.
// - 기본: 전체 O 세팅 (진단검사 온라인 채점과 동일 UX)
// - 틀린 문항만 클릭해서 X로 토글
// - 저장: grade_nute RPC (UPSERT)
//
// 강사는 이 그리드를 종이 누테 시험지와 대조하며 X만 표시.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../utils/supabase';

const NUTE_COUNT = 25;

export default function GradingPanel({ attemptId, onDone, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  // grades: { [q_no]: true|false } — 로컬 편집 상태
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');

      const { data: result, error: err } = await supabase.rpc(
        'get_nute_grading_data',
        { p_attempt_id: attemptId }
      );

      if (err || !result) {
        if (!cancelled) {
          setError('채점 데이터 로드 실패: ' + (err?.message || 'unknown'));
          setLoading(false);
        }
        return;
      }

      const items = result.items || [];
      const initGrades = {};
      // 기본 전체 O (true) 세팅. 기존 채점 있으면 그 값으로 오버라이드.
      for (let n = 1; n <= NUTE_COUNT; n++) {
        const found = items.find((it) => it.q_no === n);
        initGrades[n] = found?.correct != null ? found.correct : true;
      }
      if (!cancelled) {
        setData(result);
        setGrades(initGrades);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId]);

  const toggle = (n) => {
    setGrades((prev) => ({ ...prev, [n]: !prev[n] }));
  };

  const wrongCount = useMemo(
    () => Object.values(grades).filter((v) => v === false).length,
    [grades]
  );
  const correctCount = NUTE_COUNT - wrongCount;

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const results = [];
    for (let n = 1; n <= NUTE_COUNT; n++) {
      if (grades[n] !== undefined) {
        results.push({ q_no: n, correct: grades[n] });
      }
    }

    const { data: resp, error: err } = await supabase.rpc('grade_nute', {
      p_attempt_id: attemptId,
      p_results: results,
    });

    if (err) {
      console.error('grade_nute 오류:', err);
      setError('저장 실패: ' + err.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    if (onDone) onDone({ upserted: resp?.[0]?.upserted_count || 0, total: resp?.[0]?.total_graded || 0 });
  };

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        // 배경 클릭 시 취소 (저장 중일 땐 무시)
        if (e.target === e.currentTarget && !saving) onCancel?.();
      }}
    >
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
      <div style={styles.header}>
        <div>
          <b style={{ color: '#0d3b2e', fontSize: 15 }}>누테 25문항 채점</b>
          {data?.student?.name && (
            <span style={{ color: '#666', fontSize: 13, marginLeft: 8 }}>
              {data.student.name} · {data.student.class_name || '-'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#666' }}>
            정답 <b style={{ color: '#0d3b2e' }}>{correctCount}</b> · 오답 <b style={{ color: '#a8543f' }}>{wrongCount}</b>
          </div>
          <button
            onClick={onCancel}
            disabled={saving}
            aria-label="닫기"
            style={styles.closeBtn}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={styles.hint}>
        기본은 <b style={{ color: '#0d3b2e' }}>전체 O</b>입니다.
        종이 누테 시험지를 보며 <b style={{ color: '#a8543f' }}>틀린 문항 번호</b>만 눌러 X로 바꾸세요.
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#666' }}>로드 중...</div>
      ) : error ? (
        <div style={styles.errorBox}>{error}</div>
      ) : (
        <div style={styles.grid}>
          {Array.from({ length: NUTE_COUNT }, (_, i) => i + 1).map((n) => {
            const isCorrect = grades[n];
            const item = data?.items?.find((it) => it.q_no === n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                disabled={saving}
                title={
                  item?.judgment === 'can'
                    ? '학생: 안다고 판단'
                    : item?.judgment === 'cannot'
                    ? '학생: 모른다고 판단'
                    : ''
                }
                style={{
                  ...styles.cell,
                  background: isCorrect ? '#e8f5e9' : '#a8543f',
                  color: isCorrect ? '#0d3b2e' : '#fff',
                  borderColor: isCorrect ? '#3f7d5a' : '#a8543f',
                }}
              >
                <div style={styles.cellNum}>{n}</div>
                <div style={styles.cellMark}>{isCorrect ? 'O' : 'X'}</div>
                {item?.judgment && (
                  <div
                    style={{
                      ...styles.cellJudgment,
                      color: isCorrect
                        ? item.judgment === 'can' ? '#3f7d5a' : '#a8543f'
                        : '#fff',
                      opacity: 0.75,
                    }}
                  >
                    {item.judgment === 'can' ? '안다' : '모른다'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && !loading && (
        <div style={{ ...styles.errorBox, marginTop: 10 }}>{error}</div>
      )}

      <div style={styles.actions}>
        <button onClick={onCancel} disabled={saving} style={styles.cancelBtn}>
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{ ...styles.saveBtn, opacity: saving || loading ? 0.5 : 1 }}
        >
          {saving ? '저장 중...' : `저장 (25문항)`}
        </button>
      </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  panel: {
    background: '#f5f1e8',
    border: '1px solid #d4a537',
    borderRadius: 12,
    padding: 20,
    margin: 0,
    maxWidth: 620,
    width: '100%',
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 20,
    fontWeight: 700,
    color: '#666',
    cursor: 'pointer',
    padding: '2px 6px',
    lineHeight: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.6)',
    borderRadius: 6,
    marginBottom: 12,
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
  },
  cell: {
    aspectRatio: '1',
    minHeight: 64,
    border: '2px solid',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    transition: 'background 0.1s',
    userSelect: 'none',
  },
  cellNum: {
    fontSize: 12,
    fontWeight: 600,
    opacity: 0.7,
    lineHeight: 1,
  },
  cellMark: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.2,
    marginTop: 2,
  },
  cellJudgment: {
    fontSize: 9.5,
    fontWeight: 700,
    lineHeight: 1,
    marginTop: 2,
  },
  errorBox: {
    padding: 10,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: 6,
    fontSize: 13,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  cancelBtn: {
    padding: '8px 16px',
    background: 'white',
    color: '#666',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 20px',
    background: '#0d3b2e',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
  },
};
