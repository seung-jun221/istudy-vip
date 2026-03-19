-- =============================================
-- test_slots 테이블에 campaign_id 컬럼 추가
-- 캠페인별 진단검사 슬롯 분리를 위한 마이그레이션
-- =============================================

-- 1. campaign_id 컬럼 추가 (nullable로 시작 - 기존 데이터 호환성)
ALTER TABLE test_slots
ADD COLUMN IF NOT EXISTS campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL;

-- 2. 기존 test_slots의 campaign_id 업데이트 (location 기반으로 가장 최근 active 캠페인 매칭)
UPDATE test_slots ts
SET campaign_id = (
  SELECT c.id
  FROM campaigns c
  WHERE c.location = ts.location
    AND c.status = 'active'
  ORDER BY c.created_at DESC
  LIMIT 1
)
WHERE ts.campaign_id IS NULL;

-- 3. 인덱스 추가 (캠페인별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_test_slots_campaign_id ON test_slots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_test_slots_campaign_date ON test_slots(campaign_id, date);

-- 4. 확인 쿼리
SELECT
  ts.id,
  ts.date,
  ts.time,
  ts.location,
  ts.campaign_id,
  c.title as campaign_title
FROM test_slots ts
LEFT JOIN campaigns c ON c.id = ts.campaign_id
ORDER BY ts.date, ts.time
LIMIT 20;

-- 5. 통계 확인
SELECT
  campaign_id,
  COUNT(*) as slot_count,
  MIN(date) as first_date,
  MAX(date) as last_date
FROM test_slots
GROUP BY campaign_id;
