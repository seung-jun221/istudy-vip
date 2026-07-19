// 개별 학생 복습과제지 (A4 인쇄용)
// - 라우트: /admin/metacog/review-sheet/:attemptId
// - 관리자만 접근
// - get_review_sheet_data RPC로 데이터 조회
// - 대상: 'cannot' 판정 문항 전체 (자동 페이지 분할, 6문항/페이지)
// - 주황 헤더(#b5541f)로 검증지(딥그린)와 시각 구분
// - 이미지 안에 풀이 여백 포함 (별도 풀이 공간 없음)
// - signed URL 이미지 로딩 완료 대기 → 자동 window.print()

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';
import './ReviewSheetPage.css';

const BUCKET = 'metacog-questions';
const TRACK_LABELS = { mono: '모노', tri: '트라이', tetra: '테트라' };
const PER_PAGE = 6; // A4 2단×3행

function formatKoreanDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ReviewSheetPage() {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imagesReady, setImagesReady] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const printedRef = useRef(false);

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has('noprint')) setAutoPrint(false);
    } catch { /* ignore */ }
  }, []);

  // 데이터 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const { data: result, error: err } = await supabase.rpc(
        'get_review_sheet_data',
        { p_attempt_id: attemptId }
      );

      if (err || !result) {
        console.error('get_review_sheet_data 오류:', err);
        if (!cancelled) {
          setError(err?.message || '데이터를 불러올 수 없습니다.');
          setLoading(false);
        }
        return;
      }

      const items = result.cannot_items || [];
      const paths = items.map((it) => it.image_url).filter(Boolean);
      const urlMap = {};

      if (paths.length > 0) {
        const { data: urls, error: uErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(paths, 3600);
        if (uErr) {
          console.warn('signed URL 발급 실패:', uErr);
        } else if (urls) {
          items.forEach((it, i) => {
            if (urls[i]?.signedUrl) urlMap[it.q_no] = urls[i].signedUrl;
          });
        }
      }

      if (!cancelled) {
        setData(result);
        setSignedUrls(urlMap);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId]);

  // 이미지 로딩 완료 대기
  useEffect(() => {
    if (!data) return;
    const items = data.cannot_items || [];
    const urls = items.map((it) => signedUrls[it.q_no]).filter(Boolean);
    if (urls.length === 0) {
      setImagesReady(true);
      return;
    }
    let loaded = 0;
    const check = () => {
      loaded += 1;
      if (loaded >= urls.length) setImagesReady(true);
    };
    urls.forEach((u) => {
      const img = new Image();
      img.onload = check;
      img.onerror = check;
      img.src = u;
    });
  }, [data, signedUrls]);

  // 자동 인쇄
  useEffect(() => {
    if (!imagesReady || !autoPrint || printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [imagesReady, autoPrint]);

  if (loading) {
    return <div className="rs-loading"><div>복습과제지 준비 중...</div></div>;
  }
  if (error) {
    return <div className="rs-loading"><div>❌ {error}</div></div>;
  }

  const items = data.cannot_items || [];
  const pages = [];
  for (let i = 0; i < items.length; i += PER_PAGE) {
    pages.push(items.slice(i, i + PER_PAGE));
  }
  // 마지막 페이지 빈 슬롯 채움
  if (pages.length > 0) {
    const last = pages[pages.length - 1];
    while (last.length < PER_PAGE) last.push({ __empty: true });
  }
  if (pages.length === 0) {
    pages.push([
      { __empty: true, __message: "'모르겠다'로 판정한 문항이 없습니다." },
      ...Array(PER_PAGE - 1).fill({ __empty: true }),
    ]);
  }

  const meta = data;
  const totalCount = items.length;

  return (
    <>
      <div className="rs-toolbar no-print">
        <div>
          <b>{meta.student.name}</b> · {meta.session.title} · 복습 {totalCount}문항
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()}>🖨 인쇄</button>
          <button onClick={() => window.close()}>닫기</button>
        </div>
      </div>

      {pages.map((pageItems, pageIdx) => (
        <div className="rs-page" key={pageIdx}>
          <div className="rs-header">
            <div className="rs-title-area">
              <span className="rs-badge">복습 과제</span>
              <h1>모른다고 판단한 문항 복습</h1>
              <div className="rs-sub">
                아래 문항들은 본인이 "모르겠다"고 판단한 문항입니다. 개념을 다시 짚으며 풀어보세요.
              </div>
            </div>
            <div className="rs-meta">
              학생: <b>{meta.student.name}</b>
              {meta.student.class_name ? ` (${meta.student.class_name})` : ''}<br />
              회차: {meta.session.title}<br />
              트랙: {TRACK_LABELS[meta.session.track] || meta.session.track}<br />
              총 문항: <b>{totalCount}문항</b><br />
              응시일: {formatKoreanDate(meta.submitted_at)}
            </div>
          </div>

          <div className="rs-grid">
            {pageItems.map((it, i) => {
              if (it.__empty) {
                return (
                  <div className="rs-q-cell rs-q-empty" key={`e-${i}`}>
                    <div className="rs-q-body">
                      <div className="rs-empty-mark">{it.__message || '—'}</div>
                    </div>
                  </div>
                );
              }
              const url = signedUrls[it.q_no];
              return (
                <div className="rs-q-cell" key={it.q_no}>
                  <div className="rs-q-head">
                    <span className="rs-qno">Q{it.q_no}</span>
                    {it.forced && <span className="rs-tag">시간초과</span>}
                  </div>
                  <div className="rs-q-body">
                    {url ? (
                      <img src={url} alt={`Q${it.q_no}`} />
                    ) : (
                      <div className="rs-q-nope">이미지 없음</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rs-footer">
            <span>i.study {meta.branch.name}</span>
            <span>{pageIdx + 1} / {pages.length} 페이지</span>
          </div>
        </div>
      ))}
    </>
  );
}
