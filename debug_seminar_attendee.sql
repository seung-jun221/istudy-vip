-- 설명회 예약자 조회 테스트
-- 테스트한 연락처 번호를 넣어서 실행하세요

-- 1. reservations 테이블에서 해당 연락처 확인
SELECT
  id,
  parent_phone,
  student_name,
  status,
  seminar_id as old_seminar_id,
  seminar_slot_id as new_slot_id,
  campaign_id as new_campaign_id
FROM reservations
WHERE parent_phone = '010-1234-5678'  -- ⭐ 테스트한 연락처로 변경
ORDER BY id DESC;

-- 2. seminar_slot_id가 있는지 확인
SELECT
  r.id,
  r.parent_phone,
  r.student_name,
  r.seminar_slot_id,
  ss.id as slot_exists,
  ss.location as slot_location,
  c.id as campaign_id,
  c.title as campaign_title
FROM reservations r
LEFT JOIN seminar_slots ss ON ss.id = r.seminar_slot_id
LEFT JOIN campaigns c ON c.id = ss.campaign_id
WHERE r.parent_phone = '010-1234-5678'  -- ⭐ 테스트한 연락처로 변경
ORDER BY r.id DESC;
