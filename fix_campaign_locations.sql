-- 캠페인 location을 진단검사 슬롯의 location과 일치시키기
-- 목적: test_slots 조회 시 location 기반 매칭이 정상 작동하도록

-- 1. 분당캠퍼스 → 분당점
UPDATE campaigns
SET location = '분당점'
WHERE id = '15d9b5be-086b-46fe-ac33-aa5192e51b2d_campaign';

-- 2. 대치캠퍼스 → 넥스트닥 대치점
UPDATE campaigns
SET location = '넥스트닥 대치점'
WHERE id = '587bd448-dfee-4980-9408-a71a743fb9bb_campaign';

-- 3. 광교캠퍼스 → 수학의 아침 광교캠퍼스
UPDATE campaigns
SET location = '수학의 아침 광교캠퍼스'
WHERE id = 'b4e7a9b2-0488-4b6b-aaa0-2364d07cbd30_campaign';

-- 확인 쿼리
SELECT
  id,
  title,
  location
FROM campaigns
WHERE id IN (
  '15d9b5be-086b-46fe-ac33-aa5192e51b2d_campaign',
  '587bd448-dfee-4980-9408-a71a743fb9bb_campaign',
  'b4e7a9b2-0488-4b6b-aaa0-2364d07cbd30_campaign'
);

-- 진단검사 슬롯 매칭 확인
SELECT
  c.title as campaign_title,
  c.location as campaign_location,
  COUNT(ts.id) as test_slot_count
FROM campaigns c
LEFT JOIN test_slots ts ON ts.location = c.location
WHERE c.id IN (
  '15d9b5be-086b-46fe-ac33-aa5192e51b2d_campaign',
  '587bd448-dfee-4980-9408-a71a743fb9bb_campaign',
  'b4e7a9b2-0488-4b6b-aaa0-2364d07cbd30_campaign'
)
GROUP BY c.id, c.title, c.location
ORDER BY c.title;
