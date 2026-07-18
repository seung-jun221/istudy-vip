import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../../utils/supabase';

const TRACKS = [
  { code: 'mono', label: '모노' },
  { code: 'tri', label: '트라이' },
];

const BUCKET = 'metacog-questions';

// 파일명에서 q_no 파싱: q01.png / q1.png / Q17.PNG → 정수
function parseQNo(filename) {
  const m = filename.match(/^q(\d+)\.(png|jpg|jpeg)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 60) return null;
  return n;
}

export default function QuestionsTab() {
  const [track, setTrack] = useState('mono');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [uploadStatus, setUploadStatus] = useState(null); // { current, total, errors }
  const fileInputRef = useRef(null);

  const loadQuestions = async (trackCode) => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('metacog_questions')
      .select('q_no, image_url, unit_tag, source_ref, updated_at')
      .eq('track', trackCode)
      .order('q_no', { ascending: true });

    if (err) {
      console.error('문항 로드 실패:', err);
      setError('문항 로드 실패');
      setQuestions([]);
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQuestions(track);
  }, [track]);

  const filledQNos = useMemo(() => new Set(questions.map((q) => q.q_no)), [questions]);
  const missing = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 60; i++) {
      if (!filledQNos.has(i)) arr.push(i);
    }
    return arr;
  }, [filledQNos]);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setError('');

    const items = Array.from(files);
    const errors = [];
    let successCount = 0;

    setUploadStatus({ current: 0, total: items.length, errors: [] });

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      setUploadStatus({ current: i + 1, total: items.length, errors });

      const qNo = parseQNo(file.name);
      if (!qNo) {
        errors.push(`${file.name}: 파일명이 q01~q60 형식이 아님`);
        continue;
      }

      const path = `${track}/q${String(qNo).padStart(2, '0')}.png`;

      // Storage 업로드 (덮어쓰기 허용)
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });

      if (upErr) {
        errors.push(`${file.name}: 업로드 실패 - ${upErr.message}`);
        continue;
      }

      // metacog_questions upsert
      const { error: dbErr } = await supabase
        .from('metacog_questions')
        .upsert(
          {
            track,
            q_no: qNo,
            image_url: path,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'track,q_no' }
        );

      if (dbErr) {
        errors.push(`${file.name}: DB 등록 실패 - ${dbErr.message}`);
        continue;
      }

      successCount += 1;
    }

    setUploadStatus({ current: items.length, total: items.length, errors, done: true, successCount });
    if (fileInputRef.current) fileInputRef.current.value = '';
    loadQuestions(track);
  };

  const handleDeleteQuestion = async (qNo) => {
    if (!window.confirm(`Q${qNo}번 문항을 삭제하시겠습니까?`)) return;
    const path = `${track}/q${String(qNo).padStart(2, '0')}.png`;

    // Storage 파일 삭제
    await supabase.storage.from(BUCKET).remove([path]);

    // DB 행 삭제
    const { error: err } = await supabase
      .from('metacog_questions')
      .delete()
      .eq('track', track)
      .eq('q_no', qNo);

    if (err) {
      alert('DB 삭제 실패: ' + err.message);
    } else {
      loadQuestions(track);
    }
  };

  return (
    <div>
      {/* 트랙 선택 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {TRACKS.map((t) => (
          <button
            key={t.code}
            onClick={() => setTrack(t.code)}
            style={{
              padding: '8px 18px',
              border: 'none',
              background: track === t.code ? '#1976d2' : '#f0f0f0',
              color: track === t.code ? 'white' : '#333',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {t.label} ({questions.filter((q) => track === t.code).length}/60)
          </button>
        ))}
      </div>

      {/* 업로드 영역 */}
      <div
        style={{
          padding: '16px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '13px', color: '#333', marginBottom: '8px', fontWeight: 600 }}>
          이미지 업로드 (트랙: {TRACKS.find((t) => t.code === track)?.label})
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', lineHeight: 1.5 }}>
          파일명: <code>q01.png</code> ~ <code>q60.png</code> (제로패딩 필수, PNG/JPG)<br />
          같은 번호를 다시 올리면 덮어쓰기 됩니다.
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={!!uploadStatus && !uploadStatus.done}
          style={{ fontSize: '13px' }}
        />

        {uploadStatus && (
          <div style={{ marginTop: '10px', fontSize: '13px' }}>
            <div style={{ color: '#333' }}>
              {uploadStatus.done
                ? `✅ 완료: ${uploadStatus.successCount || 0}/${uploadStatus.total} 성공`
                : `⏳ 업로드 중... ${uploadStatus.current}/${uploadStatus.total}`}
            </div>
            {uploadStatus.errors && uploadStatus.errors.length > 0 && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  오류 {uploadStatus.errors.length}건:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {uploadStatus.errors.slice(0, 8).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {uploadStatus.errors.length > 8 && (
                    <li>... 외 {uploadStatus.errors.length - 8}건</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* 누락 안내 */}
      {!loading && missing.length > 0 && (
        <div
          style={{
            padding: '12px 14px',
            background: '#fffbeb',
            border: '1px solid #fbbf24',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#92400e',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            ⚠️ 누락 문항 {missing.length}건 (1~60 중)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {missing.slice(0, 30).map((n) => `Q${n}`).join(', ')}
            {missing.length > 30 && ` ... 외 ${missing.length - 30}개`}
          </div>
        </div>
      )}

      {/* 60개 슬롯 매트릭스 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>로드 중...</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
            gap: '6px',
          }}
        >
          {Array.from({ length: 60 }, (_, i) => i + 1).map((n) => {
            const q = questions.find((q) => q.q_no === n);
            const filled = !!q;
            return (
              <button
                key={n}
                onClick={filled ? () => handleDeleteQuestion(n) : undefined}
                disabled={!filled}
                title={
                  filled
                    ? `Q${n} 클릭 시 삭제 · ${q.image_url}`
                    : `Q${n} 미업로드`
                }
                style={{
                  padding: '10px 6px',
                  border: '1px solid',
                  borderColor: filled ? '#4caf50' : '#e5e7eb',
                  background: filled ? '#e8f5e9' : '#fafafa',
                  color: filled ? '#2e7d32' : '#999',
                  borderRadius: '4px',
                  cursor: filled ? 'pointer' : 'default',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                Q{n}
                <div style={{ fontSize: '10px', fontWeight: 400, marginTop: '2px' }}>
                  {filled ? '✓' : '—'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
        업로드 완료 {questions.length}/60 · 누락 {missing.length}건 · 파란색 셀 클릭 시 개별 삭제
      </div>
    </div>
  );
}
