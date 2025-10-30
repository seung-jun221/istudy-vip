-- ========================================
-- 마이그레이션 검증 쿼리
-- ========================================

-- 1. 캠페인 생성 확인
SELECT '1. Campaigns created' as step, COUNT(*) as count FROM campaigns;

-- 2. 설명회 슬롯 생성 확인
SELECT '2. Seminar slots created' as step, COUNT(*) as count FROM seminar_slots;

-- 3. 예약 매핑 확인
SELECT
  '3. Reservations mapping' as step,
  COUNT(*) as total_reservations,
  COUNT(campaign_id) as mapped_to_campaign,
  COUNT(seminar_slot_id) as mapped_to_slot
FROM reservations;

-- 4. 활성 캠페인 상세 (가장 중요!)
SELECT
  '4. Active campaigns' as step,
  c.id,
  c.title,
  c.location,
  c.season,
  c.status,
  ss.date,
  ss.current_bookings,
  ss.max_capacity
FROM campaigns c
JOIN seminar_slots ss ON ss.campaign_id = c.id
WHERE c.status = 'active'
ORDER BY ss.date;

-- 5. 예약 수 정확성 확인 (중요!)
SELECT
  '5. Booking count verification' as step,
  ss.id as slot_id,
  LEFT(c.title, 40) as campaign_title,
  ss.current_bookings as slot_count,
  COUNT(r.id) as actual_count,
  CASE
    WHEN ss.current_bookings = COUNT(r.id) THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as status
FROM seminar_slots ss
LEFT JOIN campaigns c ON c.id = ss.campaign_id
LEFT JOIN reservations r ON r.seminar_slot_id = ss.id AND r.status != 'cancelled'
GROUP BY ss.id, c.title, ss.current_bookings
ORDER BY ss.current_bookings DESC
LIMIT 10;

-- 6. consulting_slots 연결 확인
SELECT
  '6. Consulting slots linked' as step,
  cs.location,
  cs.linked_seminar_id,
  c.title as campaign_title,
  COUNT(cs.id) as slot_count
FROM consulting_slots cs
LEFT JOIN campaigns c ON c.id = cs.linked_seminar_id
WHERE cs.linked_seminar_id IS NOT NULL
GROUP BY cs.location, cs.linked_seminar_id, c.title
ORDER BY cs.location;
