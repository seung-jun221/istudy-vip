-- ============================================================
-- 수강신청 (course_enrollments) 테이블
-- 목적: 설명회 후 학원 수강신청 접수 (학원이 개별 연락)
-- ============================================================

CREATE TABLE IF NOT EXISTS course_enrollments (
  id BIGSERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  school TEXT,
  grade TEXT,
  math_level TEXT,
  course_option INTEGER NOT NULL CHECK (course_option BETWEEN 1 AND 4),
  notes TEXT,
  location TEXT DEFAULT '사직캠퍼스',
  privacy_consent VARCHAR(1) NOT NULL DEFAULT 'Y',
  status TEXT NOT NULL DEFAULT '신청' CHECK (status IN ('신청', '연락중', '등록완료', '취소')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE course_enrollments IS '수강신청 접수 — 설명회 후 학원 수강 신청, 학원에서 개별 연락';
COMMENT ON COLUMN course_enrollments.course_option IS '1: 초등 교과반 / 2: 중등입문 특강 / 3: 중등심화 특강 / 4: 고등 교과반';
COMMENT ON COLUMN course_enrollments.status IS '신청 → 연락중 → 등록완료 / 취소';

CREATE INDEX IF NOT EXISTS idx_course_enrollments_created_at ON course_enrollments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_phone ON course_enrollments(parent_phone);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert course_enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "admin all course_enrollments" ON course_enrollments;

-- 학부모(anon): 신청 등록만 가능. 조회/수정 불가 (개인정보 보호)
CREATE POLICY "anon insert course_enrollments" ON course_enrollments
  FOR INSERT TO anon WITH CHECK (true);

-- 어드민(authenticated super_admin만): 전체 접근
-- 캠페인 스코핑은 아직 안 함 — 사직점 전용이라 단일 관리
CREATE POLICY "admin all course_enrollments" ON course_enrollments
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT 'course_enrollments 테이블 생성 확인' AS check,
       COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'course_enrollments';

SELECT 'RLS 정책 확인' AS check,
       policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'course_enrollments';

SELECT '✅ course_enrollments 마이그레이션 완료!' AS status;
