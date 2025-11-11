# 트리거 설치 영향도 분석

**작성일**: 2025-11-11

---

## 🚨 심각한 충돌 발견!

### ❌ 문제: 트리거와 RPC 함수가 충돌

**현재 RPC 함수** (`update_create_consulting_reservation_rpc.sql`):
```sql
-- 80-83라인
-- 4. 슬롯 예약 수 증가
UPDATE consulting_slots
SET current_bookings = current_bookings + 1
WHERE id = p_slot_id;
```

**제안한 트리거**:
```sql
-- 예약 생성 시
IF TG_OP = 'INSERT' AND NEW.status NOT IN ('cancelled', 'auto_cancelled') THEN
  UPDATE consulting_slots
  SET current_bookings = current_bookings + 1
  WHERE id = NEW.slot_id;
END IF;
```

**결과**:
- 예약 생성 시 `current_bookings`가 **2번 증가**됨!
  1. RPC 함수에서 +1
  2. 트리거에서 +1
  3. 총 +2 (잘못됨!)

---

## ✅ 안전한 해결 방법

### Option 1: 트리거만 UPDATE/DELETE 처리 (추천 ⭐)

**장점**:
- ✅ 기존 RPC 함수 **전혀 수정 안 함**
- ✅ 기존 예약 생성 로직 그대로 유지
- ✅ 취소 기능만 추가
- ✅ 가장 안전

**트리거 코드**:
```sql
-- 취소 기능만 처리하는 안전한 트리거
CREATE OR REPLACE FUNCTION handle_reservation_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- UPDATE만 처리 (INSERT는 RPC가 처리)
  IF TG_OP = 'UPDATE' THEN
    -- 활성 → 취소
    IF OLD.status NOT IN ('cancelled', 'auto_cancelled')
       AND NEW.status IN ('cancelled', 'auto_cancelled') THEN
      UPDATE consulting_slots
      SET current_bookings = GREATEST(current_bookings - 1, 0)
      WHERE id = OLD.slot_id;
    END IF;

    -- 취소 → 활성 (복구)
    IF OLD.status IN ('cancelled', 'auto_cancelled')
       AND NEW.status NOT IN ('cancelled', 'auto_cancelled') THEN
      UPDATE consulting_slots
      SET current_bookings = current_bookings + 1
      WHERE id = NEW.slot_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consulting_cancellation_trigger
AFTER UPDATE ON consulting_reservations
FOR EACH ROW
EXECUTE FUNCTION handle_reservation_cancellation();
```

**영향 범위**:
- ✅ 예약 생성: 기존과 동일 (RPC만 작동)
- ✅ 예약 취소: 트리거 작동 (새 기능)
- ✅ 취소 복구: 트리거 작동 (새 기능)
- ✅ 다른 기능: 영향 없음

---

### Option 2: RPC 함수 수정 + 완전한 트리거

**장점**:
- ✅ 모든 경우를 트리거가 처리
- ✅ 일관성 있는 구조

**단점**:
- ❌ 기존 RPC 함수 수정 필요
- ❌ 배포 시 RPC + 트리거 동시 적용 필요
- ❌ 위험도 높음

---

## 📊 Option 1 상세 분석

### 작동 시나리오

#### 시나리오 1: 예약 생성
```
사용자: 예약 버튼 클릭
  ↓
RPC 함수 실행: create_consulting_reservation
  ↓
INSERT INTO consulting_reservations (status = 'confirmed')
  ↓
RPC: current_bookings + 1  ✅
  ↓
트리거: INSERT 이벤트이지만 무시 (UPDATE만 처리)
  ↓
결과: current_bookings + 1 (정상)
```

#### 시나리오 2: 예약 취소 (새 기능)
```
Admin: 예약 상태를 'cancelled'로 변경
  ↓
UPDATE consulting_reservations SET status = 'cancelled'
  ↓
트리거 작동: UPDATE 이벤트 감지
  ↓
트리거: current_bookings - 1  ✅
  ↓
결과: current_bookings - 1 (정상)
```

#### 시나리오 3: 취소 복구
```
Admin: 'cancelled' → 'confirmed'로 변경
  ↓
UPDATE consulting_reservations SET status = 'confirmed'
  ↓
트리거 작동: UPDATE 이벤트 감지
  ↓
트리거: current_bookings + 1  ✅
  ↓
결과: current_bookings + 1 (정상)
```

---

## 🔍 잠재적 위험 요소 체크

### 1. 동시성 문제?
**질문**: 여러 사용자가 동시에 예약/취소하면?

**답변**: ✅ 안전
- RPC는 `FOR UPDATE` 잠금 사용 중 (기존)
- 트리거는 각 행에 대해 순차적으로 실행
- PostgreSQL이 트랜잭션으로 보장

---

### 2. 성능 영향?
**질문**: 트리거가 느려질까?

**답변**: ✅ 영향 없음
- 트리거는 매우 간단한 UPDATE 1개
- 기존 RPC도 동일한 작업 수행 중
- 오히려 취소 시에만 작동하므로 오버헤드 미미

---

### 3. 기존 취소 로직과 충돌?
**질문**: 현재 취소 기능이 있나?

**확인 필요**:
```sql
-- 현재 취소가 어떻게 처리되는지 확인
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'consulting_reservations';

-- 기존 트리거 확인
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'consulting_reservations';
```

**예상**: 없음 (그래서 문제 발생)

---

### 4. 롤백 시나리오?
**질문**: 문제 발생 시 되돌릴 수 있나?

**답변**: ✅ 가능
```sql
-- 트리거 제거 (즉시 롤백)
DROP TRIGGER IF EXISTS consulting_cancellation_trigger ON consulting_reservations;
DROP FUNCTION IF EXISTS handle_reservation_cancellation();
```

---

## 📋 단계별 안전 설치 가이드

### 1단계: 백업 확인
```sql
-- 현재 상태 백업 (롤백용)
CREATE TABLE consulting_slots_backup AS
SELECT * FROM consulting_slots;

CREATE TABLE consulting_reservations_backup AS
SELECT * FROM consulting_reservations;
```

### 2단계: 기존 트리거 확인
```sql
-- 기존 트리거가 있는지 확인
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'consulting_reservations';
```

**예상 결과**: (빈 결과) - 기존 트리거 없음

### 3단계: 트리거 설치 (안전 버전)
```sql
-- Option 1의 트리거 실행
-- (UPDATE만 처리, INSERT는 무시)
```

### 4단계: 테스트
```sql
-- 테스트 1: 예약 생성 (기존 기능)
-- RPC 함수로 예약 생성
-- current_bookings가 1 증가하는지 확인

-- 테스트 2: 예약 취소 (새 기능)
UPDATE consulting_reservations
SET status = 'cancelled'
WHERE id = '테스트_예약_ID';

-- current_bookings가 1 감소하는지 확인
SELECT current_bookings FROM consulting_slots WHERE id = '슬롯_ID';

-- 테스트 3: 취소 복구
UPDATE consulting_reservations
SET status = 'confirmed'
WHERE id = '테스트_예약_ID';

-- current_bookings가 1 증가하는지 확인
```

### 5단계: 확인
```sql
-- 모든 슬롯의 정합성 확인
SELECT
  cs.id,
  cs.date,
  cs.time,
  cs.current_bookings as "슬롯값",
  COUNT(cr.id) FILTER (WHERE cr.status NOT IN ('cancelled', 'auto_cancelled')) as "실제값",
  CASE
    WHEN cs.current_bookings = COUNT(cr.id) FILTER (WHERE cr.status NOT IN ('cancelled', 'auto_cancelled'))
    THEN '✅'
    ELSE '❌'
  END as "일치"
FROM consulting_slots cs
LEFT JOIN consulting_reservations cr ON cr.slot_id = cs.id
GROUP BY cs.id
HAVING cs.current_bookings != COUNT(cr.id) FILTER (WHERE cr.status NOT IN ('cancelled', 'auto_cancelled'));
```

**예상 결과**: (빈 결과) - 모두 일치

---

## ✅ 최종 권장사항

### 추천: Option 1 (취소만 처리하는 트리거)

**이유**:
1. ✅ 기존 RPC 함수 **전혀 수정 안 함**
2. ✅ 기존 예약 생성 로직 **영향 없음**
3. ✅ 취소 기능만 **추가**
4. ✅ 문제 발생 시 **즉시 롤백** 가능
5. ✅ 테스트 간단

**예상 소요 시간**: 5분
**위험도**: 매우 낮음
**영향 범위**: 예약 취소 기능만

---

## 🧪 테스트 체크리스트

설치 후 다음을 확인:

- [ ] 기존 예약 생성 정상 작동
- [ ] 예약 취소 시 current_bookings 감소
- [ ] 취소 복구 시 current_bookings 증가
- [ ] Admin 페이지 정상 표시
- [ ] 예약자 화면 정상 표시
- [ ] 다른 캠페인 영향 없음

---

## 📝 결론

**Option 1 (취소만 처리)이 가장 안전합니다.**

- 기존 코드 수정 없음
- 충돌 위험 없음
- 롤백 쉬움
- 테스트 간단

**진행하시겠습니까?**
