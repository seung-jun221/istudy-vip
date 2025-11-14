-- ========================================
-- 진단검사 시스템 데이터베이스 스키마
-- 목적: 학생 진단검사 자동채점 및 결과 관리
-- ========================================

-- ========================================
-- STEP 1: diagnostic_tests 테이블 생성
-- ========================================
-- 진단검사 정의 테이블 (MONO, DI, TRI 시험 정보)
CREATE TABLE IF NOT EXISTS diagnostic_tests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_type TEXT NOT NULL CHECK (test_type IN ('MONO', 'DI', 'TRI')),
  test_name TEXT NOT NULL,                    -- 예: "중1-1 진단검사", "중2-1 진단검사", "중3-1 + 공통수학1 진단검사"
  description TEXT,                            -- 시험 설명
  total_questions INTEGER DEFAULT 25,          -- 총 문항 수
  total_score NUMERIC DEFAULT 100.0,           -- 총 배점
  is_active BOOLEAN DEFAULT true,              -- 활성화 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 진단검사 데이터 삽입
INSERT INTO diagnostic_tests (id, test_type, test_name, description, total_questions, total_score)
VALUES
  ('test_mono', 'MONO', '중1-1 진단검사', '중학교 1학년 1학기 진단검사 (수와 연산, 식의 계산, 방정식, 함수)', 25, 100.0),
  ('test_di', 'DI', '중2-1 진단검사', '중학교 2학년 1학기 진단검사 (실수와 연산, 식의 계산, 일차부등식, 연립방정식)', 25, 100.0),
  ('test_tri', 'TRI', '중3-1 + 공통수학1 진단검사', '중학교 3학년 1학기 + 공통수학1 진단검사 (다항식, 이차방정식, 이차함수)', 25, 100.0)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 2: diagnostic_submissions 테이블 생성
-- ========================================
-- 학생의 답안 제출 정보
CREATE TABLE IF NOT EXISTS diagnostic_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT UNIQUE NOT NULL,          -- 제출 ID (예: S{timestamp})

  -- 학생 정보 (reservations 테이블 참조)
  reservation_id TEXT,                         -- reservations.reservation_id 참조 (nullable)
  student_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  school TEXT,
  grade TEXT NOT NULL,
  math_level TEXT,

  -- 시험 정보
  test_id TEXT NOT NULL REFERENCES diagnostic_tests(id),
  test_type TEXT NOT NULL CHECK (test_type IN ('MONO', 'DI', 'TRI')),

  -- 답안 정보 (JSON 배열: ["1", "2", "3", ...])
  answers JSONB NOT NULL,

  -- 제출 방식
  submission_type TEXT NOT NULL CHECK (submission_type IN ('auto', 'manual')),
  -- 'auto': 학생이 직접 입력하여 자동 제출
  -- 'manual': 선생님이 수동으로 채점하여 입력

  -- 제출 시간
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_diagnostic_submissions_reservation_id ON diagnostic_submissions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_submissions_parent_phone ON diagnostic_submissions(parent_phone);
CREATE INDEX IF NOT EXISTS idx_diagnostic_submissions_test_type ON diagnostic_submissions(test_type);
CREATE INDEX IF NOT EXISTS idx_diagnostic_submissions_submitted_at ON diagnostic_submissions(submitted_at);

-- ========================================
-- STEP 3: diagnostic_results 테이블 생성
-- ========================================
-- 채점 결과 정보
CREATE TABLE IF NOT EXISTS diagnostic_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT UNIQUE NOT NULL REFERENCES diagnostic_submissions(id) ON DELETE CASCADE,

  -- 전체 성적
  total_score NUMERIC NOT NULL,                -- 획득 점수
  max_score NUMERIC NOT NULL DEFAULT 100.0,    -- 만점
  percentile NUMERIC NOT NULL,                 -- 백분위
  grade9 INTEGER NOT NULL,                     -- 9등급
  grade5 INTEGER NOT NULL,                     -- 5등급 (2028 대입제도 개편안)

  -- 영역별 결과 (JSON 배열)
  area_results JSONB NOT NULL,
  -- 예시: [
  --   {
  --     "areaName": "수와 연산",
  --     "totalScore": 31.5,
  --     "earnedScore": 25.5,
  --     "correctCount": 6,
  --     "totalCount": 7,
  --     "correctRate": 85.71,
  --     "tscore": 58.5,
  --     "percentile": 75.2
  --   },
  --   ...
  -- ]

  -- 난이도별 결과 (JSON 배열)
  difficulty_results JSONB NOT NULL,
  -- 예시: [
  --   {
  --     "difficulty": "LOW",
  --     "totalScore": 15.0,
  --     "earnedScore": 12.0,
  --     "correctCount": 4,
  --     "totalCount": 5,
  --     "correctRate": 80.0
  --   },
  --   ...
  -- ]

  -- 문항별 정답 여부 (JSON 배열)
  question_results JSONB NOT NULL,
  -- 예시: [
  --   {
  --     "questionNumber": 1,
  --     "isCorrect": true,
  --     "studentAnswer": "1",
  --     "correctAnswer": "1",
  --     "score": 3.0,
  --     "area": "수와 연산",
  --     "difficulty": "LOW"
  --   },
  --   ...
  -- ]

  -- 채점 시간
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_diagnostic_results_submission_id ON diagnostic_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_results_percentile ON diagnostic_results(percentile);
CREATE INDEX IF NOT EXISTS idx_diagnostic_results_grade5 ON diagnostic_results(grade5);

-- ========================================
-- STEP 4: diagnostic_reports 테이블 생성
-- ========================================
-- 생성된 결과 보고서 정보
CREATE TABLE IF NOT EXISTS diagnostic_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  result_id TEXT UNIQUE NOT NULL REFERENCES diagnostic_results(id) ON DELETE CASCADE,

  -- HTML 컨텐츠 (동적으로 생성된 7페이지 HTML)
  html_content TEXT,

  -- PDF 파일 URL (Supabase Storage 경로)
  pdf_url TEXT,
  pdf_file_name TEXT,

  -- 동적 코멘트 (JSON)
  dynamic_comments JSONB,
  -- 예시: {
  --   "area_comments": {
  --     "수와 연산": { "level": "Excellent", "comment": "...", "wrongPatterns": "..." },
  --     ...
  --   },
  --   "learning_strategy": {
  --     "선행VS심화": "...",
  --     "수능VS내신": "...",
  --     ...
  --   },
  --   "roadmap": {
  --     "step1": "...",
  --     "step2": "...",
  --     "step3": "..."
  --   }
  -- }

  -- 생성 시간
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_result_id ON diagnostic_reports(result_id);

-- ========================================
-- STEP 5: RLS (Row Level Security) 정책 설정
-- ========================================

-- diagnostic_tests: 모든 사용자 읽기 가능
ALTER TABLE diagnostic_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active tests" ON diagnostic_tests
  FOR SELECT USING (is_active = true);

-- diagnostic_submissions: 본인 전화번호로만 조회 가능
ALTER TABLE diagnostic_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own submissions" ON diagnostic_submissions
  FOR SELECT USING (auth.uid() IS NOT NULL OR parent_phone = current_setting('app.current_phone', true));

CREATE POLICY "Users can insert their own submissions" ON diagnostic_submissions
  FOR INSERT WITH CHECK (true);

-- diagnostic_results: 본인 제출 결과만 조회 가능
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own results" ON diagnostic_results
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM diagnostic_submissions
      WHERE parent_phone = current_setting('app.current_phone', true)
    )
  );

CREATE POLICY "System can insert results" ON diagnostic_results
  FOR INSERT WITH CHECK (true);

-- diagnostic_reports: 본인 보고서만 조회 가능
ALTER TABLE diagnostic_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reports" ON diagnostic_reports
  FOR SELECT USING (
    result_id IN (
      SELECT dr.id FROM diagnostic_results dr
      JOIN diagnostic_submissions ds ON ds.id = dr.submission_id
      WHERE ds.parent_phone = current_setting('app.current_phone', true)
    )
  );

CREATE POLICY "System can insert reports" ON diagnostic_reports
  FOR INSERT WITH CHECK (true);

-- ========================================
-- STEP 6: 데이터 검증
-- ========================================

SELECT '✅ diagnostic_tests created' as check_name, COUNT(*) as count FROM diagnostic_tests;
SELECT '✅ diagnostic_submissions table ready' as check_name;
SELECT '✅ diagnostic_results table ready' as check_name;
SELECT '✅ diagnostic_reports table ready' as check_name;

-- ========================================
-- STEP 7: 완료 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 진단검사 시스템 스키마 생성 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '1. diagnostic_tests - 진단검사 정의';
  RAISE NOTICE '2. diagnostic_submissions - 답안 제출';
  RAISE NOTICE '3. diagnostic_results - 채점 결과';
  RAISE NOTICE '4. diagnostic_reports - 결과 보고서';
  RAISE NOTICE '========================================';
END $$;
