-- ============================================================
-- 메타인지 v2 fix — get_nute_grading_data 재작성
-- ============================================================
-- 오류: function row_to_jsonb(record) does not exist
-- 원인: 서브쿼리 alias `x` 를 row_to_jsonb에 넘길 때 record 타입으로
--       해석되어 함수 시그니처 매칭 실패.
-- 수정: jsonb_build_object 로 명시적 조립.
-- ============================================================

DROP FUNCTION IF EXISTS get_nute_grading_data(UUID);

CREATE OR REPLACE FUNCTION get_nute_grading_data(p_attempt_id UUID)
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
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'attempt_id', a.id,
    'student', jsonb_build_object(
      'name', st.name,
      'class_name', st.class_name
    ),
    'session', jsonb_build_object(
      'title', ses.title,
      'track', ses.track
    ),
    'items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'q_no', n,
          'image_url', (
            SELECT q.image_url FROM metacog_questions q
            WHERE q.track = ses.track AND q.q_no = n
          ),
          'judgment', (
            SELECT ans.judgment FROM metacog_answers ans
            WHERE ans.attempt_id = a.id AND ans.q_no = n
          ),
          'correct', (
            SELECT g.correct FROM metacog_nute_grades g
            WHERE g.attempt_id = a.id AND g.q_no = n
          )
        ) ORDER BY n
      )
      FROM generate_series(1, 25) n
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

GRANT EXECUTE ON FUNCTION get_nute_grading_data(UUID) TO authenticated;

COMMENT ON FUNCTION get_nute_grading_data IS
  '누테 채점 모달용. 25문항 각각의 이미지/판정/기존채점 결과 반환 (jsonb_build_object 직조립).';

SELECT '✅ v2 get_nute_grading_data 재작성 완료' AS status;
