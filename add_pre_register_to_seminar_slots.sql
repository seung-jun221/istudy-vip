-- ========================================
-- 사전 알림 신청 슬롯 기능 마이그레이션
-- 목적: 일정/장소가 미정인 상태에서 "사전 알림 신청"만 먼저 받는 슬롯 지원
-- ========================================

-- is_pre_register: true면 일정/장소 미정 상태의 사전 알림 신청 슬롯
ALTER TABLE seminar_slots
ADD COLUMN IF NOT EXISTS is_pre_register BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN seminar_slots.is_pre_register IS '사전 알림 신청 슬롯 여부 - true면 일정/장소 미정 상태로 사전 신청만 받음. 일정 확정 시 false로 변경하고 date/time/location을 입력';

-- ========================================
-- 사용법
-- ========================================
-- 사전 알림 신청 슬롯은 어드민 "새 설명회 슬롯 추가" 폼에서
-- 슬롯 유형을 "사전 알림 신청"으로 선택하여 생성합니다.
-- - date/time/location은 placeholder 값으로 저장됩니다 (date='2099-12-31' 등).
-- - 신청자는 reservations.status = '사전알림' 으로 저장됩니다.
--
-- 일정이 확정되면:
-- 1. 어드민 슬롯 수정 화면에서 실제 date/time/location 입력
-- 2. is_pre_register 를 false 로 변경
--    UPDATE seminar_slots SET is_pre_register = FALSE,
--      date = '2026-07-15', time = '14:00', location = '분당점 3층'
--    WHERE id = '슬롯_ID';
-- 3. 사전 신청자 명단(status='사전알림')을 CSV로 받아 개별 안내 후 정식 재예약 진행

-- ========================================
-- 검증
-- ========================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'seminar_slots' AND column_name = 'is_pre_register';

SELECT '✅ 사전 알림 신청 슬롯 컬럼 추가 완료!' as status;
