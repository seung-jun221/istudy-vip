/**
 * 광교 캠페인 자동 슬롯 오픈 디버깅 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugGwanggyoCampaign() {
  console.log('🔍 광교 캠페인 자동 슬롯 오픈 디버깅 시작\n');

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
  console.log(`   ID: ${campaign.id}`);
  console.log(`   제목: ${campaign.title || '(없음)'}`);
  console.log(`   위치: ${campaign.location}`);
  console.log(`   상태: ${campaign.status}\n`);

  // 2. localStorage 임계값 확인 (실제로는 확인 불가, 안내만)
  console.log('2️⃣ localStorage 임계값 설정 확인');
  console.log('   ⚠️ 주의: localStorage는 서버에서 확인 불가');
  console.log('   브라우저 개발자 도구에서 확인 필요:');
  console.log(`   localStorage.getItem('campaign_settings')`);
  console.log(`   예상 값: {"${campaign.id}":{"auto_open_threshold":3}}\n`);

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

  console.log(`✅ 총 ${allSlots.length}개 슬롯 발견\n`);

  // 4. 공개/비공개 슬롯 분리
  const availableSlots = allSlots.filter(slot => slot.is_available);
  const closedSlots = allSlots.filter(slot => !slot.is_available);

  console.log('4️⃣ 슬롯 상태 분석:');
  console.log(`   공개 슬롯: ${availableSlots.length}개`);
  console.log(`   비공개 슬롯: ${closedSlots.length}개\n`);

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
  console.log();

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

  console.log(`✅ 예약 건수: ${reservations.length}개\n`);

  // 7. 남은 슬롯 계산
  console.log('7️⃣ 남은 슬롯 계산:');
  const reservedSlotIds = new Set(reservations.map(r => r.slot_id));
  const remainingSlots = availableSlots.filter(slot => !reservedSlotIds.has(slot.id));

  console.log(`   공개 슬롯: ${availableSlots.length}개`);
  console.log(`   예약된 슬롯: ${reservedSlotIds.size}개`);
  console.log(`   남은 슬롯: ${remainingSlots.length}개`);
  console.log(`   임계값: 3개 (설정 기준)\n`);

  // 8. 자동 오픈 조건 체크
  console.log('8️⃣ 자동 오픈 조건 체크:');
  const threshold = 3;

  if (remainingSlots.length > threshold) {
    console.log(`   ❌ 조건 불충족: 남은 슬롯(${remainingSlots.length}개) > 임계값(${threshold}개)`);
    console.log('   → 자동 오픈이 실행되지 않습니다.\n');
  } else {
    console.log(`   ✅ 조건 충족: 남은 슬롯(${remainingSlots.length}개) ≤ 임계값(${threshold}개)`);
    console.log('   → 자동 오픈이 실행되어야 합니다.\n');

    // 9. 다음 오픈할 날짜 찾기
    console.log('9️⃣ 다음 오픈할 날짜 찾기:');

    const openedDates = [...new Set(availableSlots.map(slot => slot.date))].sort();
    const lastOpenedDate = openedDates[openedDates.length - 1];
    console.log(`   마지막 오픈 날짜: ${lastOpenedDate}`);

    const closedDates = [...new Set(closedSlots.map(slot => slot.date))].sort();
    console.log(`   비공개 날짜 목록: ${closedDates.join(', ')}`);

    const nextDate = closedDates.find(date => date > lastOpenedDate);

    if (!nextDate) {
      console.log('   ❌ 오픈할 다음 날짜가 없습니다.');
      console.log('   → 가능한 원인:');
      console.log('      1. 모든 비공개 슬롯의 날짜가 공개 슬롯보다 이르거나 같음');
      console.log('      2. 비공개 슬롯이 없음\n');
    } else {
      console.log(`   ✅ 다음 오픈 날짜: ${nextDate}`);

      const slotsToOpen = closedSlots.filter(slot => slot.date === nextDate);
      console.log(`   오픈할 슬롯: ${slotsToOpen.length}개\n`);

      console.log('🔍 오픈할 슬롯 상세:');
      slotsToOpen.forEach((slot, index) => {
        console.log(`   ${index + 1}. ID: ${slot.id}, 시간: ${slot.time}, 위치: ${slot.location}`);
      });
    }
  }

  // 10. 문제 진단
  console.log('\n📋 문제 진단 결과:\n');

  const issues = [];

  // localStorage 이슈 체크
  console.log('✓ 체크 1: localStorage 설정');
  console.log('  → 브라우저에서 수동 확인 필요');
  console.log('  → 관리자 페이지에서 Settings 탭의 임계값이 3으로 설정되어 있는지 확인');
  issues.push('localStorage 설정 확인 필요 (브라우저 개발자 도구)');

  // 날짜 조건 체크
  if (closedSlots.length > 0 && availableSlots.length > 0) {
    const lastOpenedDate = [...new Set(availableSlots.map(slot => slot.date))].sort().pop();
    const closedDates = [...new Set(closedSlots.map(slot => slot.date))].sort();
    const nextDate = closedDates.find(date => date > lastOpenedDate);

    console.log('\n✓ 체크 2: 날짜 조건');
    if (!nextDate) {
      console.log('  ❌ 비공개 슬롯의 날짜가 공개 슬롯보다 늦지 않음');
      console.log(`  → 마지막 공개 날짜: ${lastOpenedDate}`);
      console.log(`  → 비공개 날짜: ${closedDates.join(', ')}`);
      issues.push('비공개 슬롯의 날짜가 공개 슬롯보다 늦어야 함');
    } else {
      console.log(`  ✅ 날짜 조건 충족 (다음 날짜: ${nextDate})`);
    }
  }

  // 함수 호출 체크
  console.log('\n✓ 체크 3: 함수 호출');
  console.log('  → checkAndOpenNextSlots 함수가 예약 생성 시 호출되는지 확인');
  console.log('  → ConsultingContext.jsx:413-417 라인 확인');
  console.log('  → 브라우저 콘솔에서 "🔍 자동 슬롯 오픈 체크 시작" 로그 확인');
  issues.push('예약 생성 시 브라우저 콘솔 로그 확인 필요');

  // linked_seminar_id 체크
  console.log('\n✓ 체크 4: linked_seminar_id 일치');
  const wrongLinkedIds = allSlots.filter(slot => slot.linked_seminar_id !== campaign.id);
  if (wrongLinkedIds.length > 0) {
    console.log(`  ❌ ${wrongLinkedIds.length}개 슬롯의 linked_seminar_id가 캠페인 ID와 불일치`);
    issues.push(`${wrongLinkedIds.length}개 슬롯의 linked_seminar_id 수정 필요`);
  } else {
    console.log('  ✅ 모든 슬롯의 linked_seminar_id 일치');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎯 권장 조치:\n');

  if (issues.length === 0) {
    console.log('모든 조건이 정상입니다. 다음 예약 시 자동 오픈이 실행될 것입니다.');
  } else {
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  console.log('\n📝 추가 디버깅 방법:\n');
  console.log('1. 브라우저에서 새 예약 생성');
  console.log('2. 개발자 도구 콘솔 확인');
  console.log('3. "🔍 자동 슬롯 오픈 체크 시작" 로그가 보이는지 확인');
  console.log('4. 로그가 안 보이면 → checkAndOpenNextSlots 함수가 호출되지 않는 것');
  console.log('5. 로그가 보이면 → 로그 내용을 보고 어느 단계에서 멈췄는지 확인\n');
}

debugGwanggyoCampaign().catch(console.error);
