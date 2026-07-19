// 학부모용 메타인지 결과 리포트
// - 라우트: /metacog-report/:attemptId
// - UUID = 인증 (진단검사 리포트와 동일 정책, anon 접근 허용)
// - 첨부 시안(bb39cf94-*.html) 그대로 이식: 딥그린/골드/아이보리 밝은 톤
// - 미채점 상태(verify.graded < verify.total) 시 검증 관련 부분을 "채점 대기 중"으로

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import './MetacogReportPage.css';

const TRACK_LABELS = { mono: '모노', tri: '트라이', tetra: '테트라' };

function formatKoreanDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 응시`;
}

// 4분면 유형 판정
// x = 있다 비율 (>=0.5 자신 있게 / <0.5 신중)
// y = 실제 정답률 (>=0.5 실제로 잘 앎 / <0.5 실제로는 약함)
function determineType(x, y) {
  const highX = x >= 0.5;
  const highY = y >= 0.5;
  if (highY && highX) {
    return {
      key: 'q1',
      title: '아는 것을 정확히 압니다',
      color: '#1a7a4a',
      bg: '#dbeee2',
      desc: '자기 실력을 정확히 파악하고 있습니다. 앞으로도 이 감각을 유지하며 다음 단계에 도전할 수 있습니다.',
    };
  }
  if (highY && !highX) {
    return {
      key: 'q2',
      title: '실력은 있는데, 자신을 낮게 봅니다',
      color: '#2b8a86',
      bg: '#e8f3ec',
      desc: '실제로 풀 수 있는 문제도 "모르겠다"고 판단하는 경향이 있습니다. 아는 것을 확신하지 못해 도전을 망설일 수 있어, 자신감을 키워주는 지도가 도움이 됩니다.',
    };
  }
  if (!highY && !highX) {
    return {
      key: 'q3',
      title: '기초부터 차근차근 다져야 합니다',
      color: '#b5541f',
      bg: '#fbece8',
      desc: '아직 아는 것과 모르는 것의 경계가 명확하지 않습니다. 기초 개념을 다시 짚으며 판단 근거를 만들어가야 합니다.',
    };
  }
  return {
    key: 'q4',
    title: '자신감이 실력보다 앞섭니다',
    color: '#c89216',
    bg: '#fdf4e3',
    desc: '"안다"고 판단한 문항 중 상당수를 실제로는 틀렸습니다. 정직한 자기평가 훈련이 필요합니다.',
  };
}

export default function MetacogReportPage() {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: result, error: err } = await supabase.rpc(
        'get_metacog_report',
        { p_attempt_id: attemptId }
      );
      if (err || !result) {
        if (!cancelled) {
          setError(err?.message || '리포트를 불러올 수 없습니다.');
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId]);

  // 4분면 계산
  const chart = useMemo(() => {
    if (!data) return null;
    const canRatio = data.stats.total_count > 0
      ? data.stats.can_count / data.stats.total_count
      : 0;
    const isFullyGraded =
      data.verify.total > 0 && data.verify.graded === data.verify.total;
    const correctRatio = isFullyGraded
      ? data.verify.correct / data.verify.total
      : null;
    const type =
      correctRatio != null ? determineType(canRatio, correctRatio) : null;
    return { canRatio, correctRatio, type, isFullyGraded };
  }, [data]);

  if (loading) {
    return (
      <div className="mr-loading">
        <div>리포트 준비 중...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mr-loading">
        <div>
          ❌ {error || '리포트를 찾을 수 없습니다.'}<br />
          <span style={{ fontSize: 12, color: '#999', marginTop: 8, display: 'block' }}>
            링크를 다시 확인해주세요.
          </span>
        </div>
      </div>
    );
  }

  const { student, session, stats, verify, cannot_qnos, submitted_at } = data;
  const isPartiallyGraded =
    verify.total > 0 && verify.graded < verify.total;
  const isFullyGraded =
    verify.total > 0 && verify.graded === verify.total;
  const noVerify = verify.total === 0;

  // 점 위치 % (4분면 안 좌표)
  // canRatio 0~1 → left 0%~100%
  // correctRatio 0~1 → top 100%~0% (위가 y 높음)
  const dotLeft = chart ? `${Math.max(5, Math.min(95, chart.canRatio * 100))}%` : '50%';
  const dotTop =
    chart?.correctRatio != null
      ? `${Math.max(5, Math.min(95, (1 - chart.correctRatio) * 100))}%`
      : '50%';

  return (
    <div className="mr-body">
      <div className="mr-sheet">

        {/* 헤더 */}
        <div className="mr-head">
          <span className="mr-badge">수리탐구 메타인지 트레이닝</span>
          <h1>
            <span className="mr-l1">메타인지 트레이닝</span>
            <br />
            <span className="mr-l2">결과 분석 보고서</span>
          </h1>
          <div className="mr-desc">
            우리 아이가 자기 실력을 얼마나 정확히<br />
            파악하고 있는지 진단한 결과입니다.
          </div>
          <div className="mr-who">
            <span>
              학생 <b>{student.name}</b>
              {student.class_name ? ` · ${student.class_name}` : ''}
            </span>
            <span>{formatKoreanDate(submitted_at)}</span>
          </div>
        </div>

        {/* 핵심 한 문장 */}
        <div className="mr-summary">
          <div className="mr-summary-label">한눈에 보기</div>
          {isFullyGraded ? (
            <p>
              <b>{student.name} 학생</b>은<br />
              {stats.total_count}문항 중 <b>{stats.can_count}문항</b>을 "풀 수 있다"고 판단했고,<br />
              이 중 무작위 <b>{verify.total}문항</b>을 실제로 풀어{' '}
              <span className="mr-hl"><b>{verify.correct}문항</b>을 맞혔습니다.</span>
            </p>
          ) : noVerify ? (
            <p>
              <b>{student.name} 학생</b>은<br />
              {stats.total_count}문항 모두를 "모르겠다"로 판단했습니다.<br />
              검증할 문항이 없어 처방 위주로 안내드립니다.
            </p>
          ) : (
            <p>
              <b>{student.name} 학생</b>은<br />
              {stats.total_count}문항 중 <b>{stats.can_count}문항</b>을 "풀 수 있다"고 판단했습니다.<br />
              검증 <b>{verify.total}문항</b> 채점이 완료되면{' '}
              <span className="mr-hl">자기인식 결과</span>가 함께 표시됩니다.
            </p>
          )}
        </div>

        {/* 통계 3칸 */}
        <div className="mr-stats">
          <div className="mr-stat">
            <div className="mr-num">{stats.can_count}</div>
            <div className="mr-lb">풀 수 있다</div>
          </div>
          <div className="mr-stat">
            <div className="mr-num">{stats.cannot_count}</div>
            <div className="mr-lb">모르겠다</div>
          </div>
          <div className="mr-stat mr-warn">
            <div className="mr-num">{stats.forced_count}</div>
            <div className="mr-lb">시간초과<br />(판단 못함)</div>
          </div>
        </div>

        {/* 자기인식 유형 (4분면) */}
        <div className="mr-section">
          <div className="mr-stitle">자기인식 유형</div>
          <div className="mr-ssub">
            가로는 '안다고 답한 비율', 세로는 '실제 정답률'입니다.
            두 축이 만나는 곳에 우리 아이가 있습니다.
          </div>

          {isFullyGraded && chart?.type ? (
            <>
              <div className="mr-quad-wrap">
                <div className="mr-lbl mr-lbl-top">실제로 잘 앎</div>
                <div className="mr-lbl mr-lbl-bottom">실제로는 약함</div>
                <div className="mr-lbl mr-lbl-left">신중하게 판단</div>
                <div className="mr-lbl mr-lbl-right">자신 있게 판단</div>

                <div className="mr-quad">
                  <div className="mr-q2">
                    <div className="mr-q-name">실력 있음 +<br />자신감 부족</div>
                  </div>
                  <div className="mr-q1">
                    <div className="mr-goal-arrow">↗ 목표</div>
                    <div className="mr-q-name">아는 것을<br />정확히 앎 ★</div>
                  </div>
                  <div className="mr-q3">
                    <div className="mr-q-name">기초부터<br />차근차근</div>
                  </div>
                  <div className="mr-q4">
                    <div className="mr-q-name">자신감이<br />앞섬</div>
                  </div>
                </div>

                <div className="mr-cross-v" />
                <div className="mr-cross-h" />

                <div className="mr-dot" style={{ left: dotLeft, top: dotTop }} />
              </div>
              <div className="mr-quad-note">
                {verify.total}문항 표본으로 측정한 경향성이며, 참고 지표입니다.
              </div>

              <div
                className="mr-type-card"
                style={{ background: chart.type.bg, borderLeftColor: chart.type.color }}
              >
                <div className="mr-t" style={{ color: chart.type.color }}>
                  {chart.type.title}
                </div>
                <div className="mr-d">{chart.type.desc}</div>
              </div>
            </>
          ) : (
            <div className="mr-pending">
              {noVerify
                ? "'풀 수 있다'로 판정한 문항이 없어 자기인식 유형 진단이 어렵습니다."
                : '검증 문항 채점이 완료되면 이 곳에 자기인식 유형이 표시됩니다.'}
            </div>
          )}
        </div>

        {/* 처방 */}
        <div className="mr-section">
          <div className="mr-stitle">이렇게 지도합니다</div>
          <div className="mr-ssub">진단으로 끝나지 않습니다. 결과에 맞춰 과제를 처방합니다.</div>

          <div className="mr-rx-item">
            <div className="mr-rx-ic">1</div>
            <div className="mr-rx-tx">
              <div className="mr-rt">복습 과제 · {stats.cannot_count}문항</div>
              <div className="mr-rd">
                "모르겠다"고 답한 문항 전체를 복습 과제로 제공합니다.
              </div>
            </div>
          </div>

          <div className="mr-rx-item">
            <div className="mr-rx-ic">2</div>
            <div className="mr-rx-tx">
              {isFullyGraded ? (
                verify.wrong > 0 ? (
                  <>
                    <div className="mr-rt">확인 학습 · {verify.wrong}문항</div>
                    <div className="mr-rd">
                      "안다"고 했으나 틀린 문항(<b>{verify.wrong}문항</b>)은
                      개념을 다시 짚어드립니다.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mr-rt">확인 학습 · 해당 없음</div>
                    <div className="mr-rd">
                      "안다"고 판단한 문항을 모두 정확히 알고 있었습니다.
                    </div>
                  </>
                )
              ) : isPartiallyGraded ? (
                <>
                  <div className="mr-rt">확인 학습 · 채점 대기 중</div>
                  <div className="mr-rd">
                    검증 문항 채점 완료 후 확정됩니다 ({verify.graded}/{verify.total} 채점).
                  </div>
                </>
              ) : noVerify ? (
                <>
                  <div className="mr-rt">확인 학습 · 해당 없음</div>
                  <div className="mr-rd">"안다"고 판단한 문항이 없어 확인 대상이 없습니다.</div>
                </>
              ) : (
                <>
                  <div className="mr-rt">확인 학습 · 채점 대기 중</div>
                  <div className="mr-rd">검증 문항 채점 완료 후 확정됩니다.</div>
                </>
              )}
            </div>
          </div>

          {/* 3번 처방: q1(진짜 아는) 유형은 별도 코칭 불필요 → 항목 자체 생략 */}
          {(!isFullyGraded || (chart?.type && chart.type.key !== 'q1')) && (
            <div className="mr-rx-item">
              <div className="mr-rx-ic">3</div>
              <div className="mr-rx-tx">
                {isFullyGraded && chart?.type ? (
                  <>
                    <div className="mr-rt">
                      {chart.type.key === 'q2' && '자신감 코칭'}
                      {chart.type.key === 'q3' && '기초 개념 정리'}
                      {chart.type.key === 'q4' && '정직한 자기평가 훈련'}
                    </div>
                    <div className="mr-rd">
                      {chart.type.key === 'q2' &&
                        '아는 것을 "안다"고 말할 수 있도록 발표·설명 훈련을 병행합니다.'}
                      {chart.type.key === 'q3' &&
                        '판단 근거가 될 기초 개념부터 다시 짚어 자기평가의 토대를 만듭니다.'}
                      {chart.type.key === 'q4' &&
                        '"확실할 때만 확실하다"고 말하는 훈련을 통해 자기평가 정확도를 높입니다.'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mr-rt">맞춤 코칭</div>
                    <div className="mr-rd">
                      검증 채점 완료 후 학생별 유형에 맞는 코칭 방향을 안내드립니다.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 마무리 */}
        <div className="mr-closing">
          <div className="mr-ct">점수보다 중요한 것</div>
          <p>
            성적표의 점수는 "지금 몇 점인가"를 말합니다.
            메타인지 진단은 "아이가 자기 실력을 정확히 아는가"를 봅니다.
            자기 실력을 아는 아이가 스스로 공부의 방향을 잡습니다.
            저희는 주기적으로 이 능력을 훈련합니다.
          </p>
          <div className="mr-foot">
            i.study 수리탐구학원<br />
            본 진단은 {verify.total || 5}문항 표본 검증으로, 경향성을 보는 참고 지표입니다.
          </div>
        </div>

        {/* 없다 문항 목록 (참고용, 최소 표기) */}
        {cannot_qnos && cannot_qnos.length > 0 && (
          <details className="mr-details">
            <summary>복습 과제 문항번호 보기 ({cannot_qnos.length}개)</summary>
            <div className="mr-qnos">
              {cannot_qnos.map((n) => (
                <span key={n} className="mr-qno-chip">Q{n}</span>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
