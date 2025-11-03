-- ========================================
-- fix_consulting_rpc_linked_seminar_id_type.sql
-- 구버전 RPC 함수 삭제 (p_linked_seminar_id가 uuid인 버전)
-- ========================================

-- 구버전 함수 삭제 (password 파라미터 없고, p_linked_seminar_id가 uuid인 버전)
DROP FUNCTION IF EXISTS public.create_consulting_reservation(
  date,
  time,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  uuid,
  text
);

-- ========================================
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor 열기
-- 2. 이 스크립트 전체 복사/붙여넣기
-- 3. 실행
--
-- 변경사항:
-- - 구버전 함수 삭제
-- - 신버전 함수만 남음 (p_linked_seminar_id가 text, password 파라미터 있음)
--
-- 확인 방법:
-- 실행 후 check_consulting_rpc_status.sql로 다시 확인
-- → 함수가 1개만 남아있어야 함
-- ========================================
