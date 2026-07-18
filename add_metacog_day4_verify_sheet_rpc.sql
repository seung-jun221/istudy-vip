-- ============================================================
-- 메타인지 Day 4 (Step 3) — 검증지 데이터 조회 RPC
-- ============================================================
-- 개별 학생 검증지(A4 인쇄용) 렌더에 필요한 모든 데이터를
-- 한 번의 호출로 반환. 이미지 경로만 반환 (signed URL은 클라이언트에서).
--
-- 권한: super_admin OR (branch_admin AND 자기 지점 세션)
-- ============================================================

DROP FUNCTION IF EXISTS get_verify_sheet_data(UUID);

CREATE OR REPLACE FUNCTION get_verify_sheet_data(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_role TEXT;
  v_branch_id TEXT;
  v_result JSONB;
  v_session_branch_id TEXT;
BEGIN
  -- 권한 확인
  v_role := auth_app_role();
  v_branch_id := auth_app_branch_id();

  IF v_role NOT IN ('super_admin', 'branch_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;

  -- attempt → session → branch 확인 (자기 지점만)
  SELECT s.branch_id INTO v_session_branch_id
  FROM metacog_attempts a
  JOIN metacog_sessions s ON s.id = a.session_id
  WHERE a.id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_role = 'branch_admin' AND v_branch_id IS DISTINCT FROM v_session_branch_id THEN
    RAISE EXCEPTION 'Forbidden: attempt belongs to another branch';
  END IF;

  -- 데이터 조립
  SELECT jsonb_build_object(
    'attempt_id', a.id,
    'submitted_at', a.submitted_at,
    'student', jsonb_build_object(
      'name', st.name,
      'class_name', st.class_name
    ),
    'session', jsonb_build_object(
      'id', ses.id,
      'title', ses.title,
      'track', ses.track
    ),
    'branch', jsonb_build_object(
      'id', br.id,
      'name', br.name
    ),
    'verify_items', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'q_no', vi.q_no,
            'image_url', q.image_url,
            'correct', vi.correct
          ) ORDER BY vi.q_no
        ),
        '[]'::jsonb
      )
      FROM metacog_verify_items vi
      LEFT JOIN metacog_questions q
        ON q.track = ses.track AND q.q_no = vi.q_no
      WHERE vi.attempt_id = a.id
    )
  )
  INTO v_result
  FROM metacog_attempts a
  JOIN students st ON st.id = a.student_id
  JOIN metacog_sessions ses ON ses.id = a.session_id
  JOIN branches br ON br.id = ses.branch_id
  WHERE a.id = p_attempt_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_verify_sheet_data(UUID) TO authenticated;

COMMENT ON FUNCTION get_verify_sheet_data IS
  '검증지 출력용 데이터. 학생+세션+검증문항(image_url 포함) 원자적 반환.';

-- 검증
SELECT 'get_verify_sheet_data RPC 확인' AS check, COUNT(*) AS rpc_count
FROM pg_proc WHERE proname = 'get_verify_sheet_data';

SELECT '✅ Day 4 Step 3 검증지 데이터 RPC 완료' AS status;
