-- 분당 캠페인 location 재수정
-- 분당점 → 수학의 아침 수내캠퍼스

UPDATE campaigns
SET location = '수학의 아침 수내캠퍼스'
WHERE id = '15d9b5be-086b-46fe-ac33-aa5192e51b2d_campaign';

-- 확인 쿼리
SELECT
  c.title as campaign_title,
  c.location as campaign_location,
  COUNT(ts.id) as test_slot_count
FROM campaigns c
LEFT JOIN test_slots ts ON ts.location = c.location
WHERE c.id = '15d9b5be-086b-46fe-ac33-aa5192e51b2d_campaign'
GROUP BY c.id, c.title, c.location;
