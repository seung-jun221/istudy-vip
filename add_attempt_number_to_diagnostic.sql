-- ============================================================
-- 진단검사 재응시 회차 추적 (attempt_number)
-- ============================================================
-- 목적:
--   같은 학생(parent_phone + student_name + test_type)이 시간이 지나
--   재응시했을 때 이전 결과를 덮어쓰지 않고 회차별로 누적 보관.
--   학원 관점의 성장 추적 자산 확보.
--
-- 정책:
--   - 학부모/학생 공개 흐름은 최신 회차 결과 URL만 안내됨
--     (URL이 result_id 기반이라 자동으로 회차별 분리)
--   - 재응시 조건 없음(무제한)
--   - 재응시 감지 시 안내는 "N회차 응시로 기록됩니다" 정도로 담백
--
-- 구현:
--   1) diagnostic_submissions에 attempt_number INT 추가
--   2) 기존 데이터 백필 (submitted_at ordering 기준으로 1, 2, 3...)
--   3) BEFORE INSERT 트리거로 신규 삽입 시 자동 할당 — 클라이언트는
--      아무것도 신경 쓸 필요 없음
--   4) 조회 인덱스 추가
-- ============================================================

-- 1) 컬럼 추가 (기본값 1 — 트리거가 실제 값 부여)
ALTER TABLE diagnostic_submissions
  ADD COLUMN IF NOT EXISTS attempt_number INT NOT NULL DEFAULT 1;

COMMENT ON COLUMN diagnostic_submissions.attempt_number IS
  '같은 학생(parent_phone + student_name)의 같은 test_type 응시 회차 번호. BEFORE INSERT 트리거가 자동 할당.';

-- 2) 기존 데이터 백필 — 학생·시험유형별로 시간 순 회차 부여
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY parent_phone, student_name, test_type
      ORDER BY COALESCE(submitted_at, created_at)
    ) AS rn
  FROM diagnostic_submissions
)
UPDATE diagnostic_submissions ds
SET attempt_number = ranked.rn
FROM ranked
WHERE ds.id = ranked.id
  AND ds.attempt_number IS DISTINCT FROM ranked.rn;

-- 3) 조회 인덱스 (재응시 감지 · 학생별 이력 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_diag_submissions_student
  ON diagnostic_submissions (parent_phone, student_name, test_type);

-- 4) BEFORE INSERT 트리거로 attempt_number 자동 할당
CREATE OR REPLACE FUNCTION set_diagnostic_attempt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 같은 학생·같은 시험유형의 기존 최대 회차 + 1
  -- (parent_phone/student_name/test_type 중 하나라도 NULL이면 1)
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO NEW.attempt_number
  FROM diagnostic_submissions
  WHERE parent_phone = NEW.parent_phone
    AND student_name = NEW.student_name
    AND test_type = NEW.test_type;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_diagnostic_attempt_number ON diagnostic_submissions;

CREATE TRIGGER trg_set_diagnostic_attempt_number
  BEFORE INSERT ON diagnostic_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_diagnostic_attempt_number();

COMMENT ON FUNCTION set_diagnostic_attempt_number IS
  '진단검사 응시 회차 자동 할당 트리거. 클라이언트가 attempt_number를 무엇으로 보내도 서버가 항상 재계산.';

-- ============================================================
-- 검증
-- ============================================================

-- 컬럼 존재 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'diagnostic_submissions'
  AND column_name = 'attempt_number';

-- 트리거 존재 확인
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'diagnostic_submissions'::regclass
  AND tgname = 'trg_set_diagnostic_attempt_number';

-- 백필 결과 요약 — 재응시 학생 수
SELECT
  '재응시 이력 요약' AS check,
  COUNT(DISTINCT (parent_phone, student_name, test_type)) AS 학생_시험유형_조합수,
  COUNT(*) AS 전체_응시_수,
  COUNT(*) FILTER (WHERE attempt_number > 1) AS 재응시_행_수,
  MAX(attempt_number) AS 최대_회차
FROM diagnostic_submissions;

SELECT '✅ diagnostic_submissions.attempt_number 마이그레이션 완료!' AS status;
