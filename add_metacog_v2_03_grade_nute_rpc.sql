-- ============================================================
-- 메타인지 v2 — Phase 2: 누테 25문항 채점 RPC
-- ============================================================
-- grade_nute(attempt_id, results)
--   · results: [{"q_no": 1, "correct": true}, {"q_no": 2, "correct": false}, ...]
--   · q_no는 1~25 (누테 문항)만 유효 — 그 외는 무시
--   · 부분 저장 허용 (일부만 전송 시 그것만 UPDATE/INSERT)
--   · 재채점 허용 (UPSERT)
-- 권한: super_admin OR (branch_admin AND 자기 지점)
-- ============================================================

DROP FUNCTION IF EXISTS grade_nute(UUID, JSONB);

CREATE OR REPLACE FUNCTION grade_nute(
  p_attempt_id UUID,
  p_results JSONB
)
RETURNS TABLE (upserted_count INT, total_graded INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_role TEXT;
  v_branch_id TEXT;
  v_session_branch_id TEXT;
  v_upserted INT := 0;
  v_total INT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_role := auth_app_role();
  v_branch_id := auth_app_branch_id();

  IF v_role NOT IN ('super_admin', 'branch_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;

  -- attempt → session → branch 검증
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

  IF p_results IS NULL OR jsonb_typeof(p_results) != 'array' THEN
    RAISE EXCEPTION 'results must be a JSON array';
  END IF;

  -- UPSERT: q_no 1~25 이고 correct가 boolean인 원소만
  WITH input AS (
    SELECT
      (elem->>'q_no')::INT AS q_no,
      (elem->>'correct')::BOOLEAN AS correct
    FROM jsonb_array_elements(p_results) elem
    WHERE elem ? 'q_no' AND elem ? 'correct'
      AND jsonb_typeof(elem->'correct') = 'boolean'
      AND (elem->>'q_no')::INT BETWEEN 1 AND 25
  ),
  ups AS (
    INSERT INTO metacog_nute_grades (attempt_id, q_no, correct, graded_at)
    SELECT p_attempt_id, i.q_no, i.correct, v_now
    FROM input i
    ON CONFLICT (attempt_id, q_no)
    DO UPDATE SET correct = EXCLUDED.correct, graded_at = v_now
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO v_upserted FROM ups;

  SELECT COUNT(*)::INT INTO v_total
  FROM metacog_nute_grades
  WHERE attempt_id = p_attempt_id;

  RETURN QUERY SELECT v_upserted, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION grade_nute(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION grade_nute IS
  '누테 25문항 채점 UPSERT. 부분 저장/재채점 허용. q_no 1~25만 유효.';

-- ------------------------------------------------------------
-- get_nute_grading_data(attempt_id): 채점 모달 데이터
--   · 학생 정보
--   · 이 학생의 누테 25문항 각각의 (image_url, 학생 판정, 기존 채점 결과)
-- ------------------------------------------------------------
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
      SELECT jsonb_agg(row_to_jsonb(x) ORDER BY x.q_no)
      FROM (
        SELECT
          n AS q_no,
          (SELECT q.image_url FROM metacog_questions q
           WHERE q.track = ses.track AND q.q_no = n) AS image_url,
          (SELECT ans.judgment FROM metacog_answers ans
           WHERE ans.attempt_id = a.id AND ans.q_no = n) AS judgment,
          (SELECT g.correct FROM metacog_nute_grades g
           WHERE g.attempt_id = a.id AND g.q_no = n) AS correct
        FROM generate_series(1, 25) n
      ) x
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
  '누테 채점 모달용. 25문항 각각의 이미지/판정/기존채점 결과 반환.';

SELECT '✅ v2 grade_nute + get_nute_grading_data RPC 완료' AS status;
