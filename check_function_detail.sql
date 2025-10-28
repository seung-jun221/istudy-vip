-- ========================================
-- auto_cancel_no_test_reservations 함수 상세 확인
-- ========================================

-- 1️⃣ 함수 정의 전체 보기
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'auto_cancel_no_test_reservations';

-- ========================================

-- 2️⃣ 함수 소스 코드 보기
SELECT
  routine_name,
  routine_definition,
  created
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'auto_cancel_no_test_reservations';

-- ========================================

-- 3️⃣ 함수 수동 실행 (테스트)
-- 실제로 어떤 예약이 취소되는지 확인
SELECT * FROM auto_cancel_no_test_reservations();

-- ========================================

-- 4️⃣ 취소 대상 예약 직접 확인
-- 함수가 찾아야 할 예약들
SELECT
  cr.id,
  cr.student_name,
  cr.parent_phone,
  cr.status,
  cr.test_deadline_agreed,
  cr.test_deadline_agreed_at,
  cr.created_at,
  DATE(cr.test_deadline_agreed_at) as agreed_date,
  CURRENT_DATE as today,
  DATE(cr.test_deadline_agreed_at) < CURRENT_DATE as is_past_deadline,
  -- 진단검사 예약 개수
  (SELECT COUNT(*)
   FROM test_reservations tr
   WHERE tr.consulting_reservation_id = cr.id
     AND tr.status IN ('confirmed', '예약')
  ) as test_reservation_count
FROM consulting_reservations cr
WHERE cr.status IN ('confirmed', 'pending')
  AND cr.test_deadline_agreed = true
  AND cr.test_deadline_agreed_at IS NOT NULL
ORDER BY cr.test_deadline_agreed_at DESC;

-- ========================================

-- 5️⃣ cron job 실행 로그 확인 (가능한 경우)
-- Supabase는 기본적으로 cron 로그를 제공하지 않을 수 있음
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 10;

-- ========================================
-- 실행 순서:
-- 1. 1번 쿼리로 함수 정의 확인 (가장 중요!)
-- 2. 3번 쿼리로 함수 수동 실행
-- 3. 4번 쿼리로 취소 대상 확인
-- 4. 5번 쿼리로 실행 로그 확인
-- ========================================
