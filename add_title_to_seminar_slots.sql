-- ========================================
-- seminar_slots에 title 컬럼 추가
-- ========================================

-- 1. title 컬럼 추가
ALTER TABLE seminar_slots
ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. 기존 슬롯에 기본 제목 설정
UPDATE seminar_slots ss
SET title = c.location || ' ' || ss.session_number || '차 설명회'
FROM campaigns c
WHERE ss.campaign_id = c.id
  AND ss.title IS NULL;

-- 3. 확인
SELECT
  ss.id,
  ss.title,
  ss.session_number,
  ss.date,
  c.location as campaign_location,
  c.title as campaign_title
FROM seminar_slots ss
LEFT JOIN campaigns c ON c.id = ss.campaign_id
ORDER BY ss.date ASC;
