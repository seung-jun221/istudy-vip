-- ========================================
-- 진단검사 RLS 정책 수정
-- 목적: 익명 사용자가 답안을 제출할 수 있도록 허용
-- ========================================

-- ========================================
-- diagnostic_submissions 테이블 정책 수정
-- ========================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can insert their own submissions" ON diagnostic_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON diagnostic_submissions;

-- 새로운 정책: 익명 사용자도 INSERT 가능
CREATE POLICY "Anyone can insert submissions" ON diagnostic_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 새로운 정책: 전화번호로 조회 (기존 유지하되 익명 사용자 포함)
CREATE POLICY "Anyone can view submissions by phone" ON diagnostic_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 새로운 정책: 등록 정보 수정 허용 (관리자 수동등록 학생 수정용)
DROP POLICY IF EXISTS "Anyone can update submissions" ON diagnostic_submissions;
CREATE POLICY "Anyone can update submissions" ON diagnostic_submissions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================
-- diagnostic_results 테이블 정책 수정
-- ========================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own results" ON diagnostic_results;
DROP POLICY IF EXISTS "System can insert results" ON diagnostic_results;

-- 새로운 정책: 익명 사용자도 INSERT 가능
CREATE POLICY "Anyone can insert results" ON diagnostic_results
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 새로운 정책: 모든 사용자가 결과 조회 가능 (전화번호 필터는 앱에서 처리)
CREATE POLICY "Anyone can view results" ON diagnostic_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ========================================
-- diagnostic_reports 테이블 정책 수정
-- ========================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own reports" ON diagnostic_reports;
DROP POLICY IF EXISTS "System can insert reports" ON diagnostic_reports;

-- 새로운 정책: 익명 사용자도 INSERT 가능
CREATE POLICY "Anyone can insert reports" ON diagnostic_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 새로운 정책: 모든 사용자가 보고서 조회 가능
CREATE POLICY "Anyone can view reports" ON diagnostic_reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ========================================
-- 완료 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 진단검사 RLS 정책 수정 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '수정된 정책:';
  RAISE NOTICE '1. diagnostic_submissions - 익명 사용자 INSERT/SELECT/UPDATE 허용';
  RAISE NOTICE '2. diagnostic_results - 익명 사용자 INSERT/SELECT 허용';
  RAISE NOTICE '3. diagnostic_reports - 익명 사용자 INSERT/SELECT 허용';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  보안 참고: 데이터 필터링은 애플리케이션 레이어에서 처리됩니다.';
  RAISE NOTICE '========================================';
END $$;
