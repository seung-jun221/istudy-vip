// 전화번호 포맷팅
export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(
      3,
      7
    )}-${cleaned.substring(7, 11)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(
      3,
      6
    )}-${cleaned.substring(6, 10)}`;
  }

  return phone;
}

// 전화번호 유효성 검사
export function validatePhone(phone) {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
}

// 이름 유효성 검사
export function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  // 최소 2글자 이상, 한글/영문만 허용
  return trimmed.length >= 2 && /^[가-힣a-zA-Z\s]+$/.test(trimmed);
}

// ============================================================
// 한국시간(KST) 기준 날짜/시간 포맷 유틸리티
// ============================================================

// 내부 헬퍼: KST 기준 날짜 파트 추출
function kstParts(dateStr) {
  const date = new Date(dateStr);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const map = {};
  fmt.formatToParts(date).forEach(({ type, value }) => {
    map[type] = value;
  });
  return {
    year: parseInt(map.year),
    month: parseInt(map.month),
    day: parseInt(map.day),
    hour: parseInt(map.hour === '24' ? '0' : map.hour),
    minute: map.minute,
    weekday: map.weekday,
  };
}

const KR_WEEKDAYS = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };

// 날짜 포맷팅 "YYYY년 M월 D일(요일)" (KST)
export function formatDate(dateStr) {
  const p = kstParts(dateStr);
  const dayKR = KR_WEEKDAYS[p.weekday] || p.weekday;
  return `${p.year}년 ${p.month}월 ${p.day}일(${dayKR})`;
}

// 시간 포맷팅
export function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${displayHour}시${minutes !== '00' ? ` ${minutes}분` : ''}`;
}

// 날짜시간 포맷팅 (KST)
export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '-';
  const date = new Date(dateTimeStr);
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 타임스탬프 → "M/D H:MM" (KST)
export function formatTimestampShort(timestamp) {
  if (!timestamp) return '-';
  const p = kstParts(timestamp);
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

// 날짜 → "M/D" (KST)
export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const p = kstParts(dateStr);
  return `${p.month}/${p.day}`;
}

// 날짜 → "M월 D일" (KST)
export function formatDateKR(dateStr) {
  if (!dateStr) return '-';
  const p = kstParts(dateStr);
  return `${p.month}월 ${p.day}일`;
}

// 날짜 → "M월 D일 (요일)" (KST)
export function formatDateFullKR(dateStr) {
  if (!dateStr) return '-';
  const p = kstParts(dateStr);
  const dayKR = KR_WEEKDAYS[p.weekday] || p.weekday;
  return `${p.month}월 ${p.day}일 (${dayKR})`;
}

// 슬롯 날짜+시간문자열 → "M/D HH:MM" (KST)
// dateStr: DATE 타입 (YYYY-MM-DD), timeStr: TIME 타입 (HH:MM:SS)
export function formatSlotDateTime(dateStr, timeStr) {
  if (!dateStr) return '-';
  const p = kstParts(dateStr);
  const time = timeStr ? timeStr.slice(0, 5) : '';
  return time ? `${p.month}/${p.day} ${time}` : `${p.month}/${p.day}`;
}

// 타임스탬프 → 엑셀용 "YYYY-MM-DD HH:MM" (KST)
export function formatDateTimeForExcel(timestamp) {
  if (!timestamp) return '';
  const p = kstParts(timestamp);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')} ${String(p.hour).padStart(2, '0')}:${p.minute}`;
}

// 날짜 → 엑셀용 "YYYY-MM-DD" (KST)
export function formatDateForExcel(dateStr) {
  if (!dateStr) return '';
  const p = kstParts(dateStr);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// 요일만 (KST)
export function getDayOfWeekKR(dateStr) {
  const p = kstParts(dateStr);
  return KR_WEEKDAYS[p.weekday] || p.weekday;
}
