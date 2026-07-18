// 개별 학생 검증지 (A4 인쇄용)
// - 라우트: /admin/metacog/verify-sheet/:attemptId
// - 관리자만 접근 (ProtectedRoute)
// - get_verify_sheet_data RPC로 데이터 조회
// - signed URL 이미지 로딩 완료 대기 → 자동 window.print() 트리거
// - 레이아웃: 첨부 시안 그대로 (A4, 2단×2행 4문항/페이지, 5문항 → 2페이지)
// - 색상: 딥그린 #0D3B2E, 골드 #D4A537, 아이보리 #F5F1E8
// - unit_tag는 이번엔 표시 안 함 (지시서 명시)

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';
import './VerifySheetPage.css';

const BUCKET = 'metacog-questions';
const TRACK_LABELS = { mono: '모노', tri: '트라이', tetra: '테트라' };
const PER_PAGE = 4;

function formatKoreanDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function VerifySheetPage() {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [signedUrls, setSignedUrls] = useState({}); // q_no → url
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imagesReady, setImagesReady] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true); // ?noprint 붙이면 자동 인쇄 안 함
  const printedRef = useRef(false);

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has('noprint')) setAutoPrint(false);
    } catch { /* ignore */ }
  }, []);

  // 1) 데이터 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const { data: result, error: err } = await supabase.rpc(
        'get_verify_sheet_data',
        { p_attempt_id: attemptId }
      );

      if (err || !result) {
        console.error('get_verify_sheet_data 오류:', err);
        if (!cancelled) {
          setError(err?.message || '데이터를 불러올 수 없습니다.');
          setLoading(false);
        }
        return;
      }

      // signed URLs 발급
      const items = result.verify_items || [];
      const paths = items.map((it) => it.image_url).filter(Boolean);
      const urlMap = {};

      if (paths.length > 0) {
        const { data: urls, error: uErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(paths, 3600);
        if (uErr) {
          console.warn('signed URL 발급 실패(문항번호만 표시):', uErr);
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

  // 2) 이미지 로딩 완료 대기
  useEffect(() => {
    if (!data) return;
    const items = data.verify_items || [];
    const urls = items.map((it) => signedUrls[it.q_no]).filter(Boolean);

    if (urls.length === 0) {
      // 이미지 없어도 인쇄 진행
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
      img.onerror = check; // 실패해도 카운트 (무한 대기 방지)
      img.src = u;
    });
  }, [data, signedUrls]);

  // 3) 이미지 준비 되면 자동 print (한 번만)
  useEffect(() => {
    if (!imagesReady || !autoPrint || printedRef.current) return;
    printedRef.current = true;
    // 브라우저가 이미지를 실제로 렌더할 여유 시간 (500ms)
    const t = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(t);
  }, [imagesReady, autoPrint]);

  if (loading) {
    return (
      <div className="vs-loading">
        <div>검증지 준비 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vs-loading">
        <div>❌ {error}</div>
      </div>
    );
  }

  const items = data.verify_items || [];
  const pages = [];
  for (let i = 0; i < items.length; i += PER_PAGE) {
    pages.push(items.slice(i, i + PER_PAGE));
  }
  // 마지막 페이지가 4개 미만이면 빈 슬롯으로 채움
  if (pages.length > 0) {
    const last = pages[pages.length - 1];
    while (last.length < PER_PAGE) last.push({ __empty: true });
  }
  if (pages.length === 0) {
    // 검증 문항 0개 — 안내 페이지
    pages.push([
      { __empty: true, __message: "'있다'로 판정한 문항이 없어 검증 대상이 없습니다." },
      ...Array(PER_PAGE - 1).fill({ __empty: true }),
    ]);
  }

  const meta = data;

  return (
    <>
      {/* 툴바 (화면 전용) */}
      <div className="vs-toolbar no-print">
        <div>
          <b>{meta.student.name}</b> · {meta.session.title}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()}>🖨 인쇄</button>
          <button onClick={() => window.close()}>닫기</button>
        </div>
      </div>

      {/* 페이지들 */}
      {pages.map((pageItems, pageIdx) => (
        <div className="vs-page" key={pageIdx}>
          {/* 헤더 */}
          <div className="vs-header">
            <div className="vs-title-area">
              <span className="vs-badge">메타인지 검증</span>
              <h1>안다고 답한 문항 확인 테스트</h1>
              <div className="vs-sub">
                아래 {items.length}문항은 본인이 "풀 수 있다"고 판단한 문항입니다.
              </div>
            </div>
            <div className="vs-meta">
              학생: <b>{meta.student.name}</b>
              {meta.student.class_name ? ` (${meta.student.class_name})` : ''}<br />
              회차: {meta.session.title}<br />
              트랙: {TRACK_LABELS[meta.session.track] || meta.session.track}<br />
              응시일: {formatKoreanDate(meta.submitted_at)}
            </div>
          </div>

          {/* 안내 (1페이지만) */}
          {pageIdx === 0 && (
            <div className="vs-notice">
              <b>안내</b> · 각 문항을 실제로 풀어 답을 적으세요. 문항번호는 원본 문제지 기준입니다.
              채점 후 <b>틀린 문항 1개당 추가 과제</b>가 부과됩니다.
              스스로 안다고 판단한 문항이니 신중하게 작성하세요.
            </div>
          )}

          {/* 문항 그리드 (2×2) */}
          <div className="vs-grid">
            {pageItems.map((it, i) => {
              if (it.__empty) {
                return (
                  <div className="vs-q-cell vs-q-empty" key={`e-${i}`}>
                    <div className="vs-q-body">
                      <div className="vs-empty-mark">
                        {it.__message || '—'}
                      </div>
                    </div>
                  </div>
                );
              }
              const url = signedUrls[it.q_no];
              return (
                <div className="vs-q-cell" key={it.q_no}>
                  <div className="vs-q-head">
                    <span className="vs-qno">Q{it.q_no}</span>
                  </div>
                  <div className="vs-q-body">
                    {url ? (
                      <img src={url} alt={`Q${it.q_no}`} />
                    ) : (
                      <div className="vs-q-nope">이미지 없음</div>
                    )}
                  </div>
                  <div className="vs-q-answer">풀이 / 답:</div>
                </div>
              );
            })}
          </div>

          {/* 푸터 */}
          <div className="vs-footer">
            <span>i.study {meta.branch.name}</span>
            <span>{pageIdx + 1} / {pages.length} 페이지</span>
          </div>
        </div>
      ))}
    </>
  );
}
