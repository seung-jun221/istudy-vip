-- ============================================================
-- 메타인지 submit_metacog_attempt — attempt_id 모호성 수정
-- ============================================================
-- 원본에서 `WHERE attempt_id = v_attempt_id` 절이
-- RETURNS TABLE(attempt_id UUID, ...) 의 출력 컬럼과
-- metacog_answers.attempt_id 컬럼 사이에서 모호함으로 판단되어
-- "column reference attempt_id is ambiguous" 오류 발생.
--
-- 수정: 테이블 alias(a)로 명시적 qualify.
-- ============================================================

DROP FUNCTION IF EXISTS submit_metacog_attempt(UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION submit_metacog_attempt(
  p_session_id UUID,
  p_student_id UUID,
  p_answers JSONB
)
RETURNS TABLE (attempt_id UUID, verify_q_nos INT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id UUID;
  v_session RECORD;
  v_student RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_can_qnos INT[];
  v_verify_qnos INT[];
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

  -- 4. attempt INSERT — UNIQUE(session_id, student_id) 제약이 중복 응시 차단
  INSERT INTO metacog_attempts (session_id, student_id, submitted_at)
  VALUES (p_session_id, p_student_id, v_now)
  RETURNING id INTO v_attempt_id;

  -- 5. answers 60행 INSERT
  INSERT INTO metacog_answers (attempt_id, q_no, judgment, forced, answered_at)
  SELECT
    v_attempt_id,
    (elem->>'q_no')::INT,
    elem->>'judgment',
    COALESCE((elem->>'forced')::BOOLEAN, false),
    v_now
  FROM jsonb_array_elements(p_answers) elem;

  -- 6. 'can' 판정 문항번호를 랜덤 순서로 수집
  -- ⚠️ 테이블 alias(a)로 명시적 qualify — 출력 컬럼 attempt_id와 모호성 방지
  SELECT array_agg(a.q_no ORDER BY random())
  INTO v_can_qnos
  FROM metacog_answers a
  WHERE a.attempt_id = v_attempt_id
    AND a.judgment = 'can';

  -- 7. 최대 5개 선정 (5 미만이면 있는 만큼만)
  IF v_can_qnos IS NULL OR array_length(v_can_qnos, 1) = 0 THEN
    v_verify_qnos := ARRAY[]::INT[];
  ELSE
    v_verify_qnos := v_can_qnos[1:LEAST(5, array_length(v_can_qnos, 1))];
  END IF;

  -- 8. verify_items INSERT (미채점 상태)
  IF array_length(v_verify_qnos, 1) > 0 THEN
    INSERT INTO metacog_verify_items (attempt_id, q_no, correct)
    SELECT v_attempt_id, unnest(v_verify_qnos), NULL;
  END IF;

  RETURN QUERY SELECT v_attempt_id, v_verify_qnos;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_metacog_attempt(UUID, UUID, JSONB) TO anon, authenticated;

COMMENT ON FUNCTION submit_metacog_attempt IS
  '학생 응시 제출. 검증 5문항을 서버 사이드에서 랜덤 고정하여 metacog_verify_items에 저장.';

-- 검증
SELECT '✅ submit_metacog_attempt 모호성 수정 완료' AS status;
