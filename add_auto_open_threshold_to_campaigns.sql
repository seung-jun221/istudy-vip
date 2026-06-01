-- ========================================
-- 자동 슬롯 오픈 임계값 DB 이전 마이그레이션
-- 목적: 컨설팅 슬롯 자동 오픈 임계값을 localStorage → campaigns 테이블로 이전
-- 배경: 임계값을 어드민 브라우저 localStorage에만 저장하던 구조라
--       학부모(예약자) 브라우저에서는 임계값을 읽지 못해 자동 오픈이
--       사실상 발동하지 않음.
-- ========================================

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS auto_open_threshold INTEGER DEFAULT 0;

COMMENT ON COLUMN campaigns.auto_open_threshold IS '컨설팅 슬롯 자동 오픈 임계값 - 잔여 예약 가능 슬롯 수가 이 값 이하가 되면 다음 날짜의 비공개 컨설팅 슬롯이 자동으로 오픈됨. 0이면 비활성화.';

-- ========================================
-- 일회성 마이그레이션 안내
-- ========================================
-- 기존에 어드민 브라우저 localStorage에 저장돼 있던 임계값은
-- 어드민이 캠페인 설정 화면에서 다시 한 번 저장하면 DB로 옮겨집니다.
-- (localStorage 값을 자동으로 DB로 옮기는 절차는 없음)

-- ========================================
-- 검증
-- ========================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'campaigns' AND column_name = 'auto_open_threshold';

SELECT '✅ campaigns.auto_open_threshold 컬럼 추가 완료!' as status;
