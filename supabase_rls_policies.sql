-- Supabase SQL Editor에서 실행할 SQL 스크립트
-- 관리자 페이지에서 캠페인 생성을 위한 RLS 정책 추가

-- 기존 정책 삭제 후 재생성 (에러 방지)

-- 1. seminars 테이블 INSERT 허용
DROP POLICY IF EXISTS "Allow insert on seminars" ON public.seminars;
CREATE POLICY "Allow insert on seminars"
ON public.seminars
FOR INSERT
TO public
WITH CHECK (true);

-- 2. consulting_slots 테이블 INSERT 허용
DROP POLICY IF EXISTS "Allow insert on consulting_slots" ON public.consulting_slots;
CREATE POLICY "Allow insert on consulting_slots"
ON public.consulting_slots
FOR INSERT
TO public
WITH CHECK (true);

-- 3. test_slots 테이블 INSERT 허용
DROP POLICY IF EXISTS "Allow insert on test_slots" ON public.test_slots;
CREATE POLICY "Allow insert on test_slots"
ON public.test_slots
FOR INSERT
TO public
WITH CHECK (true);

-- 4. test_methods 테이블 INSERT/UPDATE 허용
DROP POLICY IF EXISTS "Allow insert on test_methods" ON public.test_methods;
CREATE POLICY "Allow insert on test_methods"
ON public.test_methods
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on test_methods" ON public.test_methods;
CREATE POLICY "Allow update on test_methods"
ON public.test_methods
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 5. consulting_reservations 테이블 UPDATE 허용 (컨설팅 결과 작성용)
DROP POLICY IF EXISTS "Allow update on consulting_reservations" ON public.consulting_reservations;
CREATE POLICY "Allow update on consulting_reservations"
ON public.consulting_reservations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('seminars', 'consulting_slots', 'test_slots', 'test_methods', 'consulting_reservations');
