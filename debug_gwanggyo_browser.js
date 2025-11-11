/**
 * 브라우저 콘솔에서 실행할 광교 캠페인 디버깅 스크립트
 *
 * 사용 방법:
 * 1. 브라우저에서 Admin 페이지 또는 예약 페이지 열기
 * 2. 개발자 도구 콘솔 열기 (F12)
 * 3. 이 파일의 내용을 복사하여 콘솔에 붙여넣기
 */

(async function debugGwanggyoSlots() {
  console.log('🔍 광교 캠페인 자동 슬롯 오픈 디버깅 시작\n');

  // supabase 클라이언트 가져오기 (전역 변수 또는 Context에서)
  const supabaseUrl = 'https://xooglumwuzctbcjtcvnd.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2dsdW13dXpjdGJjanRjdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTk5OTgsImV4cCI6MjA3MTE3NTk5OH0.Uza-Z3CzwQgkYKJmKdwTNCAYgaxeKFs__2udUSAGpJg';

  // Supabase 클라이언트 생성
  const { createClient } = window.supabase || {};
  if (!createClient) {
    console.error('❌ Supabase 클라이언트를 찾을 수 없습니다.');
    console.log('💡 해결 방법: Admin 페이지나 예약 페이지에서 실행하세요.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 광교 캠페인 찾기
  console.log('1️⃣ 광교 캠페인 조회...');
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .ilike('location', '%광교%');

  if (campaignError) {
    console.error('❌ 캠페인 조회 실패:', campaignError);
    return;
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('❌ 광교 캠페인을 찾을 수 없습니다.');
    return;
  }

  const campaign = campaigns[0];
  console.log('✅ 캠페인 정보:');
  console.log('   ID:', campaign.id);
  console.log('   제목:', campaign.title || '(없음)');
  console.log('   위치:', campaign.location);
  console.log('   상태:', campaign.status);
  console.log('');

  // 2. localStorage 임계값 확인
  console.log('2️⃣ localStorage 임계값 설정 확인');
  const settings = JSON.parse(localStorage.getItem('campaign_settings') || '{}');
  const threshold = settings[campaign.id]?.auto_open_threshold || 0;

  console.log('   campaign_settings:', settings);
  console.log('   현재 캠페인 임계값:', threshold);

  if (threshold === 0) {
    console.warn('   ⚠️ 경고: 임계값이 0입니다! 자동 슬롯 오픈이 비활성화되어 있습니다.');
    console.log('   💡 해결: Admin → Settings → "자동 슬롯 오픈 임계값"을 3으로 설정하고 저장하세요.');
  } else {
    console.log('   ✅ 임계값이 설정되어 있습니다:', threshold);
  }
  console.log('');

  // 3. 모든 컨설팅 슬롯 조회
  console.log('3️⃣ 컨설팅 슬롯 조회...');
  const { data: allSlots, error: slotsError } = await supabase
    .from('consulting_slots')
    .select('*')
    .eq('linked_seminar_id', campaign.id)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (slotsError) {
    console.error('❌ 슬롯 조회 실패:', slotsError);
    return;
  }

  console.log(`✅ 총 ${allSlots.length}개 슬롯 발견`);
  console.log('');

  // 4. 공개/비공개 슬롯 분리
  const availableSlots = allSlots.filter(slot => slot.is_available);
  const closedSlots = allSlots.filter(slot => !slot.is_available);

  console.log('4️⃣ 슬롯 상태 분석:');
  console.log(`   공개 슬롯: ${availableSlots.length}개`);
  console.log(`   비공개 슬롯: ${closedSlots.length}개`);
  console.log('');

  // 5. 날짜별 분류
  console.log('5️⃣ 날짜별 슬롯 분류:');
  const slotsByDate = {};
  allSlots.forEach(slot => {
    if (!slotsByDate[slot.date]) {
      slotsByDate[slot.date] = { available: [], closed: [] };
    }
    if (slot.is_available) {
      slotsByDate[slot.date].available.push(slot);
    } else {
      slotsByDate[slot.date].closed.push(slot);
    }
  });

  Object.keys(slotsByDate).sort().forEach(date => {
    const dateSlots = slotsByDate[date];
    console.log(`   ${date}:`);
    console.log(`     - 공개: ${dateSlots.available.length}개`);
    console.log(`     - 비공개: ${dateSlots.closed.length}개`);
  });
  console.log('');

  // 6. 예약 현황 조회
  console.log('6️⃣ 예약 현황 조회...');
  const { data: reservations, error: resError } = await supabase
    .from('consulting_reservations')
    .select('slot_id, status')
    .eq('linked_seminar_id', campaign.id)
    .neq('status', 'cancelled');

  if (resError) {
    console.error('❌ 예약 조회 실패:', resError);
    return;
  }

  console.log(`✅ 예약 건수: ${reservations.length}개`);
  console.log('');

  // 7. 남은 슬롯 계산
  console.log('7️⃣ 남은 슬롯 계산:');
  const reservedSlotIds = new Set(reservations.map(r => r.slot_id));
  const remainingSlots = availableSlots.filter(slot => !reservedSlotIds.has(slot.id));

  console.log(`   공개 슬롯: ${availableSlots.length}개`);
  console.log(`   예약된 슬롯: ${reservedSlotIds.size}개`);
  console.log(`   남은 슬롯: ${remainingSlots.length}개`);
  console.log(`   임계값: ${threshold}개`);
  console.log('');

  // 8. 자동 오픈 조건 체크
  console.log('8️⃣ 자동 오픈 조건 체크:');

  if (threshold === 0) {
    console.log('   ❌ 임계값이 0이므로 자동 오픈이 비활성화되어 있습니다.');
    console.log('   💡 Admin → Settings에서 임계값을 3으로 설정하세요.');
    return;
  }

  if (remainingSlots.length > threshold) {
    console.log(`   ❌ 조건 불충족: 남은 슬롯(${remainingSlots.length}개) > 임계값(${threshold}개)`);
    console.log('   → 자동 오픈이 실행되지 않습니다.');
    console.log('');
  } else {
    console.log(`   ✅ 조건 충족: 남은 슬롯(${remainingSlots.length}개) ≤ 임계값(${threshold}개)`);
    console.log('   → 자동 오픈이 실행되어야 합니다.');
    console.log('');

    // 9. 다음 오픈할 날짜 찾기
    console.log('9️⃣ 다음 오픈할 날짜 찾기:');

    const openedDates = [...new Set(availableSlots.map(slot => slot.date))].sort();
    const lastOpenedDate = openedDates[openedDates.length - 1];
    console.log(`   마지막 공개 날짜: ${lastOpenedDate}`);

    const closedDates = [...new Set(closedSlots.map(slot => slot.date))].sort();
    console.log(`   비공개 날짜 목록: [${closedDates.join(', ')}]`);

    const nextDate = closedDates.find(date => date > lastOpenedDate);

    if (!nextDate) {
      console.log('   ❌ 오픈할 다음 날짜가 없습니다.');
      console.log('');
      console.log('   🔍 가능한 원인:');
      console.log('   1. 비공개 슬롯의 날짜가 공개 슬롯의 날짜보다 이르거나 같음');
      console.log(`      → 마지막 공개 날짜: ${lastOpenedDate}`);
      console.log(`      → 비공개 날짜: [${closedDates.join(', ')}]`);
      console.log('   2. 비공개 슬롯이 아예 없음');
      console.log('');
      console.log('   💡 해결 방법:');
      console.log('   Admin → Settings → 컨설팅 슬롯 관리에서');
      console.log(`   ${lastOpenedDate}보다 늦은 날짜에 비공개 슬롯을 생성하세요.`);
      console.log('   (예: "즉시 오픈" 체크박스를 해제하고 슬롯 생성)');
    } else {
      console.log(`   ✅ 다음 오픈 날짜: ${nextDate}`);

      const slotsToOpen = closedSlots.filter(slot => slot.date === nextDate);
      console.log(`   오픈할 슬롯: ${slotsToOpen.length}개`);
      console.log('');

      console.log('   🔍 오픈할 슬롯 상세:');
      slotsToOpen.forEach((slot, index) => {
        console.log(`   ${index + 1}. ID: ${slot.id}, 시간: ${slot.time}, 위치: ${slot.location}`);
      });
      console.log('');

      console.log('   🔧 수동으로 슬롯 오픈하기:');
      console.log('   다음 코드를 콘솔에 실행하면 즉시 슬롯이 오픈됩니다:');
      console.log('');
      console.log(`   const slotIds = [${slotsToOpen.map(s => s.id).join(', ')}];`);
      console.log(`   await supabase.from('consulting_slots').update({ is_available: true }).in('id', slotIds);`);
      console.log(`   console.log('✅ ${slotsToOpen.length}개 슬롯이 공개되었습니다!');`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 진단 요약:');
  console.log('');

  const issues = [];

  if (threshold === 0) {
    issues.push('❌ 임계값이 0으로 설정되어 자동 오픈이 비활성화됨');
  }

  if (remainingSlots.length > threshold && threshold > 0) {
    issues.push(`ℹ️ 남은 슬롯(${remainingSlots.length}개)이 임계값(${threshold}개)보다 많아 자동 오픈이 실행되지 않음`);
  }

  if (closedSlots.length > 0 && availableSlots.length > 0) {
    const lastOpenedDate = [...new Set(availableSlots.map(slot => slot.date))].sort().pop();
    const closedDates = [...new Set(closedSlots.map(slot => slot.date))].sort();
    const nextDate = closedDates.find(date => date > lastOpenedDate);

    if (!nextDate) {
      issues.push(`❌ 비공개 슬롯의 날짜가 공개 슬롯의 마지막 날짜(${lastOpenedDate})보다 늦지 않음`);
    }
  }

  if (issues.length === 0) {
    console.log('✅ 모든 조건이 정상입니다!');
    console.log('💡 다음 예약 생성 시 자동으로 슬롯이 오픈됩니다.');
  } else {
    console.log('발견된 이슈:');
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }

  console.log('');
  console.log('📝 다음 단계:');
  console.log('1. 위의 이슈를 해결하세요');
  console.log('2. 테스트 예약을 생성하세요');
  console.log('3. 콘솔에서 "🔍 자동 슬롯 오픈 체크 시작" 로그를 확인하세요');
  console.log('');

  // 결과 객체 반환 (콘솔에서 접근 가능)
  return {
    campaign,
    threshold,
    availableSlots: availableSlots.length,
    closedSlots: closedSlots.length,
    reservations: reservations.length,
    remainingSlots: remainingSlots.length,
    shouldAutoOpen: threshold > 0 && remainingSlots.length <= threshold,
    issues
  };
})();
