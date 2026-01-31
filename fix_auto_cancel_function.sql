-- ========================================
-- auto_cancel_no_test_reservations 함수 수정 (v2)
--
-- 핵심 변경: consulting_reservation_id 연결 여부뿐 아니라
-- 같은 전화번호의 진단검사 예약도 확인하도록 수정
-- ========================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.auto_cancel_no_test_reservations();

-- 수정된 함수 생성
CREATE OR REPLACE FUNCTION public.auto_cancel_no_test_reservations()
RETURNS TABLE(cancelled_count integer, cancelled_ids uuid[])
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cancelled_count INT := 0;
  v_cancelled_ids UUID[] := ARRAY[]::UUID[];
  v_reservation_id UUID;
  v_slot_id UUID;
BEGIN
  -- 취소 대상 예약 찾기
  FOR v_reservation_id, v_slot_id IN
    SELECT
      cr.id as reservation_id,
      cr.slot_id
    FROM consulting_reservations cr
    WHERE cr.status IN ('confirmed', 'pending')
      AND cr.test_deadline_agreed = true
      AND cr.test_deadline_agreed_at IS NOT NULL
      AND DATE(cr.test_deadline_agreed_at) < CURRENT_DATE
      -- 연결된 진단검사 예약이 없음 (consulting_reservation_id로 연결)
      AND NOT EXISTS (
        SELECT 1 FROM test_reservations tr
        WHERE tr.consulting_reservation_id = cr.id
          AND tr.status IN ('confirmed', '예약')
      )
      -- 같은 전화번호로도 진단검사 예약이 없음 (미연결 entrance_test 포함)
      AND NOT EXISTS (
        SELECT 1 FROM test_reservations tr
        WHERE tr.parent_phone = cr.parent_phone
          AND tr.status IN ('confirmed', '예약')
      )
  LOOP
    -- 컨설팅 예약 취소
    UPDATE consulting_reservations
    SET
      status = 'auto_cancelled',
      cancel_reason = '진단검사 미예약으로 자동 취소 (당일 자정 마감)'
    WHERE id = v_reservation_id;

    -- 컨설팅 슬롯 감소
    UPDATE consulting_slots
    SET current_bookings = GREATEST(current_bookings - 1, 0)
    WHERE id = v_slot_id;

    v_cancelled_count := v_cancelled_count + 1;
    v_cancelled_ids := array_append(v_cancelled_ids, v_reservation_id);
  END LOOP;

  RETURN QUERY SELECT v_cancelled_count, v_cancelled_ids;
END;
$function$;

-- ========================================
-- 실행 방법:
-- 1. Supabase SQL Editor에서 위 CREATE OR REPLACE 부분만 실행
-- 2. 아래 테스트 쿼리로 확인
-- ========================================

-- 테스트: 현재 취소 대상 확인 (실제 취소 안 함, SELECT만)
SELECT
  cr.id,
  cr.student_name,
  cr.parent_phone,
  cr.status,
  cr.test_deadline_agreed_at,
  DATE(cr.test_deadline_agreed_at) as deadline_date,
  CURRENT_DATE as today,
  EXISTS (
    SELECT 1 FROM test_reservations tr
    WHERE tr.consulting_reservation_id = cr.id
      AND tr.status IN ('confirmed', '예약')
  ) as has_linked_test,
  EXISTS (
    SELECT 1 FROM test_reservations tr
    WHERE tr.parent_phone = cr.parent_phone
      AND tr.status IN ('confirmed', '예약')
  ) as has_phone_test
FROM consulting_reservations cr
WHERE cr.status IN ('confirmed', 'pending')
  AND cr.test_deadline_agreed = true
  AND cr.test_deadline_agreed_at IS NOT NULL
  AND DATE(cr.test_deadline_agreed_at) < CURRENT_DATE
ORDER BY cr.parent_phone;
