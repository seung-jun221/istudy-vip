-- ========================================
-- fix_reservations_seminar_id_nullable.sql
-- reservations 테이블의 seminar_id 컬럼을 NULLABLE로 변경
-- ========================================

-- seminar_id 컬럼을 NULL 허용으로 변경
ALTER TABLE reservations
ALTER COLUMN seminar_id DROP NOT NULL;

-- ========================================
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor 열기
-- 2. 이 스크립트 전체 복사/붙여넣기
-- 3. 실행
--
-- 변경사항:
-- - seminar_id 컬럼: NOT NULL → NULLABLE
-- - 이유: 새로운 설명회는 seminar_slots에만 존재하고 seminars 테이블에는 없음
-- - 영향: 기존 데이터는 변경 없음, 새 예약은 seminar_id 없이 생성 가능
--
-- 확인 방법:
-- 실행 후 설명회 예약 테스트
-- ========================================
