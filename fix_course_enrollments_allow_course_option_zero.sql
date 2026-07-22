-- ============================================================
-- course_enrollments — course_option CHECK 제약 완화
-- ============================================================
-- 증상: 9월 개강 사전 신청 저장 시 400 오류
--   new row for relation "course_enrollments" violates check
--   constraint "course_enrollments_course_option_check"
--
-- 원인: 기존 제약이 course_option IN (1,2,3,4,5) 만 허용.
--       사전 신청은 0 = '9월 개강 사전 신청'으로 저장하는데 걸림.
--
-- 수정: CHECK 제약을 0~5로 확장. 관리자 화면 매핑과 일치.
--   · 0 = 9월 개강 사전 신청 (진도 확인 후 반 배정)  ← 신규
--   · 1 = 초등 교과반 바로 입학
--   · 2 = 중등입문 방학특강
--   · 3 = 중등심화 방학특강
--   · 4 = 고등 교과반 바로 입학
--   · 5 = 상담 후 결정
-- ============================================================

ALTER TABLE course_enrollments
  DROP CONSTRAINT IF EXISTS course_enrollments_course_option_check;

ALTER TABLE course_enrollments
  ADD CONSTRAINT course_enrollments_course_option_check
  CHECK (course_option BETWEEN 0 AND 5);

-- 검증
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE cls.relname = 'course_enrollments'
  AND con.conname = 'course_enrollments_course_option_check';

SELECT '✅ course_option CHECK 제약이 0~5로 완화됨' AS status;
