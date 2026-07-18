// 채점 인라인 확장 패널
// SessionAttendanceView에서 응시자 행 클릭 시 하단에 펼쳐짐.
// - 검증 5문항(있다 5개 미만이면 그만큼) 로드
// - 각 문항: 이미지 썸네일 + q_no + O/X 토글
// - 저장 → grade_verify_items RPC → 성공 시 부모에 알림 → 접힘
//
// 이미지 signed URL 발급 실패 시 문항번호만 표시(폴백).

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';

const BUCKET = 'metacog-questions';

export default function GradingPanel({ attemptId, track, onDone, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  // items: [{q_no, correct: true|false|null, imageUrl}]
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');

      // 1) 이 attempt의 검증 문항 조회 (기존 correct 값 초기화용)
      const { data: verify, error: vErr } = await supabase
        .from('metacog_verify_items')
        .select('q_no, correct')
        .eq('attempt_id', attemptId)
        .order('q_no');

      if (vErr) {
        if (!cancelled) {
          setError('검증 문항 로드 실패: ' + vErr.message);
          setLoading(false);
        }
        return;
      }

      if (!verify || verify.length === 0) {
        if (!cancelled) {
          setError('검증 문항이 없습니다. (있다 판정이 없었던 응시)');
          setLoading(false);
        }
        return;
      }

      // 2) 각 문항 이미지 URL 조회 (metacog_questions에서 image_url 경로)
      const qNos = verify.map((v) => v.q_no);
      const { data: qs, error: qErr } = await supabase
        .from('metacog_questions')
        .select('q_no, image_url')
        .eq('track', track)
        .in('q_no', qNos);

      const qMap = new Map((qs || []).map((q) => [q.q_no, q.image_url]));

      // 3) signed URL 발급 (실패해도 진행 — 이미지 없이 문항번호만)
      const paths = verify.map((v) => qMap.get(v.q_no)).filter(Boolean);
      let urlMap = new Map();
      if (paths.length > 0) {
        const { data: urls } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(paths, 3600);
        if (urls) {
          paths.forEach((p, i) => {
            if (urls[i]?.signedUrl) urlMap.set(p, urls[i].signedUrl);
          });
        }
      }
      if (qErr) {
        console.warn('문항 이미지 경로 조회 실패 (문항번호만 표시):', qErr);
      }

      if (!cancelled) {
        setItems(
          verify.map((v) => ({
            q_no: v.q_no,
            correct: v.correct, // 이미 채점된 경우 true/false, 아니면 null
            imageUrl: urlMap.get(qMap.get(v.q_no)) || null,
          }))
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attemptId, track]);

  const setCorrect = (q_no, value) => {
    setItems((prev) =>
      prev.map((it) => (it.q_no === q_no ? { ...it, correct: value } : it))
    );
  };

  const gradedCount = items.filter((it) => it.correct !== null).length;
  const canSave = gradedCount > 0 && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    // null이 아닌 항목만 전송 (부분 저장 허용)
    const results = items
      .filter((it) => it.correct !== null)
      .map((it) => ({ q_no: it.q_no, correct: it.correct }));

    const { data, error: err } = await supabase.rpc('grade_verify_items', {
      p_attempt_id: attemptId,
      p_results: results,
    });

    if (err) {
      console.error('grade_verify_items 오류:', err);
      setError('저장 실패: ' + err.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    if (onDone) onDone({ updated: data?.[0]?.updated_count || 0, total: data?.[0]?.verify_count || 0 });
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <b style={{ color: '#0d3b2e' }}>검증 문항 채점</b>
        <span style={{ fontSize: 12, color: '#666' }}>
          {loading ? '로드 중...' : `${gradedCount}/${items.length} 채점`}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          로드 중...
        </div>
      ) : error ? (
        <div style={styles.errorBox}>{error}</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          검증 문항이 없습니다.
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((it) => (
            <div key={it.q_no} style={styles.row}>
              <div style={styles.thumb}>
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt={`Q${it.q_no}`}
                    style={{ maxWidth: '100%', maxHeight: 140, display: 'block' }}
                  />
                ) : (
                  <span style={{ color: '#999', fontSize: 12 }}>이미지 없음</span>
                )}
              </div>
              <div style={styles.qMeta}>
                <div style={styles.qNo}>Q{it.q_no}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {it.correct === true
                    ? '정답'
                    : it.correct === false
                    ? '오답'
                    : '미채점'}
                </div>
              </div>
              <div style={styles.toggle}>
                <button
                  onClick={() => setCorrect(it.q_no, true)}
                  disabled={saving}
                  style={{
                    ...styles.toggleBtn,
                    background: it.correct === true ? '#3f7d5a' : 'white',
                    color: it.correct === true ? 'white' : '#3f7d5a',
                    borderColor: '#3f7d5a',
                  }}
                >
                  O
                </button>
                <button
                  onClick={() => setCorrect(it.q_no, false)}
                  disabled={saving}
                  style={{
                    ...styles.toggleBtn,
                    background: it.correct === false ? '#a8543f' : 'white',
                    color: it.correct === false ? 'white' : '#a8543f',
                    borderColor: '#a8543f',
                  }}
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ ...styles.errorBox, marginTop: 10 }}>{error}</div>
      )}

      <div style={styles.actions}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={styles.cancelBtn}
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            ...styles.saveBtn,
            opacity: canSave ? 1 : 0.5,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? '저장 중...' : `저장 (${gradedCount}건)`}
        </button>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: '#f5f1e8',
    border: '1px solid #d4a537',
    borderRadius: 8,
    padding: 16,
    margin: '4px 0 8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
  },
  thumb: {
    width: 160,
    height: 140,
    flexShrink: 0,
    background: '#fafafa',
    border: '1px solid #eee',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qMeta: {
    flex: 1,
    minWidth: 0,
  },
  qNo: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0d3b2e',
  },
  toggle: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  toggleBtn: {
    width: 56,
    height: 56,
    border: '2px solid',
    borderRadius: 8,
    fontSize: 22,
    fontWeight: 800,
    cursor: 'pointer',
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
