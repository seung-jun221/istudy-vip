-- ========================================
-- auto_cancel_no_test_reservations 함수 수정
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
    LEFT JOIN test_reservations tr
      ON cr.id = tr.consulting_reservation_id
      AND tr.status IN ('confirmed', '예약')  -- ⭐ 수정: '예약' status도 포함
    WHERE cr.status IN ('confirmed', 'pending')  -- ⭐ 수정: pending도 포함
      AND tr.id IS NULL  -- 진단검사 예약이 없음
      AND cr.test_deadline_agreed = true  -- 동의했음
      AND cr.test_deadline_agreed_at IS NOT NULL  -- 동의 날짜 있음
      AND DATE(cr.test_deadline_agreed_at) < CURRENT_DATE  -- ⭐ 수정: 동의 날짜 기준
  LOOP
    -- 컨설팅 예약 취소
    UPDATE consulting_reservations
    SET
      status = 'cancelled',  -- ⭐ 수정: 'cancelled'로 통일
      cancel_reason = '진단검사 미예약으로 자동 취소 (당일 자정 마감)',
      cancelled_at = NOW()
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

-- 테스트 실행 (실제로 취소되는지 확인)
SELECT * FROM auto_cancel_no_test_reservations();

-- ========================================

-- 취소된 예약 확인
SELECT
  id,
  student_name,
  parent_phone,
  status,
  cancel_reason,
  test_deadline_agreed_at,
  cancelled_at
FROM consulting_reservations
WHERE status = 'cancelled'
  AND cancel_reason LIKE '%자동 취소%'
ORDER BY cancelled_at DESC;

-- ========================================
-- 실행 방법:
-- 1. Supabase SQL Editor에서 이 전체 스크립트 실행
-- 2. 함수가 업데이트됨
-- 3. 테스트 실행 결과 확인
-- 4. 취소된 예약 확인
--
-- 주요 수정사항:
-- - created_at → test_deadline_agreed_at으로 변경
-- - tr.status = 'confirmed' → IN ('confirmed', '예약')
-- - status = 'auto_cancelled' → 'cancelled'
-- - cancelled_at 필드 추가
-- ========================================
