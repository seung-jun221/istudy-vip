# 예약 데이터 불일치 근본 원인 분석 및 해결 방안

**발생일**: 2025-11-11
**작성일**: 2025-11-11

---

## 🔍 발견된 문제 2가지

### 문제 1: `linked_seminar_id = NULL`
**박민지 예약에 캠페인 ID가 연결되지 않음**

```sql
-- 박민지 예약
linked_seminar_id: NULL  ❌
slot_id: daef8a35-67ee-4aef-b1dd-76345d67dea7  ✅
```

**결과**:
- Admin 쿼리: `WHERE linked_seminar_id = '캠페인_ID'` → 박민지 제외
- 슬롯 `current_bookings = 1`이지만 Admin에서 안 보임

---

### 문제 2: 취소 시 `current_bookings` 감소 안 됨
**18:00 슬롯: 2개 예약 모두 취소됐지만 current_bookings 그대로**

```sql
-- 18:00 슬롯
이규현: cancelled
이상민: cancelled
current_bookings: 1 또는 2  ❌ (0이어야 함)
```

---

## 🎯 근본 원인 분석

### 원인 1: `linked_seminar_id = NULL` 발생 원인

#### 가능성 A: 미예약자 예약 (가장 가능성 높음)
```javascript
// ConsultingContext.jsx:385
p_linked_seminar_id: reservationData.linkedSeminarId || null
```

**시나리오**:
1. 사용자가 설명회 **미참석자**로 컨설팅 예약
2. `linkedSeminarId`가 없어서 `NULL` 전달
3. 예약은 생성되지만 `linked_seminar_id = NULL`

**증거**:
- 박민지 예약일: 2025-11-11 03:45
- 이 시간에 설명회를 거치지 않고 직접 예약했을 가능성

---

#### 가능성 B: RPC 함수 파라미터 누락
```sql
-- update_create_consulting_reservation_rpc.sql:73
p_linked_seminar_id,  -- NULL 허용
```

RPC 함수가 `linked_seminar_id = NULL`을 허용하고 있음

---

### 원인 2: `current_bookings` 감소 안 되는 원인

#### 명확한 원인: 취소 로직 미구현

**예약 생성 시** (✅ 구현됨):
```sql
-- update_create_consulting_reservation_rpc.sql:80-83
UPDATE consulting_slots
SET current_bookings = current_bookings + 1
WHERE id = p_slot_id;
```

**예약 취소 시** (❌ 미구현):
- 취소 RPC 함수 없음
- 취소 트리거 없음
- 프론트엔드에서 `UPDATE status = 'cancelled'`만 실행

**결과**:
- 예약 취소되어도 `current_bookings`는 그대로
- 슬롯이 마감된 것처럼 보임

---

## 🛠️ 근본 해결 방안

### 해결 1: `linked_seminar_id` NULL 방지

#### Option A: 슬롯의 캠페인 ID를 자동으로 사용 (추천 ⭐)

```sql
-- RPC 함수 수정
CREATE OR REPLACE FUNCTION public.create_consulting_reservation(
  p_slot_id uuid,
  -- ... 기타 파라미터
  p_linked_seminar_id uuid
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_reservation_id uuid;
  v_slot record;
  v_final_seminar_id uuid;
BEGIN
  -- 1. 슬롯 정보 조회
  SELECT * INTO v_slot
  FROM consulting_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;

  -- 2. linked_seminar_id 결정
  -- 파라미터가 NULL이면 슬롯의 linked_seminar_id 사용
  v_final_seminar_id := COALESCE(p_linked_seminar_id, v_slot.linked_seminar_id);

  -- 3. 예약 생성
  INSERT INTO consulting_reservations (
    slot_id,
    linked_seminar_id,  -- ⭐ v_final_seminar_id 사용
    -- ... 기타 필드
  ) VALUES (
    p_slot_id,
    v_final_seminar_id,  -- ⭐ NULL 방지
    -- ... 기타 값
  )
  RETURNING id INTO v_reservation_id;

  -- 4. current_bookings 증가
  UPDATE consulting_slots
  SET current_bookings = current_bookings + 1
  WHERE id = p_slot_id;

  RETURN json_build_object('reservation_id', v_reservation_id);
END;
$function$;
```

**장점**:
- 미예약자 예약도 자동으로 캠페인 연결
- Admin 쿼리에서 모든 예약 표시
- 데이터 정합성 보장

---

#### Option B: 프론트엔드 검증 추가

```javascript
// ConsultingContext.jsx
const createConsultingReservation = async (reservationData) => {
  const selectedSlot = timeSlots.find(slot => slot.time.slice(0, 5) === selectedTime);

  // ⭐ linked_seminar_id가 없으면 슬롯의 linked_seminar_id 사용
  const linkedSeminarId = reservationData.linkedSeminarId || selectedSlot.linked_seminar_id;

  if (!linkedSeminarId) {
    throw new Error('캠페인 정보를 찾을 수 없습니다.');
  }

  const { data, error } = await supabase.rpc('create_consulting_reservation', {
    // ...
    p_linked_seminar_id: linkedSeminarId,  // ⭐ NULL 방지
  });
};
```

---

### 해결 2: 예약 취소 시 `current_bookings` 자동 감소

#### Option A: 트리거 설치 (추천 ⭐)

```sql
-- 예약 상태 변경 시 current_bookings 자동 업데이트
CREATE OR REPLACE FUNCTION sync_current_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- 예약 생성 (INSERT)
  IF TG_OP = 'INSERT' AND NEW.status NOT IN ('cancelled', 'auto_cancelled') THEN
    UPDATE consulting_slots
    SET current_bookings = current_bookings + 1
    WHERE id = NEW.slot_id;
    RETURN NEW;
  END IF;

  -- 예약 상태 변경 (UPDATE)
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

    RETURN NEW;
  END IF;

  -- 예약 삭제 (DELETE)
  IF TG_OP = 'DELETE' AND OLD.status NOT IN ('cancelled', 'auto_cancelled') THEN
    UPDATE consulting_slots
    SET current_bookings = GREATEST(current_bookings - 1, 0)
    WHERE id = OLD.slot_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS consulting_reservation_sync_trigger ON consulting_reservations;

CREATE TRIGGER consulting_reservation_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON consulting_reservations
FOR EACH ROW
EXECUTE FUNCTION sync_current_bookings();
```

**장점**:
- 자동 동기화 (코드 수정 불필요)
- 모든 경우 커버 (생성/취소/복구/삭제)
- 데이터 정합성 보장

---

#### Option B: 예약 취소 RPC 함수

```sql
CREATE OR REPLACE FUNCTION cancel_consulting_reservation(
  p_reservation_id uuid,
  p_cancellation_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_slot_id uuid;
  v_current_status text;
BEGIN
  -- 1. 예약 정보 조회
  SELECT slot_id, status INTO v_slot_id, v_current_status
  FROM consulting_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- 이미 취소된 예약
  IF v_current_status IN ('cancelled', 'auto_cancelled') THEN
    RAISE EXCEPTION 'Reservation already cancelled';
  END IF;

  -- 2. 예약 취소
  UPDATE consulting_reservations
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_cancellation_reason
  WHERE id = p_reservation_id;

  -- 3. 슬롯 예약 수 감소
  UPDATE consulting_slots
  SET current_bookings = GREATEST(current_bookings - 1, 0)
  WHERE id = v_slot_id;

  RETURN json_build_object(
    'success', true,
    'reservation_id', p_reservation_id
  );
END;
$function$;
```

---

### 해결 3: 정기적 데이터 정합성 체크

#### 자동 복구 스크립트 (주기적 실행)

```sql
-- 모든 슬롯의 current_bookings를 실제 값으로 재계산
CREATE OR REPLACE FUNCTION fix_current_bookings()
RETURNS TABLE(slot_id uuid, old_value int, new_value int) AS $$
BEGIN
  RETURN QUERY
  UPDATE consulting_slots cs
  SET current_bookings = (
    SELECT COUNT(*)
    FROM consulting_reservations cr
    WHERE cr.slot_id = cs.id
      AND cr.status NOT IN ('cancelled', 'auto_cancelled')
  )
  WHERE cs.current_bookings != (
    SELECT COUNT(*)
    FROM consulting_reservations cr
    WHERE cr.slot_id = cs.id
      AND cr.status NOT IN ('cancelled', 'auto_cancelled')
  )
  RETURNING
    cs.id,
    cs.current_bookings - (
      SELECT COUNT(*)
      FROM consulting_reservations cr
      WHERE cr.slot_id = cs.id
        AND cr.status NOT IN ('cancelled', 'auto_cancelled')
    ) as old_value,
    (
      SELECT COUNT(*)
      FROM consulting_reservations cr
      WHERE cr.slot_id = cs.id
        AND cr.status NOT IN ('cancelled', 'auto_cancelled')
    ) as new_value;
END;
$$ LANGUAGE plpgsql;

-- 실행: SELECT * FROM fix_current_bookings();
```

---

## 📋 추천 실행 순서

### 1단계: 즉시 적용 (트리거)
```sql
-- sync_current_bookings 트리거 설치
-- (위의 Option A 코드 실행)
```

**효과**:
- 앞으로 모든 예약 생성/취소 시 자동 동기화
- 재발 방지

---

### 2단계: RPC 함수 개선
```sql
-- create_consulting_reservation 함수 수정
-- linked_seminar_id NULL 방지 로직 추가
```

**효과**:
- 미예약자 예약도 캠페인 연결
- Admin에서 모든 예약 표시

---

### 3단계: 기존 데이터 정리 (선택)
```sql
-- NULL인 linked_seminar_id 자동 채우기
UPDATE consulting_reservations cr
SET linked_seminar_id = cs.linked_seminar_id
FROM consulting_slots cs
WHERE cr.slot_id = cs.id
  AND cr.linked_seminar_id IS NULL;

-- current_bookings 재계산
SELECT * FROM fix_current_bookings();
```

---

## ✅ 예상 효과

### Before (현재)
- ❌ 미예약자 예약이 Admin에서 안 보임
- ❌ 취소 시 슬롯이 마감으로 남음
- ❌ 데이터 불일치 발생

### After (개선 후)
- ✅ 모든 예약이 Admin에서 정상 표시
- ✅ 취소 시 자동으로 슬롯 오픈
- ✅ 데이터 정합성 자동 유지

---

## 🔍 테스트 시나리오

### 테스트 1: 미예약자 컨설팅 예약
1. 설명회 거치지 않고 컨설팅 직접 예약
2. Admin → Consultings 탭 확인
3. 예약이 정상 표시되어야 함

### 테스트 2: 예약 취소
1. 예약 생성
2. 슬롯 `current_bookings` 확인 (증가)
3. 예약 취소
4. 슬롯 `current_bookings` 확인 (감소)
5. 예약자 화면에서 해당 슬롯 예약 가능으로 표시

---

## 📝 결론

### 근본 원인
1. `linked_seminar_id = NULL` 허용
2. 예약 취소 시 `current_bookings` 감소 로직 없음

### 근본 해결
1. ⭐ **트리거 설치** (자동 동기화)
2. ⭐ **RPC 함수 개선** (NULL 방지)
3. 정기적 데이터 체크 (선택)

### 우선순위
1. **높음**: 트리거 설치 (5분)
2. **중간**: RPC 함수 개선 (10분)
3. **낮음**: 기존 데이터 정리

---

**다음 단계**: 트리거를 설치하여 재발을 방지하시겠습니까?
