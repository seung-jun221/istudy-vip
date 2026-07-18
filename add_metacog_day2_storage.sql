-- ============================================================
-- 메타인지 Day 2 — Storage 버킷 + 정책
-- ============================================================
-- metacog_questions.image_url이 참조하는 문항 이미지 저장소.
-- private 버킷 — signed URL로만 학생(anon) 접근 가능.
-- 업로드/수정/삭제는 super_admin 전용.
-- 파일명 컨벤션: mono/q01.png ~ mono/q60.png (트랙별 폴더, 제로패딩 필수)
-- ============================================================

-- ------------------------------------------------------------
-- 버킷 생성
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('metacog-questions', 'metacog-questions', false)
ON CONFLICT (id) DO UPDATE SET public = false;

COMMENT ON TABLE storage.buckets IS
  'metacog-questions 버킷: 메타인지 문항 이미지. private. signed URL로 anon 접근';

-- ------------------------------------------------------------
-- Storage RLS 정책
-- ------------------------------------------------------------
-- 기존 정책 정리
DROP POLICY IF EXISTS "super admin upload metacog questions" ON storage.objects;
DROP POLICY IF EXISTS "super admin update metacog questions" ON storage.objects;
DROP POLICY IF EXISTS "super admin delete metacog questions" ON storage.objects;
DROP POLICY IF EXISTS "super admin read metacog questions" ON storage.objects;

-- super_admin만 업로드
CREATE POLICY "super admin upload metacog questions" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'metacog-questions'
    AND auth_app_role() = 'super_admin'
  );

-- super_admin만 덮어쓰기
CREATE POLICY "super admin update metacog questions" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'metacog-questions' AND auth_app_role() = 'super_admin')
  WITH CHECK (bucket_id = 'metacog-questions' AND auth_app_role() = 'super_admin');

-- super_admin만 삭제
CREATE POLICY "super admin delete metacog questions" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'metacog-questions' AND auth_app_role() = 'super_admin');

-- super_admin이 관리 화면에서 목록/미리보기 조회
CREATE POLICY "super admin read metacog questions" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'metacog-questions' AND auth_app_role() = 'super_admin');

-- anon SELECT 정책은 없음. signed URL로만 접근(RLS 우회) → 사전 열람 원천 차단.

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT 'metacog-questions 버킷 존재' AS check, id, public
FROM storage.buckets
WHERE id = 'metacog-questions';

SELECT 'Storage 정책 확인' AS check, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%metacog%'
ORDER BY policyname;

SELECT '✅ Day 2 Storage 셋업 완료!' AS status;
