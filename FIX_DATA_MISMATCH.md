# 예약 데이터 불일치 문제 해결 가이드

**문제**: Admin 페이지에서는 10명으로 표시되지만, 예약자 화면에서는 11석이 예약됨

**작성일**: 2025-11-11

---

## 🔍 문제 원인 분석

### 1. 데이터 흐름 차이

#### Admin 페이지 (정확함 ✅)
```javascript
// AdminContext.jsx:265
const { data: consultings } = await supabase
  .from('consulting_reservations')
  .select('*')
  .eq('linked_seminar_id', campaignId)
  .not('status', 'in', '(cancelled,auto_cancelled)');

// 실제 DB에서 유효한 예약만 쿼리 → 10개
```

#### 예약자 화면 (부정확함 ❌)
```javascript
// ConsultingContext.jsx:319
const slotsWithAvailability = slots.map((slot) => ({
  ...slot,
  isAvailable: slot.current_bookings < slot.max_capacity,
}));

// slot.current_bookings 값을 신뢰 → 11개로 표시됨
```

---

### 2. 핵심 문제: `current_bookings` 동기화 안 됨

**정상 시나리오**:
1. 예약 생성 → `current_bookings + 1` ✅ (RPC 함수에서 처리)
2. 예약 취소 → `current_bookings - 1` ❌ (구현 안 됨!)

**결과**:
- 예약이 취소되어도 `current_bookings`가 감소하지 않음
- `current_bookings`가 실제 유효 예약 수보다 많아짐
- 예약자 화면에서 슬롯이 마감된 것으로 표시됨

---

### 3. RPC 함수 확인

**예약 생성 RPC** (`create_consulting_reservation`):
```sql
-- 80-83라인: 예약 수 증가 (정상 작동)
UPDATE consulting_slots
SET current_bookings = current_bookings + 1
WHERE id = p_slot_id;
```
✅ 예약 생성 시 증가는 정상 작동

**예약 취소 기능**:
❌ 구현되지 않음!

---

## 🎯 해결 방법

### Option 1: 즉시 수정 (브라우저 스크립트) ⚡

가장 빠른 방법입니다.

#### 1단계: 문제 확인
Admin 페이지에서 F12 → Console → `debug_data_mismatch_browser.js` 내용 붙여넣기

#### 2단계: 자동 수정
스크립트가 불일치 슬롯을 찾아서 자동 수정 코드를 생성해줍니다.

```javascript
// 스크립트 실행 후 나오는 수정 코드를 복사해서 실행
(async () => {
  // 불일치 슬롯들의 current_bookings를 실제 값으로 업데이트
  for (const m of mismatches) {
    await client
      .from("consulting_slots")
      .update({ current_bookings: m.actualActive })
      .eq("id", m.slotId);
    console.log("✅ 수정:", m.date, m.time);
  }
  console.log("🎉 완료!");
  location.reload();
})();
```

---

### Option 2: SQL로 일괄 수정 (깔끔) 🗄️

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 모든 슬롯의 current_bookings를 실제 예약 수로 재계산
UPDATE consulting_slots cs
SET current_bookings = (
  SELECT COUNT(*)
  FROM consulting_reservations cr
  WHERE cr.slot_id = cs.id
    AND cr.status NOT IN ('cancelled', 'auto_cancelled')
)
WHERE cs.linked_seminar_id = '광교_캠페인_ID';
```

**장점**: 한번에 모든 캠페인 수정 가능

---

### Option 3: 근본 해결 - 예약 취소 시 current_bookings 감소 🔧

장기적으로 가장 좋은 방법입니다.

#### 방법 1: 트리거 생성
```sql
-- 예약 상태가 cancelled로 변경되면 자동으로 current_bookings 감소
CREATE OR REPLACE FUNCTION decrease_current_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status NOT IN ('cancelled', 'auto_cancelled')
     AND NEW.status IN ('cancelled', 'auto_cancelled') THEN
    UPDATE consulting_slots
    SET current_bookings = GREATEST(current_bookings - 1, 0)
    WHERE id = OLD.slot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consulting_reservation_cancel_trigger
AFTER UPDATE ON consulting_reservations
FOR EACH ROW
EXECUTE FUNCTION decrease_current_bookings();
```

#### 방법 2: 예약 취소 RPC 함수 생성
```sql
CREATE OR REPLACE FUNCTION cancel_consulting_reservation(
  p_reservation_id uuid
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_slot_id uuid;
BEGIN
  -- 1. 예약 정보 조회
  SELECT slot_id INTO v_slot_id
  FROM consulting_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- 2. 예약 취소
  UPDATE consulting_reservations
  SET status = 'cancelled',
      cancelled_at = NOW()
  WHERE id = p_reservation_id;

  -- 3. 슬롯 예약 수 감소
  UPDATE consulting_slots
  SET current_bookings = GREATEST(current_bookings - 1, 0)
  WHERE id = v_slot_id;

  RETURN json_build_object('success', true);
END;
$function$;
```

---

## 📋 즉시 해결 단계 (추천)

### 1. 브라우저에서 확인 및 수정

1. Admin 페이지 열기
2. F12 → Console
3. `debug_data_mismatch_browser.js` 파일 내용 복사 & 붙여넣기
4. 스크립트가 불일치 슬롯을 찾아줌
5. 자동 생성된 수정 코드 실행
6. 페이지 새로고침

**예상 시간**: 2-3분

---

### 2. 문제 재발 방지 (선택)

#### Option A: 트리거 설치 (추천)
- 예약 취소 시 자동으로 current_bookings 감소
- 한번 설치하면 영구적으로 작동
- 추가 코드 수정 불필요

#### Option B: RPC 함수 개선
- 예약 취소 전용 RPC 함수 생성
- 프론트엔드에서 취소 기능 구현
- 사용자가 직접 예약 취소 가능

---

## ⚠️ 주의사항

### 1. 동시성 문제
여러 사용자가 동시에 예약하면 `current_bookings`가 여전히 어긋날 수 있습니다.

**해결**: RPC 함수의 `FOR UPDATE` 잠금이 이미 적용되어 있어 대부분 방지됨

---

### 2. 기존 취소 예약
이미 취소된 예약이 있다면 현재 `current_bookings`가 부정확합니다.

**해결**: Option 1 또는 Option 2로 일괄 재계산

---

## 🔍 확인 방법

### 수정 후 확인:
1. Admin 페이지 → 광교 캠페인 → Consultings 탭
2. 예약 수 확인 (10개로 표시되어야 함)
3. 예약자 화면에서 11/17 20:30 슬롯 확인
4. 예약 가능으로 표시되어야 함

---

## 📝 요약

### 문제
- `current_bookings`와 실제 유효 예약 수 불일치
- 예약 취소 시 `current_bookings` 감소 안 됨

### 즉시 해결
- 브라우저 스크립트 실행 (2-3분)
- 또는 SQL 일괄 재계산

### 근본 해결
- 트리거 설치 (추천)
- 또는 예약 취소 RPC 함수 생성

---

**다음 단계**: 브라우저 스크립트를 실행해서 현재 상황을 확인하고 즉시 수정하세요!
