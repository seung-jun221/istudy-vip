-- ============================================================
-- 메타인지 Day 4 (Step 2) — 검증 문항 채점 RPC
-- ============================================================
-- 관리자가 학생의 검증 5문항(있다 중 랜덤 고정된)을 실제 풀이
-- 결과와 대조하여 O/X를 저장.
--
-- 권한: super_admin OR (branch_admin AND 자기 지점 세션)
-- 대상: 미채점 문항만이 아니라 이미 채점된 것도 UPDATE 허용
--       (재채점 필요 시 대비)
-- ============================================================

DROP FUNCTION IF EXISTS grade_verify_items(UUID, JSONB);

CREATE OR REPLACE FUNCTION grade_verify_items(
  p_attempt_id UUID,
  p_results JSONB  -- [{"q_no": 17, "correct": true}, ...]
)
RETURNS TABLE (updated_count INT, verify_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_role TEXT;
  v_branch_id TEXT;
  v_attempt RECORD;
  v_session_branch_id TEXT;
  v_updated INT := 0;
  v_total INT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 권한 확인
  v_role := auth_app_role();
  v_branch_id := auth_app_branch_id();

  IF v_role NOT IN ('super_admin', 'branch_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;

  -- attempt → session → branch 조회
  SELECT a.*, s.branch_id AS session_branch_id
  INTO v_attempt
  FROM metacog_attempts a
  JOIN metacog_sessions s ON s.id = a.session_id
  WHERE a.id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  v_session_branch_id := v_attempt.session_branch_id;

  -- branch_admin은 자기 지점만
  IF v_role = 'branch_admin' AND v_branch_id IS DISTINCT FROM v_session_branch_id THEN
    RAISE EXCEPTION 'Forbidden: attempt belongs to another branch';
  END IF;

  -- 입력 검증
  IF p_results IS NULL OR jsonb_typeof(p_results) != 'array' THEN
    RAISE EXCEPTION 'results must be a JSON array';
  END IF;

  -- UPDATE: 해당 attempt의 verify_items 중 q_no 매칭되는 행만
  -- correct는 true/false만 허용 (NULL 재설정은 지원 안 함)
  WITH input AS (
    SELECT
      (elem->>'q_no')::INT AS q_no,
      (elem->>'correct')::BOOLEAN AS correct
    FROM jsonb_array_elements(p_results) elem
    WHERE elem ? 'q_no' AND elem ? 'correct'
      AND jsonb_typeof(elem->'correct') = 'boolean'
  ),
  upd AS (
    UPDATE metacog_verify_items vi
    SET correct = i.correct,
        graded_at = v_now
    FROM input i
    WHERE vi.attempt_id = p_attempt_id
      AND vi.q_no = i.q_no
    RETURNING vi.id
  )
  SELECT COUNT(*)::INT INTO v_updated FROM upd;

  -- 총 검증 문항 수 (참고용 반환)
  SELECT COUNT(*)::INT INTO v_total
  FROM metacog_verify_items
  WHERE attempt_id = p_attempt_id;

  RETURN QUERY SELECT v_updated, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION grade_verify_items(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION grade_verify_items IS
  '검증 5문항 채점. 문항별 correct(O/X) UPDATE + graded_at 기록. 권한: super_admin/branch_admin(자기 지점).';

-- ------------------------------------------------------------
-- Storage: branch_admin도 metacog-questions 이미지 READ 허용
-- ------------------------------------------------------------
-- 채점 UI에서 문항 이미지 signed URL 발급을 위해 필요.
-- 문항은 전 지점 공유 자산이므로 admin 전원에게 열어도 무방.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin read metacog questions" ON storage.objects;
CREATE POLICY "admin read metacog questions" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'metacog-questions'
    AND auth_app_role() IN ('super_admin', 'branch_admin')
  );

-- 기존 super_admin only 정책은 유지(중복 무해). 삭제 원하면 아래 주석 해제:
-- DROP POLICY IF EXISTS "super admin read metacog questions" ON storage.objects;

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT 'grade_verify_items RPC 생성 확인' AS check,
       COUNT(*) AS rpc_count
FROM pg_proc WHERE proname = 'grade_verify_items';

SELECT 'admin read metacog questions Storage 정책 확인' AS check,
       policyname, roles
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
  AND policyname = 'admin read metacog questions';

SELECT '✅ Day 4 Step 2 채점 RPC + Storage 정책 셋업 완료' AS status;
