-- ============================================================
-- 메타인지 Day 4 (Step 1) — 회차 응시 현황 조회 RPC
-- ============================================================
-- 읽기 전용. 지점+트랙 학생 전체(대상)를 반환,
-- 각 학생마다 응시 여부 및 통계 포함(미응시자면 NULL).
--
-- 권한: super_admin 또는 branch_admin(자기 지점 세션만).
-- 반환 총 소요시간은 MAX(answered_at) - MIN(answered_at) (첫~마지막 답변)
-- ============================================================

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
  verify_count INT,
  verify_graded_count INT,
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
  -- 세션 확인
  SELECT * INTO v_session FROM metacog_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- 권한 체크: super_admin OR (branch_admin AND same branch)
  v_role := auth_app_role();
  v_branch_id := auth_app_branch_id();

  IF v_role NOT IN ('super_admin', 'branch_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;

  IF v_role = 'branch_admin' AND v_branch_id IS DISTINCT FROM v_session.branch_id THEN
    RAISE EXCEPTION 'Forbidden: session belongs to another branch';
  END IF;

  -- 지점+트랙 학생 전체(대상) + LEFT JOIN attempts + 통계
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
    COALESCE(vstat.verify_count, 0)::INT AS verify_count,
    COALESCE(vstat.verify_graded_count, 0)::INT AS verify_graded_count,
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
    SELECT
      COUNT(*)::INT AS verify_count,
      COUNT(*) FILTER (WHERE vi.correct IS NOT NULL)::INT AS verify_graded_count
    FROM metacog_verify_items vi
    WHERE vi.attempt_id = a.id
  ) vstat ON true
  WHERE s.branch_id = v_session.branch_id
    AND s.track = v_session.track
    AND s.active = true
  ORDER BY
    (a.id IS NULL) ASC,  -- 응시 완료 학생 먼저
    a.submitted_at DESC NULLS LAST,
    s.class_name,
    s.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_session_roster(UUID) TO authenticated;

COMMENT ON FUNCTION get_session_roster IS
  '회차의 대상 학생 전체 반환 + 응시자 통계. 미응시자는 attempt_id 등이 NULL.';

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT 'get_session_roster RPC 생성 확인' AS check,
       COUNT(*) AS rpc_count
FROM pg_proc WHERE proname = 'get_session_roster';

SELECT '✅ Day 4 Step 1 응시 현황 조회 RPC 완료' AS status;
