-- ============================================================
-- 메타인지 트레이닝 시스템 Day 1 — 스키마 + 어드민 인증 확장
-- ============================================================
-- 배경:
--   누테날 5대 이벤트 중 하나로 "안다고 착각 vs 진짜 앎" 훈련.
--   현재는 istudy-vip에 임시 구축하고 추후 통합 학원관리 시스템으로 이전.
--   예약 관련 테이블과는 완전 독립 (FK/JOIN 금지).
--
-- 결정 로그 (대화 기록):
--   A. branch_id 정책 → 별도 branches 테이블 신설 (통합 시스템 마스터로 처음부터)
--   B. 검증 채점 → 별도 metacog_verify_items 테이블 (배열 인덱스 대응 폐기)
--   C. PDF → Phase 2로 미룸 (강사 수동 조판)
--   D. 학생 인증 → 이름 + 뒷 4자리
--   E. 관리자 진입 → CampaignList 헤더 링크 (Day 2)
--
-- 어드민 인증:
--   기존 super_admin / campaign_admin에 branch_admin 롤 신규 추가.
--   이전 시 branch_admin은 통합 시스템으로 그대로 이동, campaign_admin은 예약에 잔류.
--
-- Day 1 범위:
--   1) branches 마스터 + 사직캠퍼스 초기 등록
--   2) metacog_tracks (mono, tri; tetra는 미래)
--   3) students 마스터 (통합 시스템 기준)
--   4) metacog_questions / sessions / attempts / answers / verify_items
--   5) auth_app_branch_id() 헬퍼
--   6) update_branch_admin_password, has_branch_admin RPC
--   7) find_admin_by_password 확장 (branch_id 반환)
--   8) RLS (super_admin 전체, branch_admin 지점 스코프, anon 최소한만)
--
-- Day 2 이후: 학생 응시 RPC, 관리자 UI, 리포트 페이지
-- ============================================================

-- ------------------------------------------------------------
-- 1) branches — 통합 시스템 마스터
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,           -- 'sajik' | 'daechi' | ...
  name TEXT NOT NULL,                  -- '사직캠퍼스'
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE branches IS '지점 마스터 — 통합 학원관리 시스템의 핵심 마스터. 이전 시 그대로 승계';
COMMENT ON COLUMN branches.code IS '지점 식별 코드 (영문 소문자, URL/이메일 안전)';

-- 초기 데이터: 사직 하나만
INSERT INTO branches (code, name) VALUES ('sajik', '사직캠퍼스')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- 2) metacog_tracks — 트랙 정의
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metacog_tracks (
  code TEXT PRIMARY KEY,               -- 'mono' | 'tri' | 'tetra'
  label TEXT NOT NULL,                 -- '모노' | '트라이' | '테트라'
  scope_desc TEXT,                     -- '모노 1~9권'
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE metacog_tracks IS '메타인지 트랙 정의 — 하드코딩 대신 데이터로 관리. 테트라는 향후 개설';

INSERT INTO metacog_tracks (code, label, scope_desc, sort_order) VALUES
  ('mono', '모노', '모노 1~9권', 1),
  ('tri', '트라이', '다이 10~11권 + 트라이 1~4권', 2)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- 3) students — 학생 마스터 (지점 전용)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  class_name TEXT,                     -- 'MS_3' 등
  track TEXT NOT NULL REFERENCES metacog_tracks(code),
  verify_code TEXT NOT NULL,           -- 학부모 연락처 뒷 4자리
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_lookup ON students(branch_id, name, verify_code);
CREATE INDEX IF NOT EXISTS idx_students_branch_track_active ON students(branch_id, track, active);

COMMENT ON TABLE students IS '학생 마스터 — 통합 학원관리 시스템의 학생 기준. 누테/포인트몰이 향후 이 테이블 참조';
COMMENT ON COLUMN students.verify_code IS '학생 인증용 (학부모 연락처 뒷 4자리)';

-- ------------------------------------------------------------
-- 4) metacog_questions — 문항 풀 (전 지점 공유)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metacog_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track TEXT NOT NULL REFERENCES metacog_tracks(code),
  q_no INT NOT NULL CHECK (q_no BETWEEN 1 AND 60),
  image_url TEXT NOT NULL,             -- Storage 상대경로 (예: 'mono/q17.png')
  answer TEXT,                         -- 정답 (관리자 조회용)
  unit_tag TEXT,                       -- 단원 태그 (6월부터 입력)
  difficulty TEXT,                     -- 난이도 (컬럼만, 향후)
  source_ref TEXT,                     -- '모노3권 42p 구조적해석 2-1'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (track, q_no)
);

CREATE INDEX IF NOT EXISTS idx_metacog_questions_track ON metacog_questions(track, q_no);

COMMENT ON COLUMN metacog_questions.image_url IS 'Supabase Storage(metacog-questions 버킷)의 상대 경로. 베이스 URL은 코드에서 결합';
COMMENT ON COLUMN metacog_questions.answer IS '정답. 학생(anon)에게 절대 노출 금지 — 별도 RPC로만 접근';

-- ------------------------------------------------------------
-- 5) metacog_sessions — 회차 (지점 전용)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metacog_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,                 -- '2026년 6월 누테 메타인지 — 모노반'
  track TEXT NOT NULL REFERENCES metacog_tracks(code),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metacog_sessions_branch ON metacog_sessions(branch_id, status);

-- ------------------------------------------------------------
-- 6) metacog_attempts — 응시 기록
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metacog_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES metacog_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)      -- 중복 응시 차단
);

CREATE INDEX IF NOT EXISTS idx_metacog_attempts_session ON metacog_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_metacog_attempts_student ON metacog_attempts(student_id);

COMMENT ON COLUMN metacog_attempts.submitted_at IS 'NULL이면 미제출 상태. 응시 완료 시점에 기록';

-- ------------------------------------------------------------
-- 7) metacog_answers — 문항별 판단
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metacog_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES metacog_attempts(id) ON DELETE CASCADE,
  q_no INT NOT NULL CHECK (q_no BETWEEN 1 AND 60),
  judgment TEXT NOT NULL CHECK (judgment IN ('can', 'cannot')),
  forced BOOLEAN NOT NULL DEFAULT FALSE,   -- 시간 초과 자동 처리
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, q_no)
);

CREATE INDEX IF NOT EXISTS idx_metacog_answers_attempt ON metacog_answers(attempt_id);

-- ------------------------------------------------------------
-- 8) metacog_verify_items — 검증 5문항 채점 (배열 대응 폐기, 별도 테이블)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metacog_verify_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES metacog_attempts(id) ON DELETE CASCADE,
  q_no INT NOT NULL CHECK (q_no BETWEEN 1 AND 60),  -- 원본 문항번호 유지
  correct BOOLEAN,                     -- NULL = 미채점
  graded_at TIMESTAMPTZ,
  UNIQUE (attempt_id, q_no)
);

CREATE INDEX IF NOT EXISTS idx_metacog_verify_items_attempt ON metacog_verify_items(attempt_id);

COMMENT ON TABLE metacog_verify_items IS '검증 5문항 개별 채점 결과. 배열 인덱스 대응 방식 폐기 — 정합성/수정 용이';
COMMENT ON COLUMN metacog_verify_items.q_no IS '원본 문항번호(Q17 등). PDF/채점 UI/오답 표기 모두 이 번호 사용';

-- ============================================================
-- 어드민 인증 확장 — branch_admin 롤
-- ============================================================

-- ------------------------------------------------------------
-- 9) auth_app_branch_id() — JWT의 branch_id 클레임 접근자
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_app_branch_id() RETURNS TEXT
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'branch_id')
$$;

GRANT EXECUTE ON FUNCTION auth_app_branch_id() TO anon, authenticated;

-- ------------------------------------------------------------
-- 10) update_branch_admin_password — super_admin 전용
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS update_branch_admin_password(TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_branch_admin_password(
  p_branch_id TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  v_caller_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: super_admin only';
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 4 THEN
    RAISE EXCEPTION '비번은 4자 이상이어야 합니다.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM branches WHERE id = p_branch_id) THEN
    RAISE EXCEPTION 'branch_id not found: %', p_branch_id;
  END IF;

  PERFORM _admin_auth_upsert_user(
    'branch-' || p_branch_id || '@istudy.local',
    p_new_password,
    jsonb_build_object('role', 'branch_admin', 'branch_id', p_branch_id)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION update_branch_admin_password(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION update_branch_admin_password IS '지점 admin 비번 설정/변경 — super admin 권한 필요';

-- ------------------------------------------------------------
-- 11) has_branch_admin — UI 표시용
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS has_branch_admin(TEXT);

CREATE OR REPLACE FUNCTION has_branch_admin(p_branch_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT;
  v_exists BOOLEAN;
BEGIN
  v_email := 'branch-' || p_branch_id || '@istudy.local';
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE email = v_email
      AND encrypted_password IS NOT NULL
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION has_branch_admin(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 12) find_admin_by_password — branch_id 반환 확장
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS find_admin_by_password(TEXT);

CREATE OR REPLACE FUNCTION find_admin_by_password(p_password TEXT)
RETURNS TABLE (
  email TEXT,
  admin_role TEXT,
  admin_campaign_id TEXT,
  admin_branch_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF p_password IS NULL OR p_password = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.email::TEXT,
    (u.raw_app_meta_data ->> 'role')::TEXT,
    (u.raw_app_meta_data ->> 'campaign_id')::TEXT,
    (u.raw_app_meta_data ->> 'branch_id')::TEXT
  FROM auth.users u
  WHERE u.encrypted_password = crypt(p_password, u.encrypted_password)
    AND (u.raw_app_meta_data ->> 'role') IN ('super_admin', 'campaign_admin', 'branch_admin')
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION find_admin_by_password(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION find_admin_by_password IS '어드민 로그인 lookup — role/campaign_id/branch_id 반환. Phase B1 Day 1 확장으로 branch_admin 지원 추가';

-- ============================================================
-- RLS 정책
-- ============================================================
-- 원칙:
--   - branches / students / metacog_sessions / metacog_attempts / metacog_answers /
--     metacog_verify_items: 지점 데이터 → super_admin 전체, branch_admin 본인 지점만
--   - metacog_tracks / metacog_questions: 전 지점 공유 마스터 → super_admin 전체 CRUD,
--     anon도 SELECT 필요(응시 화면). answer 컬럼은 별도 RPC로만 접근.
--   - anon INSERT는 응시 제출 RPC(Day 2에 SECURITY DEFINER로 도입)에서만 발생.
--     직접 INSERT는 어드민만 허용.
-- ============================================================

-- branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all branches" ON branches
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "branch admin read own branch" ON branches
  FOR SELECT TO authenticated
  USING (auth_app_role() = 'branch_admin' AND id = auth_app_branch_id());

-- students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all students" ON students
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "branch admin all own students" ON students
  FOR ALL TO authenticated
  USING (auth_app_role() = 'branch_admin' AND branch_id = auth_app_branch_id())
  WITH CHECK (auth_app_role() = 'branch_admin' AND branch_id = auth_app_branch_id());

-- 학생 인증(anon)은 SECURITY DEFINER RPC(Day 2 authenticate_student)로 처리 →
-- anon 직접 SELECT는 열지 않음.

-- metacog_tracks (공유 마스터)
ALTER TABLE metacog_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read tracks" ON metacog_tracks
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "admin read all tracks" ON metacog_tracks
  FOR SELECT TO authenticated
  USING (auth_app_role() IN ('super_admin', 'branch_admin'));

CREATE POLICY "super admin manage tracks" ON metacog_tracks
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

-- metacog_questions (공유 마스터)
-- anon SELECT는 image_url만 필요하지만 answer는 노출 금지 → 컬럼 grant로 분리 처리
ALTER TABLE metacog_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin manage questions" ON metacog_questions
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "admin read questions" ON metacog_questions
  FOR SELECT TO authenticated
  USING (auth_app_role() IN ('super_admin', 'branch_admin'));

-- anon도 문항 로드 필요(응시 화면). 단 answer 컬럼은 컬럼 권한으로 회수
CREATE POLICY "anon read questions" ON metacog_questions
  FOR SELECT TO anon USING (true);

REVOKE SELECT (answer) ON metacog_questions FROM anon;

-- metacog_sessions
ALTER TABLE metacog_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all sessions" ON metacog_sessions
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "branch admin all own sessions" ON metacog_sessions
  FOR ALL TO authenticated
  USING (auth_app_role() = 'branch_admin' AND branch_id = auth_app_branch_id())
  WITH CHECK (auth_app_role() = 'branch_admin' AND branch_id = auth_app_branch_id());

-- 학생(anon)이 진입할 세션 id를 알아야 하므로 open 세션만 조회 허용
CREATE POLICY "anon read open sessions" ON metacog_sessions
  FOR SELECT TO anon USING (status = 'open');

-- metacog_attempts
ALTER TABLE metacog_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all attempts" ON metacog_attempts
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "branch admin all own attempts" ON metacog_attempts
  FOR ALL TO authenticated
  USING (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_sessions s
      WHERE s.id = metacog_attempts.session_id
        AND s.branch_id = auth_app_branch_id()
    )
  )
  WITH CHECK (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_sessions s
      WHERE s.id = metacog_attempts.session_id
        AND s.branch_id = auth_app_branch_id()
    )
  );

-- anon은 SECURITY DEFINER 제출 RPC(Day 2)에서만 INSERT 발생 → 직접 정책 없음

-- metacog_answers
ALTER TABLE metacog_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all answers" ON metacog_answers
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "branch admin all own answers" ON metacog_answers
  FOR ALL TO authenticated
  USING (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_attempts a
      JOIN metacog_sessions s ON s.id = a.session_id
      WHERE a.id = metacog_answers.attempt_id
        AND s.branch_id = auth_app_branch_id()
    )
  )
  WITH CHECK (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_attempts a
      JOIN metacog_sessions s ON s.id = a.session_id
      WHERE a.id = metacog_answers.attempt_id
        AND s.branch_id = auth_app_branch_id()
    )
  );

-- metacog_verify_items
ALTER TABLE metacog_verify_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all verify_items" ON metacog_verify_items
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "branch admin all own verify_items" ON metacog_verify_items
  FOR ALL TO authenticated
  USING (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_attempts a
      JOIN metacog_sessions s ON s.id = a.session_id
      WHERE a.id = metacog_verify_items.attempt_id
        AND s.branch_id = auth_app_branch_id()
    )
  )
  WITH CHECK (
    auth_app_role() = 'branch_admin'
    AND EXISTS (
      SELECT 1 FROM metacog_attempts a
      JOIN metacog_sessions s ON s.id = a.session_id
      WHERE a.id = metacog_verify_items.attempt_id
        AND s.branch_id = auth_app_branch_id()
    )
  );

-- ============================================================
-- 검증
-- ============================================================
SELECT 'branches 초기 데이터' AS check, code, name FROM branches ORDER BY code;

SELECT 'metacog_tracks 초기 데이터' AS check, code, label FROM metacog_tracks ORDER BY sort_order;

SELECT 'RLS 활성화 확인' AS check, c.relname AS table_name, c.relrowsecurity
FROM pg_class c
WHERE c.relkind = 'r'
  AND c.relnamespace = 'public'::regnamespace
  AND c.relname IN (
    'branches', 'students', 'metacog_tracks', 'metacog_questions',
    'metacog_sessions', 'metacog_attempts', 'metacog_answers', 'metacog_verify_items'
  )
ORDER BY c.relname;

SELECT '신규 RPC 확인' AS check, COUNT(*) AS rpc_count
FROM pg_proc
WHERE proname IN ('auth_app_branch_id', 'update_branch_admin_password', 'has_branch_admin');

SELECT '✅ Day 1 스키마 마이그레이션 완료!' AS status;
