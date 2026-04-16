-- ========================================
-- Migration: test_slots 테이블 UPDATE / DELETE RLS 정책 추가
-- 목적: 관리자 페이지에서 진단검사 슬롯 수정/삭제가 RLS 로 인해
--       조용히 무시되는 문제 해결.
--
-- 배경: 기존 supabase_rls_policies.sql 에는 test_slots INSERT 정책만
--       존재하여 UPDATE/DELETE 호출이 0 row 처리되며 에러 없이 실패.
--       이로 인해 관리자가 슬롯 시간을 수정해도 DB 반영이 안 됨.
-- ========================================

-- 1. UPDATE 허용 정책
DROP POLICY IF EXISTS "Allow update on test_slots" ON public.test_slots;
CREATE POLICY "Allow update on test_slots"
ON public.test_slots
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 2. DELETE 허용 정책 (관리자 삭제 기능용)
DROP POLICY IF EXISTS "Allow delete on test_slots" ON public.test_slots;
CREATE POLICY "Allow delete on test_slots"
ON public.test_slots
FOR DELETE
TO public
USING (true);

-- 3. (참고) consulting_slots / seminar_slots 에도 같은 이슈가 있을 수 있어
--    동일한 패턴의 정책을 함께 적용 (이미 있으면 DROP 후 재생성)
DROP POLICY IF EXISTS "Allow update on consulting_slots" ON public.consulting_slots;
CREATE POLICY "Allow update on consulting_slots"
ON public.consulting_slots
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete on consulting_slots" ON public.consulting_slots;
CREATE POLICY "Allow delete on consulting_slots"
ON public.consulting_slots
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Allow update on seminar_slots" ON public.seminar_slots;
CREATE POLICY "Allow update on seminar_slots"
ON public.seminar_slots
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete on seminar_slots" ON public.seminar_slots;
CREATE POLICY "Allow delete on seminar_slots"
ON public.seminar_slots
FOR DELETE
TO public
USING (true);

-- 4. 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('test_slots', 'consulting_slots', 'seminar_slots')
ORDER BY tablename, cmd;

-- 5. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ slot 테이블 UPDATE/DELETE RLS 정책 추가 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '적용 대상 테이블:';
  RAISE NOTICE '  • test_slots       (UPDATE + DELETE)';
  RAISE NOTICE '  • consulting_slots (UPDATE + DELETE)';
  RAISE NOTICE '  • seminar_slots    (UPDATE + DELETE)';
  RAISE NOTICE '========================================';
END $$;
