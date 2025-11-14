-- ========================================
-- Migration: 진단검사 등록 정보 필드 추가
-- 목적: 학생 추가 시 시험 날짜/시간/장소 정보 저장
-- ========================================

-- 1. diagnostic_submissions 테이블에 예약 정보 컬럼 추가
ALTER TABLE diagnostic_submissions
  ADD COLUMN IF NOT EXISTS test_date DATE,
  ADD COLUMN IF NOT EXISTS test_time TIME,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. answers 컬럼을 nullable로 변경 (등록 시에는 null, 제출 시 업데이트)
ALTER TABLE diagnostic_submissions
  ALTER COLUMN answers DROP NOT NULL;

-- 3. submission_type에 'registration' 타입 추가
ALTER TABLE diagnostic_submissions
  DROP CONSTRAINT IF EXISTS diagnostic_submissions_submission_type_check;

ALTER TABLE diagnostic_submissions
  ADD CONSTRAINT diagnostic_submissions_submission_type_check
  CHECK (submission_type IN ('auto', 'manual', 'registration'));

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_diagnostic_submissions_test_date ON diagnostic_submissions(test_date);
CREATE INDEX IF NOT EXISTS idx_diagnostic_submissions_location ON diagnostic_submissions(location);

-- 5. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 진단검사 등록 필드 추가 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '추가된 컬럼:';
  RAISE NOTICE '1. test_date - 시험 날짜';
  RAISE NOTICE '2. test_time - 시험 시간';
  RAISE NOTICE '3. location - 시험 장소';
  RAISE NOTICE '========================================';
  RAISE NOTICE '변경된 제약조건:';
  RAISE NOTICE '1. answers - nullable 허용 (등록 시 null)';
  RAISE NOTICE '2. submission_type - registration 타입 추가';
  RAISE NOTICE '========================================';
END $$;
