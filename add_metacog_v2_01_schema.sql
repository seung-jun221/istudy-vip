-- ============================================================
-- 메타인지 v2 — Phase 1: 스키마 재편
-- ============================================================
-- 5문항 랜덤 검증 → 누테 25문항 채점제로 전환.
--
-- 변경:
--  · metacog_verify_items 폐기 (5문항 검증 컨셉 소멸)
--  · metacog_nute_grades 신규 (누테 25문항 O/X 채점 결과)
--
-- ⚠️ 이 마이그레이션은 기존 verify_items 데이터를 소실합니다.
--    운영 데이터가 있다면 백업 후 실행하세요.
--    현재는 테스트 데이터만 존재.
-- ============================================================

-- ------------------------------------------------------------
-- 1) 기존 verify_items 관련 RPC 폐기
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS grade_verify_items(UUID, JSONB);
DROP FUNCTION IF EXISTS get_verify_sheet_data(UUID);

-- ------------------------------------------------------------
-- 2) metacog_verify_items 테이블 폐기
-- ------------------------------------------------------------
DROP TABLE IF EXISTS metacog_verify_items CASCADE;

-- ------------------------------------------------------------
-- 3) metacog_nute_grades 신규 테이블
-- ------------------------------------------------------------
-- 학생 응시(attempt)별 누테 25문항(q_no 1~25) O/X 채점 결과.
-- 강사가 종이 채점 결과를 25문항 전체에 대해 입력.
-- (안다/모른다 무관 25개 전부 채점 — 지시서 4번)
-- ------------------------------------------------------------
CREATE TABLE metacog_nute_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES metacog_attempts(id) ON DELETE CASCADE,
  q_no INT NOT NULL CHECK (q_no BETWEEN 1 AND 25),
  correct BOOLEAN NOT NULL,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, q_no)
);

CREATE INDEX idx_metacog_nute_grades_attempt ON metacog_nute_grades(attempt_id);

COMMENT ON TABLE metacog_nute_grades IS
  '누테(당월시험) 25문항 O/X 채점 결과. q_no 1~25 = 종이 시험지 번호와 일치.';

-- ------------------------------------------------------------
-- 4) RLS 정책 (verify_items와 동일 정책 형태)
-- ------------------------------------------------------------
ALTER TABLE metacog_nute_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all nute grades" ON metacog_nute_grades
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "branch admin all own nute grades" ON metacog_nute_grades
  FOR ALL TO authenticated
  USING (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_attempts a
      JOIN metacog_sessions s ON s.id = a.session_id
      WHERE a.id = metacog_nute_grades.attempt_id
        AND s.branch_id = auth_app_branch_id()
    )
  )
  WITH CHECK (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_attempts a
      JOIN metacog_sessions s ON s.id = a.session_id
      WHERE a.id = metacog_nute_grades.attempt_id
        AND s.branch_id = auth_app_branch_id()
    )
  );

-- 학부모 리포트 anon 조회용 (UUID = 인증). 조회 전용.
CREATE POLICY "anon read nute grades for report" ON metacog_nute_grades
  FOR SELECT TO anon
  USING (true);

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT 'metacog_nute_grades 테이블 확인' AS check,
       COUNT(*)::TEXT AS row_count
FROM metacog_nute_grades;

SELECT 'metacog_verify_items 폐기 확인' AS check,
       (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = 'metacog_verify_items') AS should_be_zero;

SELECT '✅ v2 Phase 1 스키마 재편 완료' AS status;
