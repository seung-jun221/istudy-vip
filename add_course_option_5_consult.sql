-- ============================================================
-- 수강신청 course_option에 5번(상담 후 결정) 추가
-- ============================================================
-- 배경: 4개 과정 중 어떤 것도 확실하지 않은 학부모를 위한
--       "상담 후 결정" 옵션을 라디오 맨 아래에 추가.
-- 기존 CHECK constraint (BETWEEN 1 AND 4)를 (BETWEEN 1 AND 5)로 완화.
-- ============================================================

ALTER TABLE course_enrollments
  DROP CONSTRAINT IF EXISTS course_enrollments_course_option_check;

ALTER TABLE course_enrollments
  ADD CONSTRAINT course_enrollments_course_option_check
  CHECK (course_option BETWEEN 1 AND 5);

COMMENT ON COLUMN course_enrollments.course_option IS
  '1: 초등 교과반 / 2: 중등입문 특강 / 3: 중등심화 특강 / 4: 고등 교과반 / 5: 상담 후 결정';

-- 검증
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'course_enrollments'
  AND con.contype = 'c';

SELECT '✅ course_option 1~5 허용 완료!' AS status;
