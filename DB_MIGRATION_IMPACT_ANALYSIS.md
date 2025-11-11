# DB 마이그레이션 영향도 분석 보고서

**작업**: `auto_open_threshold`를 localStorage → DB (campaigns 테이블)로 이전

**작성일**: 2025-11-11

---

## 📊 현재 상황 분석

### 1. localStorage 사용 현황

현재 `campaign_settings` localStorage 키에 저장되는 데이터:

```javascript
{
  "campaign_id_1": {
    "auto_open_threshold": 3
  },
  "campaign_id_2": {
    "auto_open_threshold": 5
  }
}
```

**저장되는 값**: `auto_open_threshold` **단 하나만** 저장됨

---

## 🔍 영향받는 파일 및 기능

### 📖 읽기 작업 (4곳)

#### 1. `src/context/ConsultingContext.jsx:42`
```javascript
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
const threshold = settings[campaignId]?.auto_open_threshold;
```
**기능**: 예약 생성 시 자동 슬롯 오픈 체크
**영향**: ⚠️ 높음 - 자동 슬롯 오픈 핵심 기능

---

#### 2. `src/context/AdminContext.jsx:1047`
```javascript
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
const threshold = settings[campaignId]?.auto_open_threshold;
```
**기능**: Admin에서도 자동 슬롯 오픈 체크 (중복 코드)
**영향**: ⚠️ 높음 - 자동 슬롯 오픈 핵심 기능

---

#### 3. `src/components/admin/SettingsTab.jsx:48`
```javascript
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
const threshold = settings[campaign.id]?.auto_open_threshold || 0;
setAutoOpenThreshold(threshold);
```
**기능**: Settings 탭에서 현재 임계값 표시
**영향**: ⚠️ 중간 - UI 표시만, 기능 동작에는 영향 없음

---

#### 4. `src/components/admin/SettingsTab.jsx:131`
```javascript
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
const threshold = settings[campaign.id]?.auto_open_threshold || 0;
setAutoOpenThreshold(threshold);
```
**기능**: Settings 편집 취소 시 원래 값 복원
**영향**: ⚠️ 낮음 - 편집 취소 기능만

---

### ✏️ 쓰기 작업 (3곳)

#### 1. `src/components/admin/SettingsTab.jsx:106-110`
```javascript
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
settings[campaign.id] = {
  auto_open_threshold: autoOpenThreshold,
};
localStorage.setItem('campaign_settings', JSON.stringify(settings));
```
**기능**: Settings 탭에서 임계값 저장
**영향**: ⚠️ 높음 - 설정 저장 핵심 기능

---

#### 2. `src/context/AdminContext.jsx:578-582`
```javascript
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
settings[id] = {
  auto_open_threshold: campaignData.auto_open_threshold,
};
localStorage.setItem('campaign_settings', JSON.stringify(settings));
```
**기능**: 새 캠페인 생성 시 임계값 저장
**영향**: ⚠️ 중간 - 새 캠페인 생성 시에만

---

#### 3. `src/context/AdminContext.jsx:810-812`
```javascript
const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
delete settings[campaignId];
localStorage.setItem('campaign_settings', JSON.stringify(settings));
```
**기능**: 캠페인 삭제 시 임계값 정리
**영향**: ✅ 낮음 - 정리 작업일 뿐, 없어도 무방

---

## ✅ 영향도 종합 평가

### 🔴 높은 영향 (3곳)
1. **ConsultingContext.jsx:42** - 자동 슬롯 오픈 실행
2. **AdminContext.jsx:1047** - 자동 슬롯 오픈 실행 (중복)
3. **SettingsTab.jsx:106-110** - 임계값 설정 저장

### 🟡 중간 영향 (2곳)
4. **SettingsTab.jsx:48** - 임계값 UI 표시
5. **AdminContext.jsx:578-582** - 새 캠페인 생성 시 저장

### 🟢 낮은 영향 (2곳)
6. **SettingsTab.jsx:131** - 편집 취소
7. **AdminContext.jsx:810-812** - 캠페인 삭제 시 정리

---

## 🚨 위험 요소

### 1. 다른 설정값 확인
**결론**: ✅ **안전**

`campaign_settings`에는 **오직 `auto_open_threshold`만** 저장됩니다.
다른 설정값이 없으므로 전체 마이그레이션이 안전합니다.

**증거**:
```javascript
// 모든 쓰기 작업에서 동일한 구조
settings[campaign.id] = {
  auto_open_threshold: autoOpenThreshold,  // 이것만 저장됨
};
```

---

### 2. 기존 데이터 손실 위험
**결론**: ⚠️ **주의 필요**

현재 localStorage에 저장된 임계값이 있다면, DB 마이그레이션 후에도 유지되어야 합니다.

**해결 방안**:
- 마이그레이션 시 localStorage 데이터를 읽어서 DB에 일괄 업데이트
- 또는 Admin에게 재설정 요청 (더 간단)

---

### 3. 브라우저 호환성
**결론**: ✅ **문제 없음**

DB 조회는 서버 측 작업이므로 브라우저 무관하게 작동합니다.

---

### 4. 성능 영향
**결론**: ✅ **문제 없음**

- localStorage 읽기: 동기적, 즉시 반환
- DB 조회: 비동기, ~100-200ms 추가

하지만 `checkAndOpenNextSlots` 함수는 이미 비동기로 작동하므로 영향 없음.

---

## 🎯 마이그레이션 전략

### Phase 1: DB 스키마 추가 (안전)
```sql
ALTER TABLE campaigns
ADD COLUMN auto_open_threshold INTEGER DEFAULT 0;
```
**영향**: ✅ 없음 (새 컬럼 추가만)

---

### Phase 2: 코드 병행 운영 (안전)
DB와 localStorage를 **둘 다** 지원하도록 수정:

```javascript
// 읽기: DB 우선, localStorage 폴백
const { data: campaign } = await supabase
  .from('campaigns')
  .select('auto_open_threshold')
  .eq('id', campaignId)
  .single();

let threshold = campaign?.auto_open_threshold;

// DB에 없으면 localStorage에서 읽기 (하위 호환성)
if (!threshold) {
  const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
  threshold = settings[campaignId]?.auto_open_threshold || 0;
}
```

**장점**:
- 기존 localStorage 데이터도 계속 작동
- DB로 점진적 이전 가능
- 롤백 가능

---

### Phase 3: localStorage 제거 (선택)
충분한 시간이 지나면 localStorage 읽기 코드 제거

**타이밍**: 모든 캠페인이 DB에 저장된 후 (약 1-2주)

---

## 📋 변경 파일 목록

### 🔧 수정 필요 (7개 파일)

1. **migrations/add_auto_open_threshold.sql** (신규)
   - campaigns 테이블에 컬럼 추가

2. **src/context/ConsultingContext.jsx**
   - 42라인: localStorage → DB 조회

3. **src/context/AdminContext.jsx**
   - 578-582라인: localStorage 저장 → DB 저장
   - 810-812라인: localStorage 정리 제거 (불필요)
   - 1047라인: localStorage → DB 조회

4. **src/components/admin/SettingsTab.jsx**
   - 48라인: localStorage → DB (또는 props로 전달)
   - 106-110라인: localStorage 저장 → DB 저장
   - 131라인: localStorage → DB (또는 props로 전달)

---

## ⚠️ 주의사항

### 1. 동시성 문제
**문제**: 여러 사용자가 동시에 예약하면?

**영향**: ✅ 없음
- DB 조회는 매번 최신 값을 가져옴
- localStorage보다 오히려 더 안전

---

### 2. 캐싱 전략
**문제**: 매번 DB 조회하면 느리지 않나?

**해결**: Context에서 캐싱
```javascript
const [thresholdCache, setThresholdCache] = useState({});

// 첫 조회 시 캐싱
if (!thresholdCache[campaignId]) {
  const { data } = await supabase.from('campaigns')...
  setThresholdCache(prev => ({ ...prev, [campaignId]: data.auto_open_threshold }));
}
```

---

### 3. 테스트 필요 여부
**필수 테스트**:
1. ✅ 임계값 설정 저장 (Settings 탭)
2. ✅ 임계값 읽기 (예약 생성 시)
3. ✅ 자동 슬롯 오픈 작동
4. ✅ 새 캠페인 생성 시 임계값 저장
5. ✅ 캠페인 삭제 시 정상 작동

---

## 🎯 최종 결론

### ✅ 안전성: **높음**
- `campaign_settings`에는 `auto_open_threshold`만 저장됨
- 다른 기능과 완전히 독립적
- 영향 범위가 명확하고 제한적

### ✅ 필요성: **높음**
- localStorage 의존성으로 인한 버그 해결
- 서버 측 자동화 가능
- 멀티 브라우저 지원

### ✅ 복잡도: **낮음**
- 7개 파일, 10개 라인 내외 수정
- 단순한 CRUD 작업
- 롤백 가능

---

## 🚀 추천 실행 방안

### Option 1: 안전한 점진적 마이그레이션 (추천)
1. DB 컬럼 추가
2. **병행 운영** (DB + localStorage 둘 다 지원)
3. Admin에게 재설정 요청
4. 1-2주 후 localStorage 코드 제거

**장점**: 안전, 롤백 가능
**단점**: 약간의 중복 코드

---

### Option 2: 직접 마이그레이션 (빠름)
1. DB 컬럼 추가
2. localStorage → DB 일괄 복사 스크립트 실행
3. 코드 수정 (localStorage 제거)
4. 테스트

**장점**: 빠름, 깔끔
**단점**: 롤백 어려움

---

## 📝 다음 단계

만약 진행하신다면:

1. ✅ 영향도 분석 완료 (현재)
2. ⏳ 마이그레이션 방식 선택 (Option 1 vs Option 2)
3. ⏳ SQL + 코드 작성
4. ⏳ 테스트
5. ⏳ 배포

---

**결론**: 마이그레이션은 **안전하고 필요**합니다. 다른 기능에 영향을 주지 않습니다.
