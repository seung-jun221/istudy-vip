-- 기존 설명회 예약 (id: 344) 수정
-- seminar_slot_id와 campaign_id 추가

-- 1. 해당 예약의 seminar_id 확인
SELECT
  id,
  parent_phone,
  student_name,
  seminar_id,
  seminar_slot_id,
  campaign_id
FROM reservations
WHERE id = 344;

-- 2. seminar_id로 campaign_id 찾기
SELECT
  id as seminar_id,
  id || '_campaign' as campaign_id
FROM seminars
WHERE id = '15d9b5be-086b-46fe-ac33-aa5192e51b2d';

-- 3. 예약 업데이트
UPDATE reservations
SET
  seminar_slot_id = '15d9b5be-086b-46fe-ac33-aa5192e51b2d',
  campaign_id = '15d9b5be-086b-46fe-ac33-aa5192e51b2d_campaign'
WHERE id = 344;

-- 4. 확인
SELECT
  r.id,
  r.parent_phone,
  r.student_name,
  r.seminar_slot_id,
  r.campaign_id,
  ss.location as slot_location,
  c.title as campaign_title
FROM reservations r
LEFT JOIN seminar_slots ss ON ss.id = r.seminar_slot_id
LEFT JOIN campaigns c ON c.id = r.campaign_id
WHERE r.id = 344;
