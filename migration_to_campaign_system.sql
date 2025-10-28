-- ========================================
-- 캠페인 시스템 마이그레이션 스크립트
-- 목적: seminars → campaigns + seminar_slots 구조로 전환
-- ========================================

-- ========================================
-- STEP 1: 백업 테이블 생성
-- ========================================
CREATE TABLE IF NOT EXISTS seminars_backup AS
SELECT * FROM seminars;

CREATE TABLE IF NOT EXISTS reservations_backup AS
SELECT * FROM reservations;

-- ========================================
-- STEP 2: campaigns 테이블 생성
-- ========================================
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,                    -- 예: "분당 2025 가을 캠페인"
  location TEXT NOT NULL,                 -- 예: "분당캠퍼스", "대치캠퍼스"
  season TEXT,                            -- 예: "2025 가을", "2025 봄"
  status TEXT DEFAULT 'active',           -- 'active', 'inactive', 'ended'
  access_password TEXT,                   -- Admin 접근 비밀번호
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 3: seminar_slots 테이블 생성
-- ========================================
CREATE TABLE IF NOT EXISTS seminar_slots (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_number INTEGER DEFAULT 1,       -- 1차, 2차, 3차...
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,                 -- 상세 주소
  max_capacity INTEGER DEFAULT 100,
  display_capacity INTEGER DEFAULT 100,
  current_bookings INTEGER DEFAULT 0,     -- reserved 대신 current_bookings로 통일
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
-- campaign_id 추가 (seminar_slot을 통해 연결)
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

-- 5-1. 각 설명회를 개별 캠페인으로 변환
-- (같은 지역, 같은 시즌이면 나중에 수동으로 합칠 수 있음)

INSERT INTO campaigns (id, title, location, season, status, access_password, created_at)
SELECT
  id || '_campaign' as id,  -- 기존 seminar id에 _campaign 붙여서 고유하게
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
    WHEN date >= '2025-09-01' AND date <= '2025-11-30' THEN '2025 가을'
    WHEN date >= '2025-06-01' AND date <= '2025-08-31' THEN '2025 여름'
    WHEN date >= '2025-03-01' AND date <= '2025-05-31' THEN '2025 봄'
    ELSE '2025 기타'
  END as season,
  status,
  access_password,
  created_at
FROM seminars;

-- 5-2. 각 설명회를 seminar_slots로 변환
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
  id as id,  -- 기존 seminar id 유지 (reservations 연결 위해)
  id || '_campaign' as campaign_id,  -- 위에서 만든 campaign과 연결
  1 as session_number,  -- 첫 번째 회차
  date,
  time,
  location,
  max_capacity,
  display_capacity,
  COALESCE(reserved, 0) as current_bookings,
  duration,
  status,
  test_method,
  created_at
FROM seminars;

-- 5-3. reservations 업데이트
UPDATE reservations r
SET
  campaign_id = s.id || '_campaign',
  seminar_slot_id = r.seminar_id
FROM seminars s
WHERE r.seminar_id = s.id;

-- ========================================
-- STEP 6: 데이터 검증
-- ========================================

-- 6-1. 캠페인 수 확인
SELECT 'Campaigns created:' as check_name, COUNT(*) as count FROM campaigns;

-- 6-2. 설명회 슬롯 수 확인
SELECT 'Seminar slots created:' as check_name, COUNT(*) as count FROM seminar_slots;

-- 6-3. Reservations 매핑 확인
SELECT
  'Reservations mapped:' as check_name,
  COUNT(*) as total_reservations,
  COUNT(campaign_id) as mapped_to_campaign,
  COUNT(seminar_slot_id) as mapped_to_slot
FROM reservations;

-- 6-4. 예약 수 일치 확인
SELECT
  'Booking counts match:' as check_name,
  ss.id as slot_id,
  ss.current_bookings as slot_bookings,
  COUNT(r.id) as actual_reservations,
  CASE
    WHEN ss.current_bookings = COUNT(r.id) THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as status
FROM seminar_slots ss
LEFT JOIN reservations r ON r.seminar_slot_id = ss.id
GROUP BY ss.id, ss.current_bookings;

-- ========================================
-- STEP 7: consulting_slots과 test_slots 연결
-- ========================================

-- consulting_slots의 linked_seminar_id를 campaign_id로 업데이트
-- (기존 seminar id → campaign id로 매핑)
UPDATE consulting_slots cs
SET linked_seminar_id = s.id || '_campaign'
FROM seminars s
WHERE cs.linked_seminar_id = s.id;

-- ========================================
-- STEP 8: 롤백 준비
-- ========================================

-- 문제 발생 시 이 스크립트로 복구:
/*
-- 백업에서 복원
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS seminar_slots CASCADE;

ALTER TABLE reservations DROP COLUMN IF EXISTS campaign_id;
ALTER TABLE reservations DROP COLUMN IF EXISTS seminar_slot_id;

-- consulting_slots 원복 (필요시)
UPDATE consulting_slots cs
SET linked_seminar_id = REPLACE(linked_seminar_id, '_campaign', '')
WHERE linked_seminar_id LIKE '%_campaign';
*/

-- ========================================
-- 실행 완료!
-- ========================================

SELECT '✅ 마이그레이션 완료!' as status;
SELECT '⚠️  다음 단계: 코드 업데이트 필요' as next_step;
