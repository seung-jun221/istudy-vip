-- ============================================
-- 현장 참석 등록: 최유건 (9차 설명회)
-- 예약없이 설명회에 온 학부모를 '참석' 상태로 등록
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1단계: 9차 설명회 슬롯 확인 (먼저 실행하여 확인)
-- SELECT ss.id, ss.session_number, ss.title, ss.date, ss.time, ss.campaign_id, c.title as campaign_title
-- FROM seminar_slots ss
-- JOIN campaigns c ON c.id = ss.campaign_id
-- WHERE ss.session_number = 9
-- ORDER BY ss.created_at DESC;

-- 2단계: 예약 등록 (참석 상태로 바로 등록)
INSERT INTO reservations (
  reservation_id,
  seminar_slot_id,
  campaign_id,
  student_name,
  parent_phone,
  school,
  grade,
  math_level,
  password,
  privacy_consent,
  status
)
SELECT
  'R' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT,
  ss.id,
  ss.campaign_id,
  '최유건',
  '010-2324-0410',
  '여고초',
  '초5',
  '5-2 진행중',
  '6381d0f3',
  'Y',
  '참석'
FROM seminar_slots ss
WHERE ss.session_number = 9
  AND ss.status = 'active'
ORDER BY ss.created_at DESC
LIMIT 1
RETURNING id, reservation_id, student_name, parent_phone, status, seminar_slot_id, campaign_id;
