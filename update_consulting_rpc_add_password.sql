-- ========================================
-- update_consulting_rpc_add_password.sql
-- RPC 함수 업데이트: password 파라미터 추가
-- ========================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.create_consulting_reservation(
  uuid, text, text, text, text, text, text, text, text, boolean, uuid, text, boolean, timestamptz
);

-- 업데이트된 함수 생성 (password 파라미터 추가)
CREATE OR REPLACE FUNCTION public.create_consulting_reservation(
  p_slot_id uuid,
  p_slot_date text,
  p_slot_time text,
  p_slot_location text,
  p_student_name text,
  p_parent_phone text,
  p_school text,
  p_grade text,
  p_math_level text,
  p_password text,  -- ⭐ 비밀번호 파라미터 추가
  p_is_seminar_attendee boolean,
  p_linked_seminar_id uuid,
  p_privacy_consent text,
  p_test_deadline_agreed boolean DEFAULT false,
  p_test_deadline_agreed_at timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_reservation_id uuid;
  v_slot record;
BEGIN
  -- 1. 슬롯 정보 조회 및 잠금
  SELECT * INTO v_slot
  FROM consulting_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;

  -- 2. 예약 가능 여부 확인
  IF v_slot.current_bookings >= v_slot.max_capacity THEN
    RAISE EXCEPTION 'Slot is full';
  END IF;

  -- 3. 예약 생성
  INSERT INTO consulting_reservations (
    slot_id,
    student_name,
    parent_phone,
    school,
    grade,
    math_level,
    password,  -- ⭐ 비밀번호 필드 추가
    is_seminar_attendee,
    linked_seminar_id,
    privacy_consent,
    status,
    test_deadline_agreed,
    test_deadline_agreed_at
  ) VALUES (
    p_slot_id,
    p_student_name,
    p_parent_phone,
    p_school,
    p_grade,
    p_math_level,
    p_password,  -- ⭐ 비밀번호 값 추가
    p_is_seminar_attendee,
    p_linked_seminar_id,
    p_privacy_consent,
    'confirmed',
    p_test_deadline_agreed,
    p_test_deadline_agreed_at
  )
  RETURNING id INTO v_reservation_id;

  -- 4. 슬롯 예약 수 증가
  UPDATE consulting_slots
  SET current_bookings = current_bookings + 1
  WHERE id = p_slot_id;

  -- 5. 예약 ID 반환
  RETURN json_build_object('reservation_id', v_reservation_id);
END;
$function$;

-- ========================================
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor 열기
-- 2. 이 스크립트 전체 복사/붙여넣기
-- 3. 실행
--
-- 변경사항:
-- - p_password 파라미터 추가 (text 타입, p_math_level 다음에 위치)
-- - INSERT 문에 password 필드와 값 추가
-- ========================================
