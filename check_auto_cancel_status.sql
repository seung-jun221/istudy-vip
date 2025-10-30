-- ========================================
-- Supabase SQL Editor에서 실행
-- 자동 취소 정책 확인용 SQL
-- ========================================

-- 1️⃣ 현재 설정된 모든 cron job 확인
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
ORDER BY jobid;

-- ========================================

-- 2️⃣ 자동 취소 관련 함수 확인
SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%cancel%'
    OR routine_name LIKE '%auto%'
    OR routine_name LIKE '%deadline%'
    OR routine_name LIKE '%midnight%'
  )
ORDER BY routine_name;

-- ========================================

-- 3️⃣ 모든 public 함수 목록 확인 (RPC 함수들)
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ========================================

-- 4️⃣ consulting_reservations 테이블 구조 확인
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'consulting_reservations'
ORDER BY ordinal_position;

-- ========================================

-- 5️⃣ 진단검사 예약 기한을 넘긴 컨설팅 예약 확인
-- (자정까지 진단검사 예약을 안 한 예약들)
SELECT
  cr.id,
  cr.student_name,
  cr.parent_phone,
  cr.status,
  cr.test_deadline_agreed,
  cr.test_deadline_agreed_at,
  cr.created_at,
  cs.date as consulting_date,
  cs.time as consulting_time,
  -- 진단검사 예약 여부
  (SELECT COUNT(*)
   FROM test_reservations tr
   WHERE tr.consulting_reservation_id = cr.id
     AND tr.status IN ('confirmed', '예약')
  ) as test_count
FROM consulting_reservations cr
LEFT JOIN consulting_slots cs ON cr.slot_id = cs.id
WHERE cr.status IN ('confirmed', 'pending')
  AND cr.test_deadline_agreed = true
  AND cr.test_deadline_agreed_at IS NOT NULL
  -- 동의한 날짜의 자정을 넘김
  AND DATE(cr.test_deadline_agreed_at) < CURRENT_DATE
  -- 진단검사 예약이 없음
  AND NOT EXISTS (
    SELECT 1
    FROM test_reservations tr
    WHERE tr.consulting_reservation_id = cr.id
      AND tr.status IN ('confirmed', '예약')
  )
ORDER BY cr.test_deadline_agreed_at DESC;

-- ========================================

-- 6️⃣ cron 확장 기능 활성화 여부 확인
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- ========================================
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor 열기
-- 2. 위 쿼리를 하나씩 또는 전체 실행
-- 3. 결과 확인
-- ========================================
