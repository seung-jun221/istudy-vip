-- ========================================
-- 안전한 예약 취소 트리거 설치
-- ========================================
--
-- 목적: 예약 취소 시 current_bookings 자동 감소
-- 안전성: INSERT는 무시 (기존 RPC가 처리), UPDATE만 처리
--
-- 작성일: 2025-11-11
-- ========================================

-- 1. 기존 트리거 확인 (있으면 제거)
DROP TRIGGER IF EXISTS consulting_cancellation_trigger ON consulting_reservations;
DROP FUNCTION IF EXISTS handle_reservation_cancellation();

-- 2. 취소 처리 함수 생성
CREATE OR REPLACE FUNCTION handle_reservation_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT는 무시 (기존 RPC 함수가 처리)
  -- UPDATE만 처리
  IF TG_OP = 'UPDATE' THEN

    -- 케이스 1: 활성 상태 → 취소 상태
    -- (confirmed/pending → cancelled/auto_cancelled)
    IF OLD.status NOT IN ('cancelled', 'auto_cancelled')
       AND NEW.status IN ('cancelled', 'auto_cancelled') THEN

      -- current_bookings 감소 (최소값 0)
      UPDATE consulting_slots
      SET current_bookings = GREATEST(current_bookings - 1, 0)
      WHERE id = OLD.slot_id;

      -- 로그 (선택사항)
      RAISE NOTICE '예약 취소: slot_id=%, current_bookings -1', OLD.slot_id;
    END IF;

    -- 케이스 2: 취소 상태 → 활성 상태 (복구)
    -- (cancelled/auto_cancelled → confirmed/pending)
    IF OLD.status IN ('cancelled', 'auto_cancelled')
       AND NEW.status NOT IN ('cancelled', 'auto_cancelled') THEN

      -- current_bookings 증가
      UPDATE consulting_slots
      SET current_bookings = current_bookings + 1
      WHERE id = NEW.slot_id;

      -- 로그 (선택사항)
      RAISE NOTICE '예약 복구: slot_id=%, current_bookings +1', NEW.slot_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 트리거 생성
CREATE TRIGGER consulting_cancellation_trigger
AFTER UPDATE ON consulting_reservations
FOR EACH ROW
EXECUTE FUNCTION handle_reservation_cancellation();

-- 4. 설치 확인
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'consulting_reservations'
  AND trigger_name = 'consulting_cancellation_trigger';

-- ========================================
-- 예상 결과:
-- trigger_name                     | event_manipulation | event_object_table        | action_timing
-- ---------------------------------+--------------------+---------------------------+--------------
-- consulting_cancellation_trigger  | UPDATE             | consulting_reservations   | AFTER
--
-- 위와 같이 나오면 설치 성공!
-- ========================================

-- ========================================
-- 테스트 (선택사항)
-- ========================================
--
-- 테스트 1: 예약 취소
-- UPDATE consulting_reservations
-- SET status = 'cancelled'
-- WHERE id = '테스트_예약_ID';
--
-- SELECT current_bookings FROM consulting_slots WHERE id = '슬롯_ID';
-- → current_bookings가 1 감소해야 함
--
-- 테스트 2: 취소 복구
-- UPDATE consulting_reservations
-- SET status = 'confirmed'
-- WHERE id = '테스트_예약_ID';
--
-- SELECT current_bookings FROM consulting_slots WHERE id = '슬롯_ID';
-- → current_bookings가 1 증가해야 함
--
-- ========================================

-- ========================================
-- 롤백 방법 (문제 발생 시)
-- ========================================
--
-- DROP TRIGGER IF EXISTS consulting_cancellation_trigger ON consulting_reservations;
-- DROP FUNCTION IF EXISTS handle_reservation_cancellation();
--
-- 위 2줄만 실행하면 즉시 롤백됩니다.
-- ========================================
