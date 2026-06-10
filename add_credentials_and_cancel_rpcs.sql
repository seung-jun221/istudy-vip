-- ============================================================
-- 보안 강화 Phase D
-- 목적: campaigns.access_password 노출 차단 + 예약 취소 RPC 분리
-- ============================================================
-- 배경:
--   1) campaigns 테이블은 RLS 미적용 + access_password 평문 컬럼이라
--      anon 키만 알면 누구나 모든 캠페인의 어드민 비번을 SELECT 가능.
--   2) reservations UPDATE 정책의 qual이 'parent_phone = parent_phone'로
--      항상 참이어서 사실상 무제한 update 허용. 자가 취소 흐름이
--      클라이언트 직접 update 기반.
--
-- 본 마이그레이션:
--   - campaign_credentials 별도 테이블 생성 후 비번 데이터 이전, 원본
--     컬럼은 DROP. 신규 테이블은 RLS on + SELECT 정책 없음 → REST로
--     직접 조회 불가. 검증/설정은 SECURITY DEFINER RPC 경유.
--   - 학부모 자가 취소를 위한 cancel_reservation RPC 추가. 기존 broken
--     UPDATE 정책은 어드민이 anon 키로 update 중이라 제거 불가 → Phase B
--     에서 어드민을 Supabase Auth로 옮길 때 함께 정리.
-- ============================================================

-- ------------------------------------------------------------
-- 1. campaign_credentials 테이블 생성
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_credentials (
  campaign_id TEXT PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  access_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE campaign_credentials IS '캠페인 어드민 접근 비밀번호 — REST 직접 조회 차단. 검증은 verify_campaign_password RPC 사용';

-- ------------------------------------------------------------
-- 2. 기존 campaigns.access_password → campaign_credentials 이전
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'access_password'
  ) THEN
    INSERT INTO campaign_credentials (campaign_id, access_password)
    SELECT id, access_password
    FROM campaigns
    WHERE access_password IS NOT NULL AND access_password != ''
    ON CONFLICT (campaign_id) DO UPDATE
      SET access_password = EXCLUDED.access_password;

    RAISE NOTICE '✅ campaigns.access_password 이전 완료';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. campaigns.access_password 컬럼 제거 (이전 완료 후)
-- ------------------------------------------------------------
ALTER TABLE campaigns DROP COLUMN IF EXISTS access_password;

-- ------------------------------------------------------------
-- 4. campaign_credentials RLS — SELECT 차단, 쓰기는 현 자세 유지
-- ------------------------------------------------------------
ALTER TABLE campaign_credentials ENABLE ROW LEVEL SECURITY;

-- SELECT 정책 없음 = REST anon 직접 조회 불가
-- (SECURITY DEFINER RPC를 통해서만 접근 가능)

-- INSERT/UPDATE/DELETE는 현재 campaigns 테이블 쓰기 자세와 동일하게 유지
-- (Phase B에서 어드민 인증 도입 시 함께 잠금)
DROP POLICY IF EXISTS "anon can insert credentials" ON campaign_credentials;
DROP POLICY IF EXISTS "anon can update credentials" ON campaign_credentials;
DROP POLICY IF EXISTS "anon can delete credentials" ON campaign_credentials;

CREATE POLICY "anon can insert credentials" ON campaign_credentials
  FOR INSERT WITH CHECK (true);
CREATE POLICY "anon can update credentials" ON campaign_credentials
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon can delete credentials" ON campaign_credentials
  FOR DELETE USING (true);

-- ------------------------------------------------------------
-- 5. RPC: 캠페인 비밀번호 검증 (어드민 로그인)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS verify_campaign_password(TEXT);

CREATE OR REPLACE FUNCTION verify_campaign_password(p_password TEXT)
RETURNS TABLE (id TEXT, title TEXT, location TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_password IS NULL OR p_password = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.title, c.location
  FROM campaigns c
  INNER JOIN campaign_credentials cc ON cc.campaign_id = c.id
  WHERE cc.access_password = p_password
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION verify_campaign_password IS '어드민 로그인용 — 입력 비밀번호와 매칭되는 캠페인 정보 반환. 매칭 없으면 빈 결과.';

-- ------------------------------------------------------------
-- 6. RPC: 캠페인 비밀번호 설정/변경/삭제 (어드민)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS upsert_campaign_password(TEXT, TEXT);

CREATE OR REPLACE FUNCTION upsert_campaign_password(p_campaign_id TEXT, p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_password IS NULL OR p_password = '' THEN
    DELETE FROM campaign_credentials WHERE campaign_id = p_campaign_id;
  ELSE
    INSERT INTO campaign_credentials (campaign_id, access_password)
    VALUES (p_campaign_id, p_password)
    ON CONFLICT (campaign_id)
    DO UPDATE SET
      access_password = EXCLUDED.access_password,
      updated_at = NOW();
  END IF;
END;
$$;

COMMENT ON FUNCTION upsert_campaign_password IS '어드민 캠페인 설정 — 비번 설정/변경/삭제. 빈 문자열 또는 NULL이면 삭제.';

-- ------------------------------------------------------------
-- 7. RPC: 캠페인 비밀번호 설정 여부 조회 (UI 표시용)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS has_campaign_password(TEXT);

CREATE OR REPLACE FUNCTION has_campaign_password(p_campaign_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_flag BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM campaign_credentials
    WHERE campaign_id = p_campaign_id
      AND access_password IS NOT NULL
      AND access_password != ''
  ) INTO exists_flag;
  RETURN exists_flag;
END;
$$;

COMMENT ON FUNCTION has_campaign_password IS 'UI 표시용 — 비밀번호 설정 여부만 boolean으로 반환. 비번 값 자체는 반환하지 않음.';

-- ------------------------------------------------------------
-- 8. RPC: 학부모 자가 예약 취소
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS cancel_reservation(UUID, TEXT);
DROP FUNCTION IF EXISTS cancel_reservation(BIGINT, TEXT);

CREATE OR REPLACE FUNCTION cancel_reservation(p_reservation_id BIGINT, p_password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_password TEXT;
BEGIN
  IF p_password_hash IS NULL OR p_password_hash = '' THEN
    RETURN FALSE;
  END IF;

  SELECT password INTO stored_password
  FROM reservations
  WHERE id = p_reservation_id;

  IF stored_password IS NULL OR stored_password != p_password_hash THEN
    RETURN FALSE;
  END IF;

  UPDATE reservations
  SET status = '취소'
  WHERE id = p_reservation_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION cancel_reservation IS '학부모 자가 예약 취소 — 클라이언트에서 해시한 비밀번호와 DB 저장값을 DB 내부에서 비교 후 상태를 취소로 변경. RLS UPDATE 정책 우회 (SECURITY DEFINER).';

-- ------------------------------------------------------------
-- 9. anon에 EXECUTE 권한 부여
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION verify_campaign_password(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_campaign_password(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION has_campaign_password(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_reservation(BIGINT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT
  'campaigns에 access_password 컬럼 없음' as check_1,
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'access_password'
  ) as ok;

SELECT
  'campaign_credentials 테이블 RLS on, SELECT 정책 없음' as check_2,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'campaign_credentials') as rls_on,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'campaign_credentials' AND cmd = 'SELECT') as select_policy_count;

SELECT
  '신규 RPC 4개 존재' as check_3,
  COUNT(*) as rpc_count
FROM pg_proc
WHERE proname IN ('verify_campaign_password', 'upsert_campaign_password', 'has_campaign_password', 'cancel_reservation');

SELECT '✅ Phase D 보안 강화 마이그레이션 완료!' as status;
