// 메타인지 모노 트랙 재배치 마이그레이션 (원샷, super_admin 전용)
// 라우트: /admin/metacog/migrate-mono-v2
//
// 작업:
//  1) 삭제 15문항: q_no ∈ DELETE_QNOS
//  2) 재배치 45문항: RENAME_MAPPING (old → new)
//  3) 1~15번 슬롯은 빈 상태 유지 (관리자가 나중에 업로드)
//
// 실행 흐름:
//  · 프리플라이트: 현재 DB 상태 조회, 예정 작업 요약, 누락 경고
//  · [백업 다운로드]: 현재 DB 상태를 JSON 파일로 저장
//  · [실행]: 확인 다이얼로그 → 실제 실행 → 실시간 로그
//
// 안전장치:
//  · UNIQUE(track, q_no) 충돌 방지: 2-phase (임시 번호 → 최종 번호)
//  · Storage 파일 이동도 2-phase (mono/_tmp_N.png → mono/qNN.png)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';
import { useAdmin } from '../../../context/AdminContext';

const TRACK = 'mono';
const BUCKET = 'metacog-questions';

// 삭제 대상 15문항
const DELETE_QNOS = [1, 2, 3, 4, 5, 6, 7, 21, 22, 27, 32, 33, 43, 44, 51];

// 재배치 매핑 (old_q_no → new_q_no) 45문항
const RENAME_MAPPING = {
  49: 16, 50: 17, 55: 18, 58: 19, 37: 20, 40: 21, 42: 22, 18: 23, 20: 24, 10: 25,
  8: 26, 9: 27, 11: 28, 12: 29, 13: 30, 14: 31, 15: 32, 16: 33, 17: 34, 19: 35,
  23: 36, 24: 37, 25: 38, 26: 39, 28: 40, 29: 41, 30: 42, 31: 43, 34: 44, 35: 45,
  36: 46, 38: 47, 39: 48, 41: 49, 45: 50, 46: 51, 47: 52, 48: 53, 52: 54, 53: 55,
  54: 56, 56: 57, 57: 58, 59: 59, 60: 60,
};

const SQL_DROP = `-- 마이그레이션 실행 전 (CHECK 임시 해제)
ALTER TABLE metacog_questions
  DROP CONSTRAINT IF EXISTS metacog_questions_q_no_check;`;

const SQL_READD = `-- 마이그레이션 완료 후 (CHECK 복구)
ALTER TABLE metacog_questions
  ADD CONSTRAINT metacog_questions_q_no_check
  CHECK (q_no BETWEEN 1 AND 60);`;

const pad2 = (n) => String(n).padStart(2, '0');
const finalPath = (n) => `${TRACK}/q${pad2(n)}.png`;
const tempPath = (n) => `${TRACK}/_tmp_${n}.png`;
const oldPath = (n) => `${TRACK}/q${pad2(n)}.png`;

export default function MigrateMonoV2Page() {
  const navigate = useNavigate();
  const { authMode } = useAdmin();

  const [currentState, setCurrentState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);

  const isSuper = authMode === 'super';

  const appendLog = (msg, type = 'info') => {
    setLogs((prev) => [
      ...prev,
      { t: new Date().toISOString().slice(11, 19), msg, type },
    ]);
  };

  // 현재 모노 상태 조회
  const loadState = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('metacog_questions')
      .select('q_no, image_url')
      .eq('track', TRACK)
      .order('q_no');

    if (err) {
      setError('현재 상태 조회 실패: ' + err.message);
      setLoading(false);
      return;
    }
    setCurrentState(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuper) loadState();
  }, [isSuper]);

  // 프리플라이트: 매핑과 현재 상태 대조
  const preflight = () => {
    if (!currentState) return null;
    const currentSet = new Set(currentState.map((q) => q.q_no));

    const willDelete = DELETE_QNOS.filter((n) => currentSet.has(n));
    const missingDelete = DELETE_QNOS.filter((n) => !currentSet.has(n));

    const willRename = Object.entries(RENAME_MAPPING)
      .filter(([oldNo]) => currentSet.has(parseInt(oldNo)))
      .map(([oldNo, newNo]) => ({ oldNo: parseInt(oldNo), newNo }));
    const missingRename = Object.entries(RENAME_MAPPING)
      .filter(([oldNo]) => !currentSet.has(parseInt(oldNo)))
      .map(([oldNo, newNo]) => ({ oldNo: parseInt(oldNo), newNo }));

    return { willDelete, missingDelete, willRename, missingRename };
  };

  const pf = preflight();

  // 백업 JSON 다운로드
  const downloadBackup = () => {
    if (!currentState) return;
    const backup = {
      track: TRACK,
      exported_at: new Date().toISOString(),
      count: currentState.length,
      rows: currentState,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metacog_mono_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const execute = async () => {
    const msg =
      '⚠️ 되돌릴 수 없는 작업입니다.\n\n' +
      `· 삭제 예정: ${pf.willDelete.length}문항 (이미 0이면 건너뜀)\n` +
      `· 재배치 예정: ${pf.willRename.length}문항\n\n` +
      '⚠️ q_no CHECK 제약을 미리 DROP 하셨나요?\n' +
      '   (아래 [사전 SQL] 을 Supabase SQL Editor에서 먼저 실행)\n\n' +
      '계속하시겠습니까?';
    if (!window.confirm(msg)) return;

    setRunning(true);
    setLogs([]);
    setDone(false);

    try {
      appendLog('=== 1단계: 삭제 15문항 ===');

      if (pf.willDelete.length === 0) {
        appendLog('삭제 대상 없음 — 이미 완료된 것으로 판단, 건너뜀', 'info');
      }

      // 1a. Storage 파일 삭제
      const delPaths = pf.willDelete.map((n) => oldPath(n));
      if (delPaths.length > 0) {
        const { error: delStErr } = await supabase.storage
          .from(BUCKET)
          .remove(delPaths);
        if (delStErr) appendLog(`Storage 삭제 경고: ${delStErr.message}`, 'warn');
        else appendLog(`Storage: ${delPaths.length}개 파일 삭제 완료`, 'ok');
      }

      // 1b. DB 삭제
      if (pf.willDelete.length > 0) {
        const { error: delDbErr } = await supabase
          .from('metacog_questions')
          .delete()
          .eq('track', TRACK)
          .in('q_no', pf.willDelete);
        if (delDbErr) throw new Error('DB 삭제 실패: ' + delDbErr.message);
        appendLog(`DB: ${pf.willDelete.length}행 삭제 완료`, 'ok');
      }

      appendLog('=== 2단계: 재배치 45문항 (Phase A - 임시로 이동) ===');

      // 2A. Storage 임시 이동 + DB 임시 번호(+1000)로 UPDATE
      let phaseAOk = 0;
      let phaseAWarn = 0;
      for (const { oldNo, newNo } of pf.willRename) {
        const from = oldPath(oldNo);
        const to = tempPath(newNo);

        // Storage move (old → temp)
        const { error: mvErr } = await supabase.storage
          .from(BUCKET)
          .move(from, to);
        if (mvErr) {
          appendLog(
            `Storage 경고(${oldNo}→_tmp_${newNo}): ${mvErr.message}`,
            'warn'
          );
          phaseAWarn += 1;
        }

        // DB update (q_no → 1000+newNo, image_url → temp path)
        const { error: upErr } = await supabase
          .from('metacog_questions')
          .update({
            q_no: 1000 + newNo,
            image_url: to,
            updated_at: new Date().toISOString(),
          })
          .eq('track', TRACK)
          .eq('q_no', oldNo);

        if (upErr) throw new Error(`DB 임시 UPDATE 실패(${oldNo}): ${upErr.message}`);
        phaseAOk += 1;
      }
      appendLog(
        `Phase A 완료: DB ${phaseAOk}건 임시 번호로 이동, Storage 경고 ${phaseAWarn}건`,
        'ok'
      );

      appendLog('=== 2단계: 재배치 45문항 (Phase B - 최종 번호로 확정) ===');

      // 2B. Storage 임시 → 최종 + DB 임시 → 최종 q_no로 UPDATE
      let phaseBOk = 0;
      let phaseBWarn = 0;
      for (const { newNo } of pf.willRename) {
        const from = tempPath(newNo);
        const to = finalPath(newNo);

        // Storage move (temp → final)
        const { error: mvErr } = await supabase.storage
          .from(BUCKET)
          .move(from, to);
        if (mvErr) {
          appendLog(
            `Storage 경고(_tmp_${newNo}→q${pad2(newNo)}): ${mvErr.message}`,
            'warn'
          );
          phaseBWarn += 1;
        }

        // DB update (1000+newNo → newNo, image_url → final path)
        const { error: upErr } = await supabase
          .from('metacog_questions')
          .update({
            q_no: newNo,
            image_url: to,
            updated_at: new Date().toISOString(),
          })
          .eq('track', TRACK)
          .eq('q_no', 1000 + newNo);

        if (upErr) throw new Error(`DB 최종 UPDATE 실패(${newNo}): ${upErr.message}`);
        phaseBOk += 1;
      }
      appendLog(
        `Phase B 완료: DB ${phaseBOk}건 최종 번호로 확정, Storage 경고 ${phaseBWarn}건`,
        'ok'
      );

      appendLog('=== 완료 ===', 'ok');
      appendLog(
        '⚠️ 지금 [② 사후 SQL]을 Supabase SQL Editor에서 실행해 CHECK 제약을 복구하세요.',
        'warn'
      );
      appendLog(
        '1~15번 슬롯은 비어있습니다. 관리자 문항 페이지에서 업로드하세요.',
        'info'
      );

      setDone(true);
      loadState(); // 새 상태 재조회
    } catch (e) {
      console.error(e);
      appendLog('❌ 오류 발생 — 중단: ' + e.message, 'err');
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  if (!isSuper) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
        super_admin 계정만 접근 가능합니다.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => navigate('/admin/metacog')}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: 'white',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← 메타인지 관리
        </button>
        <h1 style={{ fontSize: 20, margin: 0 }}>모노 트랙 재배치 마이그레이션 (v2)</h1>
      </div>

      <div
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 14,
          marginBottom: 16,
          fontSize: 13,
          lineHeight: 1.6,
          color: '#7f1d1d',
        }}
      >
        <b>⚠️ 되돌릴 수 없는 작업입니다.</b><br />
        · 15문항 <b>삭제</b> (DB + Storage) — 이미 완료됐으면 자동 건너뜀<br />
        · 45문항 <b>재배치</b> (q_no + Storage 파일명)<br />
        · 1~15번 슬롯은 <b>빈 상태</b>로 유지 (수동 업로드 대기)<br /><br />
        <b>실행 전 반드시 백업하세요:</b><br />
        1) 아래 [백업 JSON 다운로드] 로 DB 상태 저장<br />
        2) Supabase 대시보드 → Storage → <code>metacog-questions/mono/</code> 파일 전체 다운로드
      </div>

      {/* CHECK 제약 안내 - 사전/사후 SQL */}
      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 8,
          padding: 14,
          marginBottom: 16,
          fontSize: 13,
          lineHeight: 1.6,
          color: '#78350f',
        }}
      >
        <b>⚠️ q_no CHECK 제약 해제 필요</b><br />
        임시 번호(1000+)가 <code>q_no BETWEEN 1 AND 60</code> 제약에 걸립니다.
        아래 SQL을 Supabase SQL Editor에서 순서대로 실행해주세요.
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>① 사전 SQL — 마이그레이션 실행 전</b>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SQL_DROP);
                alert('사전 SQL이 복사되었습니다.');
              }}
              style={{ ...btnStyle, padding: '4px 10px', fontSize: 11, background: '#0d3b2e', color: 'white' }}
            >
              복사
            </button>
          </div>
          <pre style={sqlPreStyle}>{SQL_DROP}</pre>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>② 사후 SQL — 마이그레이션 완료 후</b>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SQL_READD);
                alert('사후 SQL이 복사되었습니다.');
              }}
              style={{ ...btnStyle, padding: '4px 10px', fontSize: 11, background: '#0d3b2e', color: 'white' }}
            >
              복사
            </button>
          </div>
          <pre style={sqlPreStyle}>{SQL_READD}</pre>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
          현재 상태 로드 중...
        </div>
      ) : error ? (
        <div style={{ color: '#b91c1c' }}>{error}</div>
      ) : pf ? (
        <>
          {/* 프리플라이트 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, margin: '0 0 10px', color: '#0d3b2e' }}>
              프리플라이트 (실행 예정 작업)
            </h3>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              현재 DB 등록 문항: <b>{currentState.length}개</b><br />
              삭제 예정: <b>{pf.willDelete.length}개</b> (계획 15개 중)<br />
              재배치 예정: <b>{pf.willRename.length}개</b> (계획 45개 중)
            </div>

            {pf.missingDelete.length > 0 && (
              <div style={warnBoxStyle}>
                <b>⚠️ 삭제 대상 중 DB에 없는 q_no:</b><br />
                {pf.missingDelete.map((n) => `q${pad2(n)}`).join(', ')}<br />
                <small>이미 삭제됐거나 원래부터 없었을 수 있음. 무해합니다.</small>
              </div>
            )}
            {pf.missingRename.length > 0 && (
              <div style={warnBoxStyle}>
                <b>⚠️ 재배치 대상 중 DB에 없는 q_no:</b><br />
                {pf.missingRename
                  .map((r) => `q${pad2(r.oldNo)}→${r.newNo}`)
                  .join(', ')}<br />
                <small>Storage 파일이 이미 없으면 경고만 뜨고 진행됩니다.</small>
              </div>
            )}
          </div>

          {/* 액션 */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={downloadBackup}
                style={{ ...btnStyle, background: '#0d3b2e', color: 'white' }}
              >
                📥 백업 JSON 다운로드
              </button>
              <button
                onClick={execute}
                disabled={running || done || currentState.length === 0}
                style={{
                  ...btnStyle,
                  background: done ? '#9ca3af' : '#a8543f',
                  color: 'white',
                  opacity: running || currentState.length === 0 ? 0.5 : 1,
                  cursor: running || done ? 'not-allowed' : 'pointer',
                }}
              >
                {running ? '실행 중...' : done ? '실행 완료' : '🚀 마이그레이션 실행'}
              </button>
              <button
                onClick={loadState}
                disabled={running}
                style={{ ...btnStyle, background: 'white', color: '#333', border: '1px solid #d1d5db' }}
              >
                🔄 상태 새로고침
              </button>
            </div>
          </div>

          {/* 실행 로그 */}
          {logs.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 15, margin: '0 0 10px', color: '#0d3b2e' }}>
                실행 로그
              </h3>
              <div
                style={{
                  background: '#111',
                  color: '#e5e7eb',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1.6,
                  maxHeight: 400,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {logs.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      color:
                        l.type === 'err'
                          ? '#fca5a5'
                          : l.type === 'warn'
                          ? '#fcd34d'
                          : l.type === 'ok'
                          ? '#86efac'
                          : '#e5e7eb',
                    }}
                  >
                    [{l.t}] {l.msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 현재 상태 미리보기 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, margin: '0 0 10px', color: '#0d3b2e' }}>
              현재 등록된 q_no ({currentState.length}개)
            </h3>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
              {currentState.map((q) => q.q_no).sort((a, b) => a - b).join(', ') || '(없음)'}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const cardStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
};

const btnStyle = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const warnBoxStyle = {
  marginTop: 10,
  padding: '10px 12px',
  background: '#fffbeb',
  border: '1px solid #fcd34d',
  color: '#92400e',
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 1.6,
};

const sqlPreStyle = {
  background: '#1f2937',
  color: '#e5e7eb',
  padding: 10,
  borderRadius: 6,
  fontSize: 11.5,
  lineHeight: 1.5,
  marginTop: 6,
  overflowX: 'auto',
  fontFamily: 'monospace',
  whiteSpace: 'pre',
};
