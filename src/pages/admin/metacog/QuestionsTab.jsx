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

  // 미리보기 모달 상태
  const [previewQuestion, setPreviewQuestion] = useState(null); // { q_no, image_url, ... }
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [replaceUploading, setReplaceUploading] = useState(false);
  const replaceInputRef = useRef(null);

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

  // 미리보기 열기 — signed URL 발급 후 모달 표시
  const openPreview = async (question) => {
    setPreviewQuestion(question);
    setPreviewUrl(null);
    setPreviewLoading(true);

    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(question.image_url, 300); // 5분 유효

    if (err) {
      console.error('미리보기 URL 발급 실패:', err);
      setPreviewUrl(null);
    } else {
      setPreviewUrl(data.signedUrl);
    }
    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewQuestion(null);
    setPreviewUrl(null);
    setReplaceUploading(false);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const handleDeleteQuestion = async (qNo) => {
    if (!window.confirm(`Q${qNo}번 문항을 삭제하시겠습니까?\n이미지 파일과 DB 기록이 모두 제거됩니다.`))
      return;
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
      closePreview();
      loadQuestions(track);
    }
  };

  // 미리보기에서 이미지 수정(교체) — 같은 q_no로 덮어쓰기
  const handleReplaceImage = async (file) => {
    if (!file || !previewQuestion) return;
    const qNo = previewQuestion.q_no;
    const path = `${track}/q${String(qNo).padStart(2, '0')}.png`;

    setReplaceUploading(true);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });

    if (upErr) {
      alert('업로드 실패: ' + upErr.message);
      setReplaceUploading(false);
      return;
    }

    const { error: dbErr } = await supabase
      .from('metacog_questions')
      .upsert(
        { track, q_no: qNo, image_url: path, updated_at: new Date().toISOString() },
        { onConflict: 'track,q_no' }
      );

    setReplaceUploading(false);

    if (dbErr) {
      alert('DB 갱신 실패: ' + dbErr.message);
    } else {
      // 성공: 목록 갱신 + 새 이미지 URL로 미리보기 리프레시
      loadQuestions(track);
      // 새 signed URL 다시 발급 (같은 경로지만 캐시 회피용 timestamp 붙임)
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 300);
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl + '&t=' + Date.now());
      }
      if (replaceInputRef.current) replaceInputRef.current.value = '';
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
                onClick={filled ? () => openPreview(q) : undefined}
                disabled={!filled}
                title={
                  filled
                    ? `Q${n} 클릭 시 미리보기 · ${q.image_url}`
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
        업로드 완료 {questions.length}/60 · 누락 {missing.length}건 · 녹색 셀 클릭 시 미리보기·수정·삭제
      </div>

      {/* 미리보기 모달 */}
      {previewQuestion && (
        <div
          onClick={closePreview}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
                  Q{previewQuestion.q_no}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {TRACKS.find((t) => t.code === track)?.label} · {previewQuestion.image_url}
                </div>
              </div>
              <button
                onClick={closePreview}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px 8px',
                }}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {/* 이미지 미리보기 */}
            <div
              style={{
                background: '#f5f5f5',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                minHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {previewLoading ? (
                <div style={{ color: '#666', fontSize: '13px' }}>이미지 로드 중...</div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Q${previewQuestion.q_no}`}
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ color: '#b91c1c', fontSize: '13px' }}>
                  이미지를 불러올 수 없습니다.
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => e.target.files?.[0] && handleReplaceImage(e.target.files[0])}
                disabled={replaceUploading}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => replaceInputRef.current?.click()}
                disabled={replaceUploading}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px',
                  background: replaceUploading ? '#9ca3af' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: replaceUploading ? 'not-allowed' : 'pointer',
                }}
              >
                {replaceUploading ? '업로드 중...' : '📝 이미지 수정 (교체)'}
              </button>
              <button
                onClick={() => handleDeleteQuestion(previewQuestion.q_no)}
                disabled={replaceUploading}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🗑 삭제
              </button>
              <button
                onClick={closePreview}
                style={{
                  minWidth: '80px',
                  padding: '10px',
                  background: 'white',
                  color: '#666',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '10px', lineHeight: 1.5 }}>
              • 이미지 수정: 같은 Q번호로 새 이미지가 덮어쓰기 됩니다<br />
              • 삭제: Storage 파일 + DB 기록이 함께 제거됩니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
