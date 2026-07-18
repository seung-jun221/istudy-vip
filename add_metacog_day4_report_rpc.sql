-- ============================================================
-- 메타인지 Day 4 (Step 4) — 학부모 리포트 조회 RPC
-- ============================================================
-- 학부모용 리포트 페이지(/metacog-report/:attemptId) 데이터.
-- UUID가 곧 인증 (진단검사 리포트와 동일 정책, anon 접근 허용).
--
-- 반환: JSONB (학생 + 세션 + 통계 + 검증결과 + 없다목록)
--
-- 미채점 판단은 클라이언트가 verify.graded / verify.total 로 결정.
-- ============================================================

DROP FUNCTION IF EXISTS get_metacog_report(UUID);

CREATE OR REPLACE FUNCTION get_metacog_report(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_attempt_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'attempt_id', a.id,
    'submitted_at', a.submitted_at,
    'student', jsonb_build_object(
      'name', st.name,
      'class_name', st.class_name
    ),
    'session', jsonb_build_object(
      'title', ses.title,
      'track', ses.track
    ),
    'stats', (
      SELECT jsonb_build_object(
        'can_count', COUNT(*) FILTER (WHERE judgment = 'can'),
        'cannot_count', COUNT(*) FILTER (WHERE judgment = 'cannot'),
        'forced_count', COUNT(*) FILTER (WHERE forced = true),
        'total_count', COUNT(*)
      )
      FROM metacog_answers ma
      WHERE ma.attempt_id = a.id
    ),
    'verify', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'graded', COUNT(*) FILTER (WHERE correct IS NOT NULL),
        'correct', COUNT(*) FILTER (WHERE correct = true),
        'wrong', COUNT(*) FILTER (WHERE correct = false),
        'items', COALESCE(
          jsonb_agg(
            jsonb_build_object('q_no', q_no, 'correct', correct)
            ORDER BY q_no
          ),
          '[]'::jsonb
        )
      )
      FROM metacog_verify_items vi
      WHERE vi.attempt_id = a.id
    ),
    'cannot_qnos', (
      SELECT COALESCE(jsonb_agg(q_no ORDER BY q_no), '[]'::jsonb)
      FROM metacog_answers ma
      WHERE ma.attempt_id = a.id AND ma.judgment = 'cannot'
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

GRANT EXECUTE ON FUNCTION get_metacog_report(UUID) TO anon, authenticated;

COMMENT ON FUNCTION get_metacog_report IS
  '학부모 리포트 조회. UUID = 인증. anon 허용. 미채점 시 verify.graded < verify.total.';

-- 검증
SELECT 'get_metacog_report RPC 확인' AS check, COUNT(*) AS rpc_count
FROM pg_proc WHERE proname = 'get_metacog_report';

SELECT '✅ Day 4 Step 4 리포트 RPC 완료' AS status;
