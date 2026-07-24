-- ============================================================
-- 메타인지 모노 트랙 재배치 전 — DB 상태 백업 (필수)
-- ============================================================
-- 사용법:
--   1) Supabase SQL Editor에서 아래 쿼리 실행
--   2) 결과를 로컬에 JSON 또는 CSV로 저장 (Editor 다운로드 기능)
--   3) 문제 발생 시 이 데이터로 복구
--
-- ⚠️ Storage 파일 백업은 별도 필요:
--   Supabase 대시보드 → Storage → metacog-questions → mono 폴더
--   전체 파일 선택 → Download (또는 대시보드에서 개별 다운로드)
--   압축해서 로컬에 보관 권장
-- ============================================================

-- 현재 모노 트랙 전체 스냅샷
SELECT
  id,
  track,
  q_no,
  image_url,
  unit_tag,
  source_ref,
  answer,
  created_at,
  updated_at
FROM metacog_questions
WHERE track = 'mono'
ORDER BY q_no;

-- 개수 확인 (60이 아니어도 정상, 관리자 등록 상태 기록용)
SELECT 'mono 트랙 등록 문항 수' AS check, COUNT(*) AS count
FROM metacog_questions WHERE track = 'mono';
