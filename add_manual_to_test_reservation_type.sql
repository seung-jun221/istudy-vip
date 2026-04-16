-- ========================================
-- Migration: test_reservations.reservation_type에 'manual' 값 허용
-- 목적: 통합학생관리에서 관리자가 수동으로 진단검사를 배정할 때
--       reservation_type='manual'로 저장하여 TestsTab '수동등록'
--       카테고리에서 집계되도록 한다.
--
-- 배경: 기존 CHECK 제약조건은 'consulting_linked' / 'entrance_test'만
--       허용하여 'manual' INSERT가 400 에러로 실패함.
-- ========================================

-- 1. 기존 CHECK 제약조건 제거 (이름은 DB마다 다를 수 있어 모든 후보를 시도)
ALTER TABLE test_reservations
  DROP CONSTRAINT IF EXISTS test_reservations_reservation_type_check;

-- 2. 확장된 CHECK 제약조건 추가
--    - consulting_linked: 컨설팅 연계 예약 (기본)
--    - entrance_test   : 입학테스트 독립 예약
--    - manual          : 관리자 수동 배정 (신규)
ALTER TABLE test_reservations
  ADD CONSTRAINT test_reservations_reservation_type_check
  CHECK (reservation_type IN ('consulting_linked', 'entrance_test', 'manual'));

-- 3. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ test_reservations.reservation_type에 manual 값 허용 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '허용되는 값:';
  RAISE NOTICE '1. consulting_linked - 컨설팅 연계 예약';
  RAISE NOTICE '2. entrance_test     - 입학테스트 독립 예약';
  RAISE NOTICE '3. manual            - 관리자 수동 배정 (신규)';
  RAISE NOTICE '========================================';
END $$;
