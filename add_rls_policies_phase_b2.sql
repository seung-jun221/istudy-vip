-- ============================================================
-- 보안 강화 Phase B2 — RLS 활성화 + JWT 기반 캠페인 스코핑
-- ============================================================
-- 목적:
--   1) RLS가 꺼져 있던 4개 테이블(campaigns, seminar_slots,
--      consulting_slots, consulting_reservations)에 RLS 활성화
--   2) reservations의 broken UPDATE 정책(parent_phone = parent_phone) 제거
--   3) 인증된 어드민은 JWT의 app_metadata.role / campaign_id 클레임으로
--      자동 스코핑:
--      - super_admin: 모든 캠페인 접근
--      - campaign_admin: 본인 campaign_id의 행만 접근
--   4) 익명(학부모) 흐름은 현재 동작을 그대로 유지하기 위해 SELECT/INSERT/UPDATE
--      permissive 정책 유지. 추가 강화는 후속 작업.
--
-- 본 SQL의 핵심 보안 개선:
--   - 캠페인 admin이 본인 campaign_id 외 데이터에 접근 불가 (DB 레벨 차단)
--   - UI 누락 필터(전화번호 검색 등)도 자동 보호됨 (이중 방어)
--
-- 코드 변경 불필요: 익명 흐름은 permissive 정책으로 그대로 동작,
-- 어드민 흐름은 Supabase Auth JWT가 자동 첨부되어 RLS가 자동 스코핑.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: JWT 클레임 접근자 (정책에서 반복 호출되므로 STABLE 함수로)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_app_role() RETURNS TEXT
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')
$$;

CREATE OR REPLACE FUNCTION auth_app_campaign_id() RETURNS TEXT
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'campaign_id')
$$;

GRANT EXECUTE ON FUNCTION auth_app_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth_app_campaign_id() TO anon, authenticated;

-- ============================================================
-- campaigns
-- ============================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read campaigns" ON campaigns;
DROP POLICY IF EXISTS "admin scoped read campaigns" ON campaigns;
DROP POLICY IF EXISTS "super admin all campaigns" ON campaigns;
DROP POLICY IF EXISTS "campaign admin update own" ON campaigns;

CREATE POLICY "anon read campaigns" ON campaigns
  FOR SELECT TO anon USING (true);

CREATE POLICY "admin scoped read campaigns" ON campaigns
  FOR SELECT TO authenticated
  USING (auth_app_role() = 'super_admin' OR id = auth_app_campaign_id());

CREATE POLICY "super admin all campaigns" ON campaigns
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin')
  WITH CHECK (auth_app_role() = 'super_admin');

CREATE POLICY "campaign admin update own" ON campaigns
  FOR UPDATE TO authenticated
  USING (auth_app_role() = 'campaign_admin' AND id = auth_app_campaign_id())
  WITH CHECK (auth_app_role() = 'campaign_admin' AND id = auth_app_campaign_id());

-- ============================================================
-- seminar_slots
-- ============================================================
ALTER TABLE seminar_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow update on seminar_slots" ON seminar_slots;
DROP POLICY IF EXISTS "Allow delete on seminar_slots" ON seminar_slots;
DROP POLICY IF EXISTS "anon read seminar_slots" ON seminar_slots;
DROP POLICY IF EXISTS "admin scoped read seminar_slots" ON seminar_slots;
DROP POLICY IF EXISTS "admin write seminar_slots" ON seminar_slots;

CREATE POLICY "anon read seminar_slots" ON seminar_slots
  FOR SELECT TO anon USING (true);

CREATE POLICY "admin scoped read seminar_slots" ON seminar_slots
  FOR SELECT TO authenticated
  USING (auth_app_role() = 'super_admin' OR campaign_id = auth_app_campaign_id());

CREATE POLICY "admin write seminar_slots" ON seminar_slots
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin' OR campaign_id = auth_app_campaign_id())
  WITH CHECK (auth_app_role() = 'super_admin' OR campaign_id = auth_app_campaign_id());

-- ============================================================
-- consulting_slots
-- ------------------------------------------------------------
-- anon UPDATE: 자동 슬롯 오픈(checkAndOpenNextSlots)과
-- consulting reservation 생성 시 current_bookings 증감을 위해 임시 유지.
-- 후속 작업에서 SECURITY DEFINER RPC로 이전 예정.
-- ============================================================
ALTER TABLE consulting_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow update on consulting_slots" ON consulting_slots;
DROP POLICY IF EXISTS "Allow insert on consulting_slots" ON consulting_slots;
DROP POLICY IF EXISTS "Allow delete on consulting_slots" ON consulting_slots;
DROP POLICY IF EXISTS "anon read consulting_slots" ON consulting_slots;
DROP POLICY IF EXISTS "anon update consulting_slots" ON consulting_slots;
DROP POLICY IF EXISTS "admin scoped read consulting_slots" ON consulting_slots;
DROP POLICY IF EXISTS "admin write consulting_slots" ON consulting_slots;

CREATE POLICY "anon read consulting_slots" ON consulting_slots
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon update consulting_slots" ON consulting_slots
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "admin scoped read consulting_slots" ON consulting_slots
  FOR SELECT TO authenticated
  USING (auth_app_role() = 'super_admin' OR linked_seminar_id = auth_app_campaign_id());

CREATE POLICY "admin write consulting_slots" ON consulting_slots
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin' OR linked_seminar_id = auth_app_campaign_id())
  WITH CHECK (auth_app_role() = 'super_admin' OR linked_seminar_id = auth_app_campaign_id());

-- ============================================================
-- consulting_reservations
-- ------------------------------------------------------------
-- anon INSERT은 create_consulting_reservation RPC(SECURITY DEFINER) 경유라
-- RLS 우회됨. anon UPDATE는 학부모 자가 취소 흐름 유지를 위해 permissive.
-- ============================================================
ALTER TABLE consulting_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow update on consulting_reservations" ON consulting_reservations;
DROP POLICY IF EXISTS "anon read consulting_reservations" ON consulting_reservations;
DROP POLICY IF EXISTS "anon insert consulting_reservations" ON consulting_reservations;
DROP POLICY IF EXISTS "anon update consulting_reservations" ON consulting_reservations;
DROP POLICY IF EXISTS "admin scoped read consulting_reservations" ON consulting_reservations;
DROP POLICY IF EXISTS "admin write consulting_reservations" ON consulting_reservations;

CREATE POLICY "anon read consulting_reservations" ON consulting_reservations
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon insert consulting_reservations" ON consulting_reservations
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon update consulting_reservations" ON consulting_reservations
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "admin scoped read consulting_reservations" ON consulting_reservations
  FOR SELECT TO authenticated
  USING (auth_app_role() = 'super_admin' OR linked_seminar_id = auth_app_campaign_id());

CREATE POLICY "admin write consulting_reservations" ON consulting_reservations
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin' OR linked_seminar_id = auth_app_campaign_id())
  WITH CHECK (auth_app_role() = 'super_admin' OR linked_seminar_id = auth_app_campaign_id());

-- ============================================================
-- reservations (이미 RLS on — broken 'parent_phone = parent_phone' 정책 제거)
-- ------------------------------------------------------------
-- anon UPDATE는 학부모 자가 취소(이미 RPC) + replaceReservation +
-- 비번 reset 흐름 유지를 위해 permissive로 둠. 후속 작업에서 모두 RPC로 이전.
-- ============================================================
DROP POLICY IF EXISTS "Allow update own" ON reservations;
DROP POLICY IF EXISTS "Allow public read" ON reservations;
DROP POLICY IF EXISTS "Allow public insert" ON reservations;
DROP POLICY IF EXISTS "anon read reservations" ON reservations;
DROP POLICY IF EXISTS "anon insert reservations" ON reservations;
DROP POLICY IF EXISTS "anon update reservations" ON reservations;
DROP POLICY IF EXISTS "admin scoped read reservations" ON reservations;
DROP POLICY IF EXISTS "admin write reservations" ON reservations;

CREATE POLICY "anon read reservations" ON reservations
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon insert reservations" ON reservations
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon update reservations" ON reservations
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "admin scoped read reservations" ON reservations
  FOR SELECT TO authenticated
  USING (auth_app_role() = 'super_admin' OR campaign_id = auth_app_campaign_id());

CREATE POLICY "admin write reservations" ON reservations
  FOR ALL TO authenticated
  USING (auth_app_role() = 'super_admin' OR campaign_id = auth_app_campaign_id())
  WITH CHECK (auth_app_role() = 'super_admin' OR campaign_id = auth_app_campaign_id());

-- ============================================================
-- 검증
-- ============================================================
SELECT 'RLS 활성화 확인' AS check,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled
FROM pg_class c
WHERE c.relkind = 'r'
  AND c.relnamespace = 'public'::regnamespace
  AND c.relname IN ('campaigns', 'seminar_slots', 'consulting_slots', 'consulting_reservations', 'reservations')
ORDER BY c.relname;

SELECT '정책 개수 확인' AS check,
       tablename,
       COUNT(*) AS policy_count
FROM pg_policies
WHERE tablename IN ('campaigns', 'seminar_slots', 'consulting_slots', 'consulting_reservations', 'reservations')
GROUP BY tablename
ORDER BY tablename;

SELECT '✅ Phase B2 RLS 마이그레이션 완료!' AS status;

-- ============================================================
-- 롤백 (문제 발생 시)
-- ============================================================
-- 아래 5줄 실행하면 RLS만 다시 꺼지고 정책은 비활성 상태로 남음 (즉시 복구):
-- ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE seminar_slots DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE consulting_slots DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE consulting_reservations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
