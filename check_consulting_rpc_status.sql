-- ========================================
-- check_consulting_rpc_status.sql
-- RPC 함수의 현재 정의 확인
-- ========================================

-- 1. 함수의 전체 정의 확인
SELECT
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'create_consulting_reservation';

-- ========================================

-- 2. 파라미터 타입만 간단히 확인
SELECT
    proname AS function_name,
    pg_get_function_arguments(oid) AS parameters
FROM pg_proc
WHERE proname = 'create_consulting_reservation';

-- ========================================

-- 3. 파라미터별 상세 정보 확인
SELECT
    p.proname AS function_name,
    unnest(p.proargnames) AS parameter_name,
    unnest(string_to_array(pg_get_function_arguments(p.oid), ',')) AS parameter_type
FROM pg_proc p
WHERE p.proname = 'create_consulting_reservation';

-- ========================================
-- 사용 방법:
-- 1. Supabase Dashboard > SQL Editor 열기
-- 2. 위의 쿼리 중 하나를 선택해서 실행
--
-- 쿼리 설명:
-- - 첫 번째 쿼리: 전체 함수 정의를 확인 (가장 상세)
-- - 두 번째 쿼리: 파라미터 리스트만 확인 (중간)
-- - 세 번째 쿼리: 파라미터별 이름과 타입 확인 (간단)
--
-- 확인 포인트:
-- p_linked_seminar_id의 타입이 'uuid' 또는 'text'인지 확인!
-- ========================================
