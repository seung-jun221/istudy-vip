-- ========================================
-- 현재 데이터 상태 확인 쿼리
-- ========================================

-- 1. 현재 설명회 목록 (활성/비활성 모두)
SELECT
  id,
  title,
  location,
  date,
  time,
  status,
  reserved,
  max_capacity
FROM seminars
ORDER BY status DESC, date ASC;

-- 2. 설명회별 예약 수
SELECT
  s.title,
  s.location,
  s.date,
  s.status as seminar_status,
  COUNT(r.id) as reservation_count,
  s.reserved as reserved_count
FROM seminars s
LEFT JOIN reservations r ON r.seminar_id = s.id
GROUP BY s.id, s.title, s.location, s.date, s.status, s.reserved
ORDER BY s.status DESC, s.date ASC;

-- 3. 총 예약 수
SELECT
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
FROM reservations;

-- 4. consulting_slots의 linked_seminar_id 사용 현황
SELECT
  cs.location,
  cs.linked_seminar_id,
  s.title as seminar_title,
  COUNT(*) as slot_count
FROM consulting_slots cs
LEFT JOIN seminars s ON s.id = cs.linked_seminar_id
GROUP BY cs.location, cs.linked_seminar_id, s.title
ORDER BY cs.location;

-- 5. consulting_reservations의 linked_seminar_id 사용 현황
SELECT
  cr.linked_seminar_id,
  s.title as seminar_title,
  COUNT(*) as reservation_count
FROM consulting_reservations cr
LEFT JOIN seminars s ON s.id = cr.linked_seminar_id
WHERE cr.linked_seminar_id IS NOT NULL
GROUP BY cr.linked_seminar_id, s.title
ORDER BY reservation_count DESC;
