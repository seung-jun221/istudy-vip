-- ============================================================
-- 보안 강화 Phase B1 — 어드민 인증을 Supabase Auth로 이전
-- ============================================================
-- 목적:
--   localStorage 플래그 기반 어드민 인증을 Supabase Auth JWT로 이전.
--   캠페인 admin이 본인 campaign_id만 접근 가능하도록 JWT 클레임을 사용
--   (RLS 정책은 B2 마이그레이션에서 별도로 활성화).
--   비번만 입력하는 기존 UX는 그대로 유지 — find_admin_by_password RPC가
--   비번 → 매칭 어드민의 이메일을 lookup, 클라이언트가 그 이메일로
--   supabase.auth.signInWithPassword 호출.
--
-- 본 마이그레이션이 만드는 것:
--   1) Helper: _admin_auth_upsert_user — auth.users + auth.identities upsert
--   2) setup_admin_auth(super_password) — 1회용 초기 셋업 (super + 캠페인별 admin)
--   3) find_admin_by_password(password) — 로그인용 lookup
--   4) update_campaign_admin_password(campaign_id, new_password) — super admin 전용
--
-- 실행 순서:
--   A. 본 SQL 파일 전체를 Supabase SQL Editor에 붙여넣고 실행
--      (이 단계에서는 함수만 생성됨, 어드민 계정은 아직 안 만들어짐)
--   B. 마지막에 안내된 한 줄 — SELECT setup_admin_auth('새로운_슈퍼관리자_비번')
--      에서 본인이 정한 super admin 비번을 넣고 실행.
--   C. 코드 배포 (이번 PR)
--
-- 안전장치:
--   - 함수들은 SECURITY DEFINER로 auth schema 접근. PUBLIC 권한은 REVOKE.
--   - setup_admin_auth는 anon/authenticated에게 EXECUTE 권한 없음 (SQL Editor만).
--   - update_campaign_admin_password는 호출자의 JWT 클레임에서 role='super_admin'
--     확인 후에만 동작.
--   - 본 마이그레이션은 campaign_credentials를 손대지 않음. 백업 데이터로 유지.
--     (B4 정리 단계에서 폐기 예정)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Helper: auth.users + auth.identities에 admin 계정 upsert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION _admin_auth_upsert_user(
  p_email TEXT,
  p_password TEXT,
  p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT;
BEGIN
  v_password_hash := crypt(p_password, gen_salt('bf'));

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      is_super_admin, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      p_email, v_password_hash, NOW(),
      p_metadata, '{}'::jsonb,
      NOW(), NOW(),
      false, false, false
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data,
      provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      p_email, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
      'email', NOW(), NOW(), NOW()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_password_hash,
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || p_metadata,
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION _admin_auth_upsert_user(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _admin_auth_upsert_user(TEXT, TEXT, JSONB) FROM anon, authenticated;

-- ------------------------------------------------------------
-- 초기 셋업 — 1회용. SQL Editor에서 super_password 인자와 함께 호출.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION setup_admin_auth(p_super_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_campaign RECORD;
  v_count INTEGER := 0;
BEGIN
  IF p_super_password IS NULL OR length(p_super_password) < 4 THEN
    RAISE EXCEPTION 'super admin 비번은 4자 이상이어야 합니다.';
  END IF;

  -- 1. Super admin (super@istudy.local)
  PERFORM _admin_auth_upsert_user(
    'super@istudy.local',
    p_super_password,
    jsonb_build_object('role', 'super_admin')
  );

  -- 2. 각 캠페인별 admin (기존 campaign_credentials에서 비번 가져옴)
  FOR v_campaign IN
    SELECT cc.campaign_id, cc.access_password
    FROM campaign_credentials cc
    JOIN campaigns c ON c.id = cc.campaign_id
    WHERE cc.access_password IS NOT NULL AND cc.access_password != ''
  LOOP
    PERFORM _admin_auth_upsert_user(
      'campaign-' || v_campaign.campaign_id || '@istudy.local',
      v_campaign.access_password,
      jsonb_build_object(
        'role', 'campaign_admin',
        'campaign_id', v_campaign.campaign_id
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN format('✅ 셋업 완료. super admin 1개, campaign admin %s개 생성/갱신.', v_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION setup_admin_auth(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION setup_admin_auth(TEXT) FROM anon, authenticated;

-- ------------------------------------------------------------
-- 로그인용: 비번 → 매칭 어드민의 이메일/role/campaign_id
-- 비번은 bcrypt 해시로 auth.users.encrypted_password와 비교 (crypt 함수)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS find_admin_by_password(TEXT);

CREATE OR REPLACE FUNCTION find_admin_by_password(p_password TEXT)
RETURNS TABLE (email TEXT, admin_role TEXT, admin_campaign_id TEXT)
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
    (u.raw_app_meta_data ->> 'campaign_id')::TEXT
  FROM auth.users u
  WHERE u.encrypted_password = crypt(p_password, u.encrypted_password)
    AND (u.raw_app_meta_data ->> 'role') IN ('super_admin', 'campaign_admin')
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION find_admin_by_password(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION find_admin_by_password IS '어드민 로그인용 — 입력 비번과 매칭되는 auth.users 행의 email/role/campaign_id 반환. 클라이언트는 받은 email + 입력 비번으로 supabase.auth.signInWithPassword 호출.';

-- ------------------------------------------------------------
-- 캠페인 admin 비번 설정/변경 — super admin만
-- 호출자의 JWT 클레임에서 role='super_admin' 확인 후 동작
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS update_campaign_admin_password(TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_campaign_admin_password(
  p_campaign_id TEXT,
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

  PERFORM _admin_auth_upsert_user(
    'campaign-' || p_campaign_id || '@istudy.local',
    p_new_password,
    jsonb_build_object('role', 'campaign_admin', 'campaign_id', p_campaign_id)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION update_campaign_admin_password(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION update_campaign_admin_password IS '캠페인 admin 비번 설정/변경 — super admin 권한 필요. auth.users.encrypted_password를 새 bcrypt 해시로 업데이트.';

-- ------------------------------------------------------------
-- has_campaign_password 재정의: Phase D는 campaign_credentials를 봤지만
-- B1부터는 auth.users가 진실원이므로 거기서 확인.
-- (기존 SettingsTab 코드는 이 RPC명을 그대로 호출하므로 시그니처는 유지)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_campaign_password(p_campaign_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT;
  v_exists BOOLEAN;
BEGIN
  v_email := 'campaign-' || p_campaign_id || '@istudy.local';
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE email = v_email
      AND encrypted_password IS NOT NULL
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION has_campaign_password(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 검증
-- ------------------------------------------------------------
SELECT
  '함수 4개 존재' as check_1,
  COUNT(*) as fn_count
FROM pg_proc
WHERE proname IN (
  '_admin_auth_upsert_user',
  'setup_admin_auth',
  'find_admin_by_password',
  'update_campaign_admin_password'
);

-- ============================================================
-- ⚠️ 위 SQL 전체 실행 완료 후, 아래 줄의 'CHANGE_THIS' 부분을
-- 실제 새 super admin 비번으로 바꾸고 그 한 줄만 실행하세요.
-- 실행 후에는 보안을 위해 SQL Editor에서 해당 라인을 지우세요.
-- ============================================================

-- SELECT setup_admin_auth('CHANGE_THIS');
