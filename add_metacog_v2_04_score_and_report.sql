-- ============================================================
-- 메타인지 v2 — Phase 3: 점수 산출 + 리포트/현황 RPC 재작성
-- ============================================================

-- ------------------------------------------------------------
-- 점수 산출 헬퍼 (내부 SQL)
--   측정유보: 누테 25 중 '모른다' 8개 이상, 또는 안다한 누테 0개
--   기본점수 = 100 - (60 중 모른다 개수)
--   정답률   = (안다한 누테 중 정답 수) / (안다한 누테 수)
--   최종점수 = round(기본점수 × 정답률)
-- 등급: 85+매우우수 / 75+우수 / 60+보통 / 50+미흡 / -매우미흡
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS calc_metacog_score(UUID);

CREATE OR REPLACE FUNCTION calc_metacog_score(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_total_cannot INT;     -- 60 중 모른다 개수
  v_nute_cannot INT;      -- 누테 25 중 모른다 개수
  v_nute_can INT;         -- 누테 25 중 안다 개수
  v_nute_can_correct INT; -- 안다한 누테 중 정답 수
  v_nute_can_graded INT;  -- 안다한 누테 중 채점 완료 수
  v_nute_graded_total INT; -- 누테 25 중 채점 완료 수 (모든 판정 통합)
  v_base_score INT;
  v_accuracy NUMERIC;
  v_final_score INT;
  v_grade TEXT;
  v_reserved BOOLEAN := false;
  v_reason TEXT := NULL;
BEGIN
  -- 답변 집계
  SELECT
    COUNT(*) FILTER (WHERE judgment = 'cannot'),
    COUNT(*) FILTER (WHERE q_no BETWEEN 1 AND 25 AND judgment = 'cannot'),
    COUNT(*) FILTER (WHERE q_no BETWEEN 1 AND 25 AND judgment = 'can')
  INTO v_total_cannot, v_nute_cannot, v_nute_can
  FROM metacog_answers
  WHERE attempt_id = p_attempt_id;

  -- 채점 집계 (안다한 누테 문항 중)
  SELECT
    COUNT(*) FILTER (WHERE g.correct = true),
    COUNT(*)
  INTO v_nute_can_correct, v_nute_can_graded
  FROM metacog_nute_grades g
  JOIN metacog_answers a
    ON a.attempt_id = g.attempt_id AND a.q_no = g.q_no
  WHERE g.attempt_id = p_attempt_id
    AND a.judgment = 'can';

  -- 누테 전체 채점 진행 상태 (25문항 전부 채점됐는지)
  SELECT COUNT(*)::INT INTO v_nute_graded_total
  FROM metacog_nute_grades
  WHERE attempt_id = p_attempt_id;

  -- 측정유보 조건
  IF v_nute_cannot >= 8 THEN
    v_reserved := true;
    v_reason := '누테 25문항 중 모른다 판정이 8개 이상';
  ELSIF v_nute_can = 0 THEN
    v_reserved := true;
    v_reason := '누테 25문항 중 안다 판정이 없음';
  END IF;

  -- 점수 산출
  v_base_score := 100 - v_total_cannot;

  IF v_reserved THEN
    v_final_score := NULL;
    v_grade := '측정유보';
    v_accuracy := NULL;
  ELSIF v_nute_can > 0 AND v_nute_can_graded = v_nute_can THEN
    -- 안다한 누테 문항이 모두 채점 완료된 경우에만 점수 확정
    v_accuracy := v_nute_can_correct::NUMERIC / v_nute_can::NUMERIC;
    v_final_score := ROUND(v_base_score * v_accuracy);

    v_grade := CASE
      WHEN v_final_score >= 85 THEN '매우우수'
      WHEN v_final_score >= 75 THEN '우수'
      WHEN v_final_score >= 60 THEN '보통'
      WHEN v_final_score >= 50 THEN '미흡'
      ELSE '매우미흡'
    END;
  ELSE
    -- 채점 대기 상태
    v_final_score := NULL;
    v_grade := NULL;
    v_accuracy := NULL;
  END IF;

  RETURN jsonb_build_object(
    'reserved', v_reserved,
    'reserved_reason', v_reason,
    'base_score', v_base_score,
    'nute_can', v_nute_can,
    'nute_can_correct', v_nute_can_correct,
    'nute_can_graded', v_nute_can_graded,
    'nute_cannot', v_nute_cannot,
    'nute_graded_total', v_nute_graded_total,
    'total_cannot', v_total_cannot,
    'accuracy', v_accuracy,
    'final_score', v_final_score,
    'grade', v_grade,
    'is_fully_graded', (v_nute_can > 0 AND v_nute_can_graded = v_nute_can),
    -- 리포트에서 참고할 편의 필드
    'is_scored', v_final_score IS NOT NULL,
    'is_reserved', v_reserved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION calc_metacog_score(UUID) TO anon, authenticated;

COMMENT ON FUNCTION calc_metacog_score IS
  '메타인지 점수 산출. 측정유보/채점대기/점수확정 3상태.';

-- ------------------------------------------------------------
-- get_metacog_report — 학부모 리포트용 (anon 접근)
--   v2: 점수 필드 포함, 4분면 데이터 제거
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_metacog_report(UUID);

CREATE OR REPLACE FUNCTION get_metacog_report(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_attempt_id IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'attempt_id', a.id,
    'submitted_at', a.submitted_at,
    'student', jsonb_build_object(
      'name', st.name,
      'class_name', st.class_name
    ),
    'session', jsonb_build_object(
      'title', ses.title,
      'track', ses.track
    ),
    'stats', (
      SELECT jsonb_build_object(
        'can_count', COUNT(*) FILTER (WHERE judgment = 'can'),
        'cannot_count', COUNT(*) FILTER (WHERE judgment = 'cannot'),
        'forced_count', COUNT(*) FILTER (WHERE forced = true),
        'total_count', COUNT(*)
      )
      FROM metacog_answers ma
      WHERE ma.attempt_id = a.id
    ),
    'score', calc_metacog_score(a.id),
    'cannot_qnos', (
      SELECT COALESCE(jsonb_agg(q_no ORDER BY q_no), '[]'::jsonb)
      FROM metacog_answers ma
      WHERE ma.attempt_id = a.id AND ma.judgment = 'cannot'
    )
  )
  INTO v_result
  FROM metacog_attempts a
  JOIN students st ON st.id = a.student_id
  JOIN metacog_sessions ses ON ses.id = a.session_id
  WHERE a.id = p_attempt_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_metacog_report(UUID) TO anon, authenticated;

COMMENT ON FUNCTION get_metacog_report IS
  'v2 학부모 리포트. 점수/등급 포함, 4분면 데이터 없음.';

-- ------------------------------------------------------------
-- get_session_roster — 관리자 응시 현황
--   v2: verify_count/verify_graded_count → nute_graded/nute_total 로 교체
--       final_score/grade 반영
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_session_roster(UUID);

CREATE OR REPLACE FUNCTION get_session_roster(p_session_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  class_name TEXT,
  attempt_id UUID,
  submitted_at TIMESTAMPTZ,
  can_count INT,
  cannot_count INT,
  forced_count INT,
  nute_graded_count INT,   -- 누테 25 중 채점 완료 수
  nute_total INT,          -- 항상 25
  final_score INT,          -- NULL: 채점 대기 또는 측정유보
  grade TEXT,               -- NULL 또는 등급 문자열('매우우수'.. '매우미흡'.. '측정유보')
  is_reserved BOOLEAN,
  total_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_session RECORD;
  v_role TEXT;
  v_branch_id TEXT;
BEGIN
  SELECT * INTO v_session FROM metacog_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_role := auth_app_role();
  v_branch_id := auth_app_branch_id();

  IF v_role NOT IN ('super_admin', 'branch_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;
  IF v_role = 'branch_admin' AND v_branch_id IS DISTINCT FROM v_session.branch_id THEN
    RAISE EXCEPTION 'Forbidden: session belongs to another branch';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.class_name,
    a.id AS attempt_id,
    a.submitted_at,
    COALESCE(stat.can_count, 0)::INT AS can_count,
    COALESCE(stat.cannot_count, 0)::INT AS cannot_count,
    COALESCE(stat.forced_count, 0)::INT AS forced_count,
    COALESCE(ng.graded_count, 0)::INT AS nute_graded_count,
    25 AS nute_total,
    (sc.data->>'final_score')::INT AS final_score,
    (sc.data->>'grade') AS grade,
    COALESCE((sc.data->>'reserved')::BOOLEAN, false) AS is_reserved,
    stat.total_seconds
  FROM students s
  LEFT JOIN metacog_attempts a
    ON a.student_id = s.id
   AND a.session_id = p_session_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE ans.judgment = 'can')     AS can_count,
      COUNT(*) FILTER (WHERE ans.judgment = 'cannot')  AS cannot_count,
      COUNT(*) FILTER (WHERE ans.forced = true)        AS forced_count,
      EXTRACT(EPOCH FROM (MAX(ans.answered_at) - MIN(ans.answered_at)))::INT AS total_seconds
    FROM metacog_answers ans
    WHERE ans.attempt_id = a.id
  ) stat ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS graded_count
    FROM metacog_nute_grades g
    WHERE g.attempt_id = a.id
  ) ng ON true
  LEFT JOIN LATERAL (
    SELECT calc_metacog_score(a.id) AS data
  ) sc ON a.id IS NOT NULL
  WHERE s.branch_id = v_session.branch_id
    AND s.track = v_session.track
    AND s.active = true
  ORDER BY
    (a.id IS NULL) ASC,
    a.submitted_at DESC NULLS LAST,
    s.class_name,
    s.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_session_roster(UUID) TO authenticated;

COMMENT ON FUNCTION get_session_roster IS
  'v2 회차 응시 현황. 점수/등급/측정유보 포함, verify_items 폐기.';

SELECT '✅ v2 점수 산출 + 리포트/현황 RPC 완료' AS status;
