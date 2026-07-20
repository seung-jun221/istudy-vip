-- ============================================================
-- 메타인지 v2 — Phase 1: submit_metacog_attempt 재작성
-- ============================================================
-- 변경:
--  · '있다' 판정 중 5문항 랜덤 고정 → metacog_verify_items INSERT 로직 제거
--  · answers 60행 저장까지만 수행
--  · 채점은 별도(누테 25문항 채점 모달)
-- ============================================================

DROP FUNCTION IF EXISTS submit_metacog_attempt(UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION submit_metacog_attempt(
  p_session_id UUID,
  p_student_id UUID,
  p_answers JSONB
)
RETURNS TABLE (attempt_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id UUID;
  v_session RECORD;
  v_student RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. 세션 검증
  SELECT * INTO v_session FROM metacog_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_session.status != 'open' THEN
    RAISE EXCEPTION 'Session is closed';
  END IF;

  -- 2. 학생 검증
  SELECT * INTO v_student FROM students
  WHERE id = p_student_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found or inactive';
  END IF;
  IF v_student.branch_id != v_session.branch_id THEN
    RAISE EXCEPTION 'Branch mismatch';
  END IF;
  IF v_student.track != v_session.track THEN
    RAISE EXCEPTION 'Track mismatch';
  END IF;

  -- 3. answers 개수 검증
  IF jsonb_array_length(p_answers) != 60 THEN
    RAISE EXCEPTION 'answers must be 60 items (got %)', jsonb_array_length(p_answers);
  END IF;

  -- 4. attempt INSERT — UNIQUE(session_id, student_id)가 중복 응시 차단
  INSERT INTO metacog_attempts (session_id, student_id, submitted_at)
  VALUES (p_session_id, p_student_id, v_now)
  RETURNING id INTO v_attempt_id;

  -- 5. answers 60행 INSERT (원본 q_no로 저장, 셔플 순서와 무관)
  --    · answered_at은 클라이언트 시각 (총 소요시간 산출용)
  INSERT INTO metacog_answers (attempt_id, q_no, judgment, forced, answered_at)
  SELECT
    v_attempt_id,
    (elem->>'q_no')::INT,
    elem->>'judgment',
    COALESCE((elem->>'forced')::BOOLEAN, false),
    COALESCE((elem->>'answered_at')::TIMESTAMPTZ, v_now)
  FROM jsonb_array_elements(p_answers) elem;

  -- ⚠️ v2: verify_items INSERT 로직 제거 (5문항 랜덤 컨셉 폐기)
  --     누테 채점은 별도 grade_nute RPC로 진행.

  RETURN QUERY SELECT v_attempt_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_metacog_attempt(UUID, UUID, JSONB) TO anon, authenticated;

COMMENT ON FUNCTION submit_metacog_attempt IS
  'v2: 학생 응시 제출. answers 60행만 저장 (검증 5문항 랜덤 고정 로직 제거).';

SELECT '✅ v2 submit_metacog_attempt 재작성 완료' AS status;
