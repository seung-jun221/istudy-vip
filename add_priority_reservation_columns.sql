-- ========================================
-- 우선예약 기능 마이그레이션 스크립트
-- 목적: 특정 설명회에 대해 기존 참석자 우선예약 기간 설정
-- ========================================

-- ========================================
-- STEP 1: seminar_slots 테이블에 컬럼 추가
-- ========================================

-- priority_open_at: 우선예약 오픈 시간 (기존 참석자만 예약 가능)
ALTER TABLE seminar_slots
ADD COLUMN IF NOT EXISTS priority_open_at TIMESTAMP WITH TIME ZONE;

-- public_open_at: 일반 오픈 시간 (누구나 예약 가능)
ALTER TABLE seminar_slots
ADD COLUMN IF NOT EXISTS public_open_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- STEP 2: 컬럼 설명 (주석)
-- ========================================
COMMENT ON COLUMN seminar_slots.priority_open_at IS '우선예약 오픈 시간 - 이 시간부터 기존 참석자만 예약 가능';
COMMENT ON COLUMN seminar_slots.public_open_at IS '일반 오픈 시간 - 이 시간부터 누구나 예약 가능';

-- ========================================
-- 사용법 예시
-- ========================================
--
-- 우선예약 기능을 사용하려면:
-- 1. priority_open_at: 우선예약 시작 시간 (기존 참석자만)
-- 2. public_open_at: 일반 예약 시작 시간 (누구나)
--
-- 예시: 2/12 오전 9시 우선오픈, 저녁 6시 일반오픈
-- UPDATE seminar_slots
-- SET
--   priority_open_at = '2026-02-12 09:00:00+09',
--   public_open_at = '2026-02-12 18:00:00+09'
-- WHERE id = '특정_슬롯_ID';
--
-- 로직:
-- - 현재시간 < priority_open_at → 예약 불가 (오픈 전)
-- - priority_open_at <= 현재시간 < public_open_at → 기존 참석자만 예약 가능
-- - 현재시간 >= public_open_at → 누구나 예약 가능
-- - priority_open_at, public_open_at이 NULL이면 기존 방식대로 동작

-- ========================================
-- 검증
-- ========================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'seminar_slots'
  AND column_name IN ('priority_open_at', 'public_open_at');

SELECT '✅ 우선예약 컬럼 추가 완료!' as status;
