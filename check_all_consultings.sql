-- ========================================
-- 모든 컨설팅 예약 확인 (조건 없이)
-- ========================================

-- 최근 일주일 간의 모든 컨설팅 예약 확인
SELECT
  cr.id,
  cr.student_name,
  cr.parent_phone,
  cr.status,
  cr.test_deadline_agreed,
  cr.test_deadline_agreed_at,
  cr.created_at,
  DATE(cr.created_at) as created_date,
  DATE(cr.test_deadline_agreed_at) as agreed_date,
  CURRENT_DATE as today,
  CASE
    WHEN cr.test_deadline_agreed_at IS NOT NULL THEN
      DATE(cr.test_deadline_agreed_at) < CURRENT_DATE
    ELSE NULL
  END as is_past_deadline,
  -- 진단검사 예약 개수
  (SELECT COUNT(*)
   FROM test_reservations tr
   WHERE tr.consulting_reservation_id = cr.id
     AND tr.status IN ('confirmed', '예약')
  ) as test_reservation_count,
  -- 컨설팅 날짜
  cs.date as consulting_date,
  cs.time as consulting_time
FROM consulting_reservations cr
LEFT JOIN consulting_slots cs ON cr.slot_id = cs.id
WHERE cr.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY cr.created_at DESC;

-- ========================================
-- 위 쿼리 결과에서 확인할 것:
-- 1. 어제 예약한 건 찾기 (created_date가 어제인 것)
-- 2. test_deadline_agreed가 false인지 확인
-- 3. test_deadline_agreed_at이 NULL인지 확인
-- 4. test_reservation_count가 0인지 확인
-- ========================================
