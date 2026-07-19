-- ============================================================
-- 메타인지 Day 5 — 복습과제지(없다 문항) 데이터 조회 RPC
-- ============================================================
-- 검증지와 별개로, 학생이 "모르겠다"고 판정한 문항 전체를 인쇄용으로 조회.
-- 검증 문항 5개보다 많을 수 있어 별도 페이지 자동 분할 필요.
--
-- 권한: super_admin OR (branch_admin AND 자기 지점 세션)
-- ============================================================

DROP FUNCTION IF EXISTS get_review_sheet_data(UUID);

CREATE OR REPLACE FUNCTION get_review_sheet_data(p_attempt_id UUID)
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
  v_role := auth_app_role();
  v_branch_id := auth_app_branch_id();

  IF v_role NOT IN ('super_admin', 'branch_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;

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
    'cannot_items', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'q_no', ans.q_no,
            'image_url', q.image_url,
            'forced', ans.forced
          ) ORDER BY ans.q_no
        ),
        '[]'::jsonb
      )
      FROM metacog_answers ans
      LEFT JOIN metacog_questions q
        ON q.track = ses.track AND q.q_no = ans.q_no
      WHERE ans.attempt_id = a.id
        AND ans.judgment = 'cannot'
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

GRANT EXECUTE ON FUNCTION get_review_sheet_data(UUID) TO authenticated;

COMMENT ON FUNCTION get_review_sheet_data IS
  '복습과제지 출력용. 학생 + 세션 + 없다 판정 문항(image_url) 원자적 반환.';

-- 검증
SELECT 'get_review_sheet_data RPC 확인' AS check, COUNT(*) AS rpc_count
FROM pg_proc WHERE proname = 'get_review_sheet_data';

SELECT '✅ Day 5 복습과제지 RPC 완료' AS status;
