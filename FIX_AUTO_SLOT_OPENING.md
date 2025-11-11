# 광교 캠페인 자동 슬롯 오픈 미작동 원인 및 해결 방법

## 🔴 현재 상황

- **공개 좌석**: 12석
- **예약 완료**: 10석
- **남은 좌석**: 2석 ✅
- **임계값**: 3 ✅
- **비공개 좌석**: 6석 (여전히 비공개 ❌)

**예상 동작**: 남은 좌석(2석) ≤ 임계값(3석) → 비공개 슬롯이 자동 공개되어야 함

**실제 동작**: 비공개 슬롯이 여전히 비공개 상태

---

## 🔍 가능한 원인 (우선순위순)

### 1. 🔴 localStorage 미설정 (가장 가능성 높음)

**문제**:
- 임계값이 localStorage에만 저장됨
- 관리자가 설정한 브라우저 ≠ 사용자가 예약하는 브라우저
- 예약 시점에 `checkAndOpenNextSlots` 함수가 임계값을 찾지 못해 종료

**확인 방법**:
```javascript
// 브라우저 콘솔에서 실행
localStorage.getItem('campaign_settings')
// 출력 예시: {"campaign_id":{"auto_open_threshold":3}}
```

**해결 방법**:
- **즉시 해결**: 브라우저 콘솔에서 수동으로 설정
  ```javascript
  // 광교 캠페인 ID를 확인 후 (Admin 페이지에서 확인)
  const campaignId = 'YOUR_CAMPAIGN_ID_HERE';
  const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
  settings[campaignId] = { auto_open_threshold: 3 };
  localStorage.setItem('campaign_settings', JSON.stringify(settings));
  console.log('✅ 임계값 설정 완료');
  ```

- **장기 해결**: DB 마이그레이션 (campaigns 테이블에 컬럼 추가)

---

### 2. 🟡 비공개 슬롯의 날짜 순서 문제

**문제**:
- 비공개 슬롯의 날짜가 공개 슬롯의 마지막 날짜보다 늦지 않음
- 자동 오픈 로직은 "다음 날짜"만 오픈하므로, 같은 날짜나 이전 날짜는 오픈되지 않음

**예시**:
```
공개 슬롯: 2025-01-15, 2025-01-16, 2025-01-17 (마지막: 2025-01-17)
비공개 슬롯: 2025-01-15, 2025-01-16 (모두 2025-01-17보다 이름)
→ 오픈할 "다음 날짜"가 없음!
```

**확인 방법**:
```javascript
// 브라우저 콘솔에서 실행
// (debug_gwanggyo_browser.js 스크립트 실행 후 확인)
```

**해결 방법**:
- Admin → Settings → 컨설팅 슬롯 관리
- 공개 슬롯의 마지막 날짜보다 **늦은 날짜**에 비공개 슬롯 생성
- "즉시 오픈" 체크박스를 **해제**하고 슬롯 생성

---

### 3. 🟢 함수 호출 문제

**문제**:
- 예약 생성 시 `checkAndOpenNextSlots` 함수가 호출되지 않음
- 조건문에서 제외됨 (예: `isSeminarAttendee === false`)

**확인 방법**:
- 예약 생성 시 브라우저 콘솔 확인
- "🔍 자동 슬롯 오픈 체크 시작" 로그가 보이는지 확인

**해결 방법**:
- ConsultingContext.jsx:413-417 라인 확인
- 조건문 검토

---

## 🛠️ 즉시 해결 방법

### 방법 1: 브라우저 콘솔에서 수동 오픈 (가장 빠름)

1. Admin 페이지 열기
2. 광교 캠페인 상세 페이지 이동
3. F12 (개발자 도구) → Console 탭
4. 다음 코드 실행:

```javascript
(async function() {
  const supabase = window.supabase.createClient(
    'https://xooglumwuzctbcjtcvnd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2dsdW13dXpjdGJjanRjdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTk5OTgsImV4cCI6MjA3MTE3NTk5OH0.Uza-Z3CzwQgkYKJmKdwTNCAYgaxeKFs__2udUSAGpJg'
  );

  // 1. 광교 캠페인 찾기
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .ilike('location', '%광교%');

  if (!campaigns || campaigns.length === 0) {
    console.error('❌ 광교 캠페인을 찾을 수 없습니다.');
    return;
  }

  const campaignId = campaigns[0].id;
  console.log('캠페인 ID:', campaignId);

  // 2. 비공개 슬롯 조회
  const { data: closedSlots } = await supabase
    .from('consulting_slots')
    .select('*')
    .eq('linked_seminar_id', campaignId)
    .eq('is_available', false)
    .order('date', { ascending: true });

  if (!closedSlots || closedSlots.length === 0) {
    console.log('❌ 비공개 슬롯이 없습니다.');
    return;
  }

  console.log(`발견된 비공개 슬롯: ${closedSlots.length}개`);

  // 3. 가장 빠른 날짜의 슬롯들만 오픈
  const firstDate = closedSlots[0].date;
  const slotsToOpen = closedSlots.filter(slot => slot.date === firstDate);
  const slotIds = slotsToOpen.map(slot => slot.id);

  console.log(`${firstDate}의 ${slotsToOpen.length}개 슬롯을 오픈합니다...`);

  // 4. 슬롯 오픈
  const { error } = await supabase
    .from('consulting_slots')
    .update({ is_available: true })
    .in('id', slotIds);

  if (error) {
    console.error('❌ 오픈 실패:', error);
  } else {
    console.log(`✅ ${firstDate}의 ${slotsToOpen.length}개 슬롯이 공개되었습니다!`);
    location.reload(); // 페이지 새로고침
  }
})();
```

---

### 방법 2: Admin 페이지에서 수동 오픈

1. Admin 로그인
2. 광교 캠페인 상세 페이지
3. Settings 탭
4. "컨설팅 슬롯 관리" 섹션
5. 비공개 슬롯 찾기 (상태: "비공개")
6. "공개로 변경" 버튼 클릭

---

## 🔧 진단 도구 사용법

### 1. 브라우저 콘솔 디버깅 스크립트

`debug_gwanggyo_browser.js` 파일의 내용을 복사하여 브라우저 콘솔에 붙여넣으면:

- ✅ 캠페인 정보 확인
- ✅ localStorage 임계값 확인
- ✅ 슬롯 상태 확인
- ✅ 예약 현황 확인
- ✅ 자동 오픈 조건 체크
- ✅ 발견된 이슈 보고

---

## 📝 근본적인 해결책: DB 마이그레이션

localStorage 의존성 문제를 완전히 해결하려면:

### 1. DB 스키마 변경

```sql
-- campaigns 테이블에 컬럼 추가
ALTER TABLE campaigns
ADD COLUMN auto_open_threshold INTEGER DEFAULT 0;

-- 기존 localStorage 데이터를 DB로 마이그레이션 (선택)
-- (수동으로 Admin UI에서 재설정하는 것이 더 간단할 수 있음)
```

### 2. 코드 수정

**ConsultingContext.jsx** (36-48 라인):
```javascript
// 기존 코드
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
const threshold = settings[campaignId]?.auto_open_threshold;

// 변경 후
const { data: campaign } = await supabase
  .from('campaigns')
  .select('auto_open_threshold')
  .eq('id', campaignId)
  .single();

const threshold = campaign?.auto_open_threshold || 0;
```

**SettingsTab.jsx** (104-111 라인):
```javascript
// 기존 코드 (localStorage 저장)
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
settings[campaign.id] = { auto_open_threshold: autoOpenThreshold };
localStorage.setItem('campaign_settings', JSON.stringify(settings));

// 변경 후 (DB 저장)
// updateCampaign 함수 호출 시 auto_open_threshold도 함께 전달
await updateCampaign(campaign.id, {
  ...formData,
  auto_open_threshold: autoOpenThreshold
});
```

---

## ✅ 체크리스트

실제 작동 여부를 확인하기 위한 체크리스트:

- [ ] localStorage에 임계값이 설정되어 있는가?
- [ ] 비공개 슬롯의 날짜가 공개 슬롯보다 늦은가?
- [ ] 남은 슬롯 수가 임계값 이하인가?
- [ ] 예약 생성 시 콘솔에 "🔍 자동 슬롯 오픈 체크 시작" 로그가 보이는가?
- [ ] 설명회 예약자로 컨설팅 예약을 하고 있는가? (미예약자는 linkedSeminarId가 없음)

---

## 🎯 권장 조치 (우선순위순)

1. **즉시**: 브라우저 콘솔에서 수동 오픈 (위 "방법 1" 참조)
2. **단기**: localStorage 임계값 확인 및 재설정
3. **중기**: 날짜 순서 확인 및 비공개 슬롯 재생성
4. **장기**: DB 마이그레이션 수행

---

**작성일**: 2025-11-11
**작성자**: Claude Code
