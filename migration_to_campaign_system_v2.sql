-- ========================================
-- 캠페인 시스템 마이그레이션 스크립트 v2 (개선판)
-- 목적: seminars → campaigns + seminar_slots 구조로 전환
-- 개선사항:
--   - 실제 예약 수 반영
--   - 시즌 분류 개선
--   - 지역별 별도 캠페인 구조
-- ========================================

-- ========================================
-- STEP 1: 백업 테이블 생성
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: 백업 테이블 생성';
  RAISE NOTICE '========================================';
END $$;

DROP TABLE IF EXISTS seminars_backup;
CREATE TABLE seminars_backup AS SELECT * FROM seminars;

DROP TABLE IF EXISTS reservations_backup;
CREATE TABLE reservations_backup AS SELECT * FROM reservations;

DROP TABLE IF EXISTS consulting_slots_backup;
CREATE TABLE consulting_slots_backup AS SELECT * FROM consulting_slots;

SELECT
  (SELECT COUNT(*) FROM seminars_backup) as seminars_backed_up,
  (SELECT COUNT(*) FROM reservations_backup) as reservations_backed_up,
  (SELECT COUNT(*) FROM consulting_slots_backup) as consulting_slots_backed_up;

-- ========================================
-- STEP 2: campaigns 테이블 생성
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: campaigns 테이블 생성';
  RAISE NOTICE '========================================';
END $$;

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,                    -- 예: "대치 2025 가을 캠페인"
  location TEXT NOT NULL,                 -- 예: "대치캠퍼스", "분당캠퍼스", "광교캠퍼스"
  season TEXT,                            -- 예: "2025 가을", "2025 여름"
  status TEXT DEFAULT 'active',           -- 'active', 'closed'
  access_password TEXT,                   -- Admin 접근 비밀번호
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 3: seminar_slots 테이블 생성
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: seminar_slots 테이블 생성';
  RAISE NOTICE '========================================';
END $$;

CREATE TABLE IF NOT EXISTS seminar_slots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_number INTEGER DEFAULT 1,       -- 1차, 2차, 3차...
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,                 -- 상세 주소
  max_capacity INTEGER DEFAULT 100,
  display_capacity INTEGER DEFAULT 100,
  current_bookings INTEGER DEFAULT 0,
  duration TEXT DEFAULT '90분',
  status TEXT DEFAULT 'active',           -- 'active', 'full', 'cancelled'
  test_method TEXT DEFAULT 'home',        -- 'home', 'onsite', 'both'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_seminar_slots_campaign_id ON seminar_slots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_seminar_slots_date ON seminar_slots(date);
CREATE INDEX IF NOT EXISTS idx_seminar_slots_status ON seminar_slots(status);

-- ========================================
-- STEP 4: reservations 테이블 수정
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: reservations 테이블 수정';
  RAISE NOTICE '========================================';
END $$;

-- campaign_id 추가
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS campaign_id TEXT REFERENCES campaigns(id);

-- seminar_slot_id 추가 (기존 seminar_id 대체용)
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS seminar_slot_id TEXT REFERENCES seminar_slots(id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reservations_campaign_id ON reservations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reservations_seminar_slot_id ON reservations(seminar_slot_id);

-- ========================================
-- STEP 5: 기존 데이터 마이그레이션
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5: 기존 데이터 마이그레이션';
  RAISE NOTICE '========================================';
END $$;

-- 5-1. 각 설명회를 개별 캠페인으로 변환 (지역별 별도 캠페인)
INSERT INTO campaigns (id, title, location, season, status, access_password, created_at)
SELECT
  id || '_campaign' as id,
  title || ' 캠페인' as title,
  CASE
    WHEN location LIKE '%수내%' OR location LIKE '%분당%' THEN '분당캠퍼스'
    WHEN location LIKE '%대치%' OR location LIKE '%넥스트닥%' THEN '대치캠퍼스'
    WHEN location LIKE '%강남%' THEN '강남캠퍼스'
    WHEN location LIKE '%서초%' THEN '서초캠퍼스'
    WHEN location LIKE '%역삼%' THEN '역삼캠퍼스'
    WHEN location LIKE '%광교%' THEN '광교캠퍼스'
    WHEN location LIKE '%송도%' THEN '송도캠퍼스'
    ELSE location
  END as location,
  CASE
    -- 가을: 9-11월
    WHEN EXTRACT(MONTH FROM date) IN (9, 10, 11) THEN EXTRACT(YEAR FROM date)::text || ' 가을'
    -- 겨울: 12-2월
    WHEN EXTRACT(MONTH FROM date) IN (12, 1, 2) THEN EXTRACT(YEAR FROM date)::text || ' 겨울'
    -- 봄: 3-5월
    WHEN EXTRACT(MONTH FROM date) IN (3, 4, 5) THEN EXTRACT(YEAR FROM date)::text || ' 봄'
    -- 여름: 6-8월
    WHEN EXTRACT(MONTH FROM date) IN (6, 7, 8) THEN EXTRACT(YEAR FROM date)::text || ' 여름'
    ELSE EXTRACT(YEAR FROM date)::text || ' 기타'
  END as season,
  status,
  access_password,
  created_at
FROM seminars;

-- 5-2. 각 설명회를 seminar_slots로 변환
-- ⭐ 실제 예약 수를 계산하여 current_bookings에 반영
INSERT INTO seminar_slots (
  id,
  campaign_id,
  session_number,
  date,
  time,
  location,
  max_capacity,
  display_capacity,
  current_bookings,
  duration,
  status,
  test_method,
  created_at
)
SELECT
  s.id as id,
  s.id || '_campaign' as campaign_id,
  1 as session_number,
  s.date,
  s.time,
  s.location,
  s.max_capacity,
  s.display_capacity,
  -- ⭐ 실제 예약 수 계산 (cancelled 제외)
  COALESCE((
    SELECT COUNT(*)
    FROM reservations r
    WHERE r.seminar_id = s.id
      AND r.status != 'cancelled'
  ), 0) as current_bookings,
  s.duration,
  s.status,
  s.test_method,
  s.created_at
FROM seminars s;

-- 5-3. reservations 업데이트 (campaign_id, seminar_slot_id 설정)
UPDATE reservations r
SET
  campaign_id = s.id || '_campaign',
  seminar_slot_id = r.seminar_id
FROM seminars s
WHERE r.seminar_id = s.id;

-- ========================================
-- STEP 6: consulting_slots 업데이트
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 6: consulting_slots 업데이트';
  RAISE NOTICE '========================================';
END $$;

-- consulting_slots의 linked_seminar_id를 campaign_id로 변경
UPDATE consulting_slots cs
SET linked_seminar_id = s.id || '_campaign'
FROM seminars s
WHERE cs.linked_seminar_id = s.id;

-- ========================================
-- STEP 7: 데이터 검증
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 7: 데이터 검증';
  RAISE NOTICE '========================================';
END $$;

-- 7-1. 캠페인 수 확인
SELECT '✅ Campaigns created' as check_name, COUNT(*) as count FROM campaigns;

-- 7-2. 설명회 슬롯 수 확인
SELECT '✅ Seminar slots created' as check_name, COUNT(*) as count FROM seminar_slots;

-- 7-3. Reservations 매핑 확인
SELECT
  '✅ Reservations mapped' as check_name,
  COUNT(*) as total_reservations,
  COUNT(campaign_id) as mapped_to_campaign,
  COUNT(seminar_slot_id) as mapped_to_slot
FROM reservations;

-- 7-4. 예약 수 정확성 확인 (중요!)
SELECT
  '✅ Booking counts verification' as check_name,
  ss.id as slot_id,
  LEFT(c.title, 30) as campaign_title,
  ss.current_bookings as slot_bookings,
  COUNT(r.id) as actual_reservations,
  CASE
    WHEN ss.current_bookings = COUNT(r.id) THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as status
FROM seminar_slots ss
LEFT JOIN campaigns c ON c.id = ss.campaign_id
LEFT JOIN reservations r ON r.seminar_slot_id = ss.id AND r.status != 'cancelled'
GROUP BY ss.id, c.title, ss.current_bookings
ORDER BY status DESC, ss.current_bookings DESC;

-- 7-5. 활성 캠페인 확인
SELECT
  '✅ Active campaigns' as check_name,
  c.title,
  c.location,
  c.season,
  COUNT(ss.id) as slot_count,
  SUM(ss.current_bookings) as total_bookings
FROM campaigns c
JOIN seminar_slots ss ON ss.campaign_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.title, c.location, c.season
ORDER BY c.location;

-- 7-6. consulting_slots 연결 확인
SELECT
  '✅ Consulting slots linked' as check_name,
  cs.location,
  c.title as campaign_title,
  COUNT(cs.id) as slot_count
FROM consulting_slots cs
LEFT JOIN campaigns c ON c.id = cs.linked_seminar_id
WHERE cs.linked_seminar_id IS NOT NULL
GROUP BY cs.location, c.title
ORDER BY cs.location;

-- ========================================
-- STEP 8: 완료 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 마이그레이션 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 위의 검증 결과를 확인하세요';
  RAISE NOTICE '2. 예약 수가 정확한지 확인하세요 (Booking counts verification)';
  RAISE NOTICE '3. 문제가 없으면 코드 업데이트를 진행하세요';
  RAISE NOTICE '4. 문제가 있으면 롤백 스크립트를 실행하세요';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 롤백 스크립트 (문제 발생 시 실행)
-- ========================================
/*
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  롤백 시작';
  RAISE NOTICE '========================================';
END $$;

-- 새 테이블 삭제
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS seminar_slots CASCADE;

-- reservations 컬럼 제거
ALTER TABLE reservations DROP COLUMN IF EXISTS campaign_id;
ALTER TABLE reservations DROP COLUMN IF EXISTS seminar_slot_id;

-- consulting_slots 원복
UPDATE consulting_slots cs
SET linked_seminar_id = REPLACE(linked_seminar_id, '_campaign', '')
WHERE linked_seminar_id LIKE '%_campaign';

-- 백업에서 복원 (필요시)
-- TRUNCATE seminars;
-- INSERT INTO seminars SELECT * FROM seminars_backup;
-- TRUNCATE reservations;
-- INSERT INTO reservations SELECT * FROM reservations_backup;
-- TRUNCATE consulting_slots;
-- INSERT INTO consulting_slots SELECT * FROM consulting_slots_backup;

DO $$
BEGIN
  RAISE NOTICE '✅ 롤백 완료';
END $$;
*/
