-- ============================================================
-- 메타인지 — 응시 초기화 RPC
-- ============================================================
-- 학생이 잘못 제출했거나 재응시 필요 시 관리자가 attempt를 삭제.
-- CASCADE로 metacog_answers, metacog_verify_items도 함께 삭제 →
-- UNIQUE(session_id, student_id) 제약이 해소되어 재응시 가능.
--
-- 권한: super_admin OR (branch_admin AND 자기 지점 세션)
-- ============================================================

DROP FUNCTION IF EXISTS reset_metacog_attempt(UUID);

CREATE OR REPLACE FUNCTION reset_metacog_attempt(p_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_role TEXT;
  v_branch_id TEXT;
  v_session_branch_id TEXT;
BEGIN
  v_role := auth_app_role();
  v_branch_id := auth_app_branch_id();

  IF v_role NOT IN ('super_admin', 'branch_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;

  -- attempt → session → branch 확인
  SELECT s.branch_id INTO v_session_branch_id
  FROM metacog_attempts a
  JOIN metacog_sessions s ON s.id = a.session_id
  WHERE a.id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  -- branch_admin 은 자기 지점만
  IF v_role = 'branch_admin' AND v_branch_id IS DISTINCT FROM v_session_branch_id THEN
    RAISE EXCEPTION 'Forbidden: attempt belongs to another branch';
  END IF;

  -- 실제 삭제 (CASCADE: answers, verify_items 자동 삭제)
  DELETE FROM metacog_attempts WHERE id = p_attempt_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_metacog_attempt(UUID) TO authenticated;

COMMENT ON FUNCTION reset_metacog_attempt IS
  '응시 초기화. attempt CASCADE 삭제로 answers/verify_items 함께 제거. 학생 재응시 가능해짐.';

-- 검증
SELECT 'reset_metacog_attempt RPC 확인' AS check, COUNT(*) AS rpc_count
FROM pg_proc WHERE proname = 'reset_metacog_attempt';

SELECT '✅ 응시 초기화 RPC 완료' AS status;
