-- ========================================
-- 2/26 특별 설명회 슬롯 설정 스크립트
-- ========================================
--
-- 설명회 정보:
-- - 날짜: 2026-02-26
-- - 규모: 200석
-- - 우선예약 오픈: 2/12 오전 9시 (기존 참석자만)
-- - 일반 오픈: 2/12 저녁 6시 (누구나)
--
-- ========================================

-- STEP 1: 먼저 부산 사직 캠페인 ID 확인
SELECT id, title, location, status
FROM campaigns
WHERE location LIKE '%사직%' OR location LIKE '%부산%'
ORDER BY created_at DESC;

-- STEP 2: 특별 설명회 슬롯 생성 (캠페인 ID를 확인 후 아래 쿼리 실행)
-- ⚠️ 아래 'YOUR_CAMPAIGN_ID'를 실제 캠페인 ID로 교체하세요

/*
INSERT INTO seminar_slots (
  id,
  campaign_id,
  session_number,
  title,
  date,
  time,
  location,
  max_capacity,
  display_capacity,
  duration,
  status,
  priority_open_at,
  public_open_at
) VALUES (
  'special-seminar-226',                        -- 고유 ID
  'YOUR_CAMPAIGN_ID',                           -- 캠페인 ID (STEP 1에서 확인)
  14,                                           -- 14차 설명회 (기존 13차까지 있으므로)
  '14차 특별 설명회 (외부 대관)',                 -- 타이틀
  '2026-02-26',                                 -- 설명회 날짜
  '10:00:00',                                   -- 설명회 시간 (필요시 수정)
  '외부 대관 장소 (상세 주소 입력)',              -- 장소
  200,                                          -- 실제 정원
  200,                                          -- 노출 정원
  '90분',                                       -- 소요시간
  'active',                                     -- 상태
  '2026-02-12 09:00:00+09',                     -- 우선예약 오픈 (2/12 오전 9시)
  '2026-02-12 18:00:00+09'                      -- 일반 오픈 (2/12 저녁 6시)
);
*/

-- STEP 3: 기존 슬롯에 우선예약 설정을 추가하는 경우 (이미 슬롯이 있다면)
-- ⚠️ 'YOUR_SLOT_ID'를 실제 슬롯 ID로 교체하세요

/*
UPDATE seminar_slots
SET
  priority_open_at = '2026-02-12 09:00:00+09',
  public_open_at = '2026-02-12 18:00:00+09',
  max_capacity = 200,
  display_capacity = 200
WHERE id = 'YOUR_SLOT_ID';
*/

-- ========================================
-- 설정 확인
-- ========================================

-- 우선예약이 설정된 슬롯 확인
SELECT
  ss.id,
  ss.title,
  ss.date,
  ss.time,
  ss.max_capacity,
  ss.priority_open_at,
  ss.public_open_at,
  c.title as campaign_title
FROM seminar_slots ss
JOIN campaigns c ON ss.campaign_id = c.id
WHERE ss.priority_open_at IS NOT NULL
   OR ss.public_open_at IS NOT NULL
ORDER BY ss.date DESC;

-- ========================================
-- 우선예약 로직 설명
-- ========================================
--
-- 1. 현재시간 < priority_open_at
--    → 예약 불가 (오픈 전)
--    → UI: "2/12 09:00 오픈 예정" 표시
--
-- 2. priority_open_at <= 현재시간 < public_open_at
--    → 기존 참석자만 예약 가능 (우선예약 기간)
--    → 같은 캠페인에서 status='참석'인 예약이 있는 전화번호만 허용
--    → UI: "기존 참석자 우선예약" 뱃지 표시
--
-- 3. 현재시간 >= public_open_at
--    → 누구나 예약 가능 (일반 오픈)
--    → 기존 로직과 동일
--
-- ========================================
