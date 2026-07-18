-- ============================================================
-- 메타인지 Day 3 — 학생 응시 RPC (SECURITY DEFINER)
-- ============================================================
-- 학생(anon)은 students / metacog_attempts / metacog_answers /
-- metacog_verify_items에 직접 SELECT/INSERT 정책이 없음.
-- 아래 RPC 3개로만 접근 가능:
--
-- 1) authenticate_student  — 이름 + 뒷 4자리 명부 대조
-- 2) get_active_session_for_student — 학생 트랙에 맞는 open 세션 조회
-- 3) submit_metacog_attempt — 응시 제출 + 검증 5문항 서버 사이드 랜덤 고정
--
-- 문항 로드는 metacog_questions의 anon SELECT 정책(answer 컬럼 REVOKE)
-- 을 이용해 클라이언트 직접 조회. 이미지는 signed URL로 접근.
-- ============================================================

-- ------------------------------------------------------------
-- 1) authenticate_student
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS authenticate_student(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION authenticate_student(
  p_name TEXT,
  p_verify_code TEXT,
  p_branch_code TEXT
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  class_name TEXT,
  track TEXT,
  branch_id TEXT,
  branch_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN RETURN; END IF;
  IF p_verify_code IS NULL OR p_verify_code !~ '^\d{4}$' THEN RETURN; END IF;
  IF p_branch_code IS NULL OR p_branch_code = '' THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.class_name,
    s.track,
    b.id,
    b.name
  FROM students s
  JOIN branches b ON b.id = s.branch_id
  WHERE b.code = p_branch_code
    AND b.active = true
    AND s.name = trim(p_name)
    AND s.verify_code = p_verify_code
    AND s.active = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_student(TEXT, TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION authenticate_student IS
  '학생 명부 대조. 이름 + 뒷4자리 + 지점코드 일치 시 학생 정보 반환. 미매치는 빈 결과.';

-- ------------------------------------------------------------
-- 2) get_active_session_for_student
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_active_session_for_student(UUID);

CREATE OR REPLACE FUNCTION get_active_session_for_student(p_student_id UUID)
RETURNS TABLE (
  session_id UUID,
  title TEXT,
  track TEXT,
  already_submitted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id AND active = true;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 학생의 지점 + 트랙의 open 세션 중 가장 최근 것 (일반적으로 1개)
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.track,
    EXISTS(
      SELECT 1 FROM metacog_attempts a
      WHERE a.session_id = s.id
        AND a.student_id = p_student_id
        AND a.submitted_at IS NOT NULL
    )
  FROM metacog_sessions s
  WHERE s.branch_id = v_student.branch_id
    AND s.track = v_student.track
    AND s.status = 'open'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_session_for_student(UUID) TO anon, authenticated;

COMMENT ON FUNCTION get_active_session_for_student IS
  '학생 지점/트랙 기준 open 세션 반환. 이미 제출한 경우 already_submitted=true.';

-- ------------------------------------------------------------
-- 3) submit_metacog_attempt
-- ------------------------------------------------------------
-- p_answers 형식: [{"q_no":1,"judgment":"can","forced":false}, ...]  총 60개
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

  -- 6. 'can' 판정 문항번호를 랜덤 순서로 수집 (제출 시점 고정)
  SELECT array_agg(q_no ORDER BY random())
  INTO v_can_qnos
  FROM metacog_answers
  WHERE attempt_id = v_attempt_id
    AND judgment = 'can';

  -- 7. 최대 5개 선정 (있다가 5 미만이면 있는 만큼만)
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

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT 'RPC 3개 생성 확인' AS check, COUNT(*) AS rpc_count
FROM pg_proc
WHERE proname IN ('authenticate_student', 'get_active_session_for_student', 'submit_metacog_attempt');

SELECT '✅ Day 3 학생 응시 RPC 셋업 완료!' AS status;
