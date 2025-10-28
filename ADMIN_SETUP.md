# 관리자 페이지 설정 가이드

## 🎯 개요

캠페인(설명회) 중심의 관리자 페이지가 추가되었습니다.

### 주요 기능
- ✅ 캠페인별 통계 대시보드
- ✅ 설명회 참석자 관리
- ✅ 컨설팅 예약 관리 및 결과 작성
- ✅ 진단검사 예약 현황
- ✅ 캠페인 설정 관리

---

## 📁 추가된 파일

### Context
- `src/context/AdminContext.jsx` - 관리자 기능 전역 상태 관리

### Pages
- `src/pages/admin/AdminLogin.jsx` - 로그인 페이지
- `src/pages/admin/CampaignList.jsx` - 캠페인 목록
- `src/pages/admin/CampaignDetail.jsx` - 캠페인 상세 대시보드

### Components
- `src/components/admin/ProtectedRoute.jsx` - 인증 보호
- `src/components/admin/AttendeesTab.jsx` - 참석자 탭
- `src/components/admin/ConsultingsTab.jsx` - 컨설팅 탭
- `src/components/admin/TestsTab.jsx` - 진단검사 탭
- `src/components/admin/SettingsTab.jsx` - 설정 탭
- `src/components/admin/ConsultingResultModal.jsx` - 컨설팅 결과 작성 모달

---

## 🗄️ 필요한 데이터베이스 컬럼

### 1. `consulting_reservations` 테이블에 추가 필요

아래 컬럼들이 없다면 Supabase 대시보드에서 추가하세요:

```sql
-- 컨설팅 결과 관련 컬럼 추가
ALTER TABLE consulting_reservations
ADD COLUMN IF NOT EXISTS consultant_notes TEXT,
ADD COLUMN IF NOT EXISTS enrollment_status VARCHAR(10) DEFAULT '미정' CHECK (enrollment_status IN ('미정', '확정', '불가')),
ADD COLUMN IF NOT EXISTS result_written_at TIMESTAMP;
```

### 2. `seminars` 테이블에 추가 필요 (선택사항)

내부용 정원을 노출용과 다르게 관리하려면:

```sql
-- 내부용 정원 컬럼 추가
ALTER TABLE seminars
ADD COLUMN IF NOT EXISTS internal_capacity INTEGER;

-- 기존 데이터에 기본값 설정
UPDATE seminars
SET internal_capacity = max_capacity
WHERE internal_capacity IS NULL;
```

### 3. `test_reservations` 테이블 확인

다음 컬럼이 있는지 확인:
- `seminar_id` (INTEGER) - 어떤 캠페인에서 온 예약인지 추적
- `student_name` (VARCHAR)
- `parent_phone` (VARCHAR)
- `location` (VARCHAR)
- `status` (VARCHAR)
- `created_at` (TIMESTAMP)

---

## 🔐 관리자 비밀번호 설정

`.env` 파일에서 비밀번호를 변경하세요:

```env
VITE_ADMIN_PASSWORD=your_secure_password_here
```

**보안 권장사항:**
- 기본 비밀번호(`admin1234`)는 반드시 변경하세요
- 최소 8자 이상, 영문+숫자+특수문자 조합
- 프로덕션 환경에서는 더 강력한 인증 시스템 구현 권장

---

## 🚀 사용 방법

### 1. 관리자 페이지 접속

브라우저에서 `/admin/login`으로 이동:
```
http://localhost:5173/admin/login
```

### 2. 로그인

`.env`에 설정한 비밀번호로 로그인합니다.

### 3. 캠페인 관리

1. **캠페인 목록** (`/admin/campaigns`)
   - 모든 캠페인의 통계를 한눈에 확인
   - 캠페인 카드 클릭 시 상세 페이지로 이동

2. **캠페인 상세** (`/admin/campaigns/:id`)
   - **통계 카드**: 참석자, 컨설팅, 진단검사, 최종 등록 수
   - **설명회 참석자 탭**: 예약 및 참석 현황
   - **컨설팅 현황 탭**: 컨설팅 예약 및 결과 작성
   - **진단검사 예약 탭**: 진단검사 예약 현황
   - **캠페인 설정 탭**: 기본 정보 수정

### 4. 컨설팅 결과 작성

1. 컨설팅 현황 탭에서 "결과 작성" 버튼 클릭
2. 학생 정보 확인
3. 등록 여부 선택 (미정/확정/불가)
4. 컨설팅 메모 작성
5. 저장

---

## 🎨 데이터 흐름

```
설명회 예약 (seminars + reservations)
    ↓
컨설팅 예약 (consulting_reservations)
    ↓
진단검사 예약 (test_reservations)
    ↓
최종 등록 확정 (enrollment_status = '확정')
```

---

## 📊 주요 통계

각 캠페인별로 다음 지표를 추적합니다:

1. **설명회 참석자 수**: `reservations` 테이블에서 `status IN ('예약', '참석')`
2. **컨설팅 예약 수**: `consulting_reservations` 테이블에서 `linked_seminar_id` 기준
3. **진단검사 예약 수**: `test_reservations` 테이블에서 `seminar_id` 기준
4. **최종 등록 수**: `consulting_reservations` 테이블에서 `enrollment_status = '확정'`

---

## 🔧 문제 해결

### "캠페인 정보를 불러올 수 없습니다" 오류

**원인**: 필요한 테이블 컬럼이 없거나 데이터베이스 권한 문제

**해결**:
1. Supabase 대시보드에서 위 SQL 스크립트 실행
2. RLS 정책 확인 (개발 환경에서는 임시로 비활성화 가능)

### 통계가 0으로 표시됨

**원인**: 테이블 간 관계 설정 문제

**확인사항**:
- `consulting_reservations.linked_seminar_id`가 `seminars.id`를 참조하는지
- `test_reservations.seminar_id`가 `seminars.id`를 참조하는지

### 로그인 후 즉시 로그아웃됨

**원인**: 브라우저 로컬스토리지 문제

**해결**:
1. 브라우저 개발자 도구 → Application → Local Storage 확인
2. `admin_authenticated` 키가 `true`로 저장되는지 확인
3. 시크릿 모드에서 테스트

---

## 🎯 향후 개선 사항 (선택)

1. **엑셀 다운로드**: 각 탭별 데이터를 엑셀로 내보내기
2. **실시간 업데이트**: Supabase Realtime 구독으로 자동 갱신
3. **다중 관리자 계정**: `admin_users` 테이블 생성 및 Supabase Auth 연동
4. **권한 관리**: 읽기 전용 / 편집 가능 권한 분리
5. **알림 시스템**: 새 예약 발생 시 알림
6. **차트/그래프**: 시계열 통계 시각화

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. 브라우저 콘솔 로그
2. Supabase 대시보드 → Logs → Edge Functions
3. 네트워크 탭에서 API 요청 상태

**중요**: 프로덕션 배포 전 반드시 관리자 비밀번호를 변경하세요!
