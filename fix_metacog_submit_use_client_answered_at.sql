-- ============================================================
-- 메타인지 submit_metacog_attempt — 각 답변의 판정 시각 저장
-- ============================================================
-- 이전 버전: v_now(함수 실행 시각)를 60개 행 모두에 저장
--   → MAX(answered_at) - MIN(answered_at) = 0 이 되어 총 소요시간 측정 불가
--
-- 수정: p_answers 각 원소의 answered_at(ISO 문자열)을 파싱하여 저장
--   · 클라이언트가 각 판정 시각을 함께 전송
--   · 미전송 시 v_now로 fallback (구 클라이언트 backward compat)
--
-- ⚠️ 클라이언트 시각 = 태블릿 시각 (서버 시각과 다를 수 있음).
--   총 소요시간은 반드시 answered_at끼리만 계산 (MAX-MIN).
--   submitted_at(서버 시각)과 answered_at을 섞어 빼면 안 됨.
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
  --    ⚠️ 클라이언트가 보낸 answered_at 사용, 없으면 v_now로 fallback
  INSERT INTO metacog_answers (attempt_id, q_no, judgment, forced, answered_at)
  SELECT
    v_attempt_id,
    (elem->>'q_no')::INT,
    elem->>'judgment',
    COALESCE((elem->>'forced')::BOOLEAN, false),
    COALESCE((elem->>'answered_at')::TIMESTAMPTZ, v_now)
  FROM jsonb_array_elements(p_answers) elem;

  -- 6. 'can' 판정 문항번호를 랜덤 순서로 수집
  SELECT array_agg(a.q_no ORDER BY random())
  INTO v_can_qnos
  FROM metacog_answers a
  WHERE a.attempt_id = v_attempt_id
    AND a.judgment = 'can';

  -- 7. 최대 5개 선정
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
  '학생 응시 제출. 각 답변의 판정 시각(answered_at)은 클라이언트 시각. 검증 5문항 서버 사이드 랜덤 고정.';

SELECT '✅ submit_metacog_attempt: 클라이언트 answered_at 사용으로 수정 완료' AS status;
