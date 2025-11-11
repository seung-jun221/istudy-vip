/**
 * 광교 캠페인 예약 데이터 불일치 디버깅
 *
 * 문제: Admin 페이지에서는 10명으로 표시되지만,
 *       실제 예약 화면에서는 11석이 예약되어 있음
 *       특히 11/17 20:30 타임에 불일치 발생
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugDataMismatch() {
  console.log('🔍 광교 캠페인 데이터 불일치 디버깅 시작\n');
  console.log('=' .repeat(60));

  // 1. 광교 캠페인 찾기
  console.log('\n1️⃣ 광교 캠페인 조회...');
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .ilike('location', '%광교%');

  if (campaignError || !campaigns?.[0]) {
    console.error('❌ 캠페인 조회 실패:', campaignError);
    return;
  }

  const campaign = campaigns[0];
  console.log('✅ 캠페인 ID:', campaign.id);
  console.log('   위치:', campaign.location);
  console.log('   상태:', campaign.status);

  // 2. 모든 컨설팅 예약 조회 (상태별로)
  console.log('\n2️⃣ 컨설팅 예약 조회 (상태별)...');

  const { data: allReservations, error: allResError } = await supabase
    .from('consulting_reservations')
    .select('id, slot_id, student_name, parent_phone, status, created_at')
    .eq('linked_seminar_id', campaign.id)
    .order('created_at', { ascending: false });

  if (allResError) {
    console.error('❌ 예약 조회 실패:', allResError);
    return;
  }

  const statusCount = {
    confirmed: 0,
    cancelled: 0,
    auto_cancelled: 0,
    other: 0
  };

  allReservations.forEach(res => {
    if (res.status === 'confirmed') statusCount.confirmed++;
    else if (res.status === 'cancelled') statusCount.cancelled++;
    else if (res.status === 'auto_cancelled') statusCount.auto_cancelled++;
    else statusCount.other++;
  });

  console.log('📊 예약 상태 통계:');
  console.log(`   전체: ${allReservations.length}개`);
  console.log(`   - confirmed: ${statusCount.confirmed}개`);
  console.log(`   - cancelled: ${statusCount.cancelled}개`);
  console.log(`   - auto_cancelled: ${statusCount.auto_cancelled}개`);
  console.log(`   - 기타: ${statusCount.other}개`);

  // 3. Admin 페이지 로직: cancelled 제외
  const adminReservations = allReservations.filter(
    res => res.status !== 'cancelled' && res.status !== 'auto_cancelled'
  );
  console.log('\n📋 Admin 페이지 표시 (cancelled 제외):');
  console.log(`   ${adminReservations.length}개 예약`);

  // 4. 예약자 화면 로직 확인 (시간대별 슬롯 체크)
  console.log('\n3️⃣ 11/17 20:30 타임 슬롯 상세 조회...');

  const targetDate = '2025-11-17';
  const targetTime = '20:30:00';

  // 해당 시간의 슬롯 찾기
  const { data: targetSlot, error: slotError } = await supabase
    .from('consulting_slots')
    .select('*')
    .eq('linked_seminar_id', campaign.id)
    .eq('date', targetDate)
    .eq('time', targetTime)
    .single();

  if (slotError) {
    console.log('⚠️ 해당 슬롯을 찾을 수 없습니다:', slotError.message);

    // 비슷한 시간대 슬롯 찾기
    console.log('\n📅 11/17의 모든 슬롯 조회...');
    const { data: dateSlots } = await supabase
      .from('consulting_slots')
      .select('*')
      .eq('linked_seminar_id', campaign.id)
      .eq('date', targetDate)
      .order('time');

    if (dateSlots && dateSlots.length > 0) {
      console.log(`✅ 11/17에 ${dateSlots.length}개 슬롯 발견:`);
      dateSlots.forEach(slot => {
        console.log(`   - ${slot.time} (ID: ${slot.id})`);
        console.log(`     상태: ${slot.is_available ? '공개' : '비공개'}`);
        console.log(`     예약/정원: ${slot.current_bookings}/${slot.max_capacity}`);
      });
    }
  } else {
    console.log('✅ 슬롯 정보:');
    console.log(`   ID: ${targetSlot.id}`);
    console.log(`   날짜: ${targetSlot.date}`);
    console.log(`   시간: ${targetSlot.time}`);
    console.log(`   위치: ${targetSlot.location}`);
    console.log(`   공개 여부: ${targetSlot.is_available ? '공개' : '비공개'}`);
    console.log(`   현재 예약: ${targetSlot.current_bookings}명`);
    console.log(`   최대 정원: ${targetSlot.max_capacity}명`);

    // 해당 슬롯의 실제 예약 조회
    console.log('\n4️⃣ 해당 슬롯의 실제 예약 조회...');
    const slotReservations = allReservations.filter(res => res.slot_id === targetSlot.id);

    console.log(`📋 slot_id = ${targetSlot.id}인 예약:`)
    console.log(`   전체: ${slotReservations.length}개`);

    slotReservations.forEach((res, idx) => {
      console.log(`\n   [${idx + 1}] 예약 ID: ${res.id}`);
      console.log(`       학생명: ${res.student_name}`);
      console.log(`       연락처: ${res.parent_phone}`);
      console.log(`       상태: ${res.status}`);
      console.log(`       생성일: ${res.created_at}`);
    });

    const activeReservations = slotReservations.filter(
      res => res.status !== 'cancelled' && res.status !== 'auto_cancelled'
    );

    console.log(`\n   ✅ 유효한 예약 (cancelled 제외): ${activeReservations.length}개`);
    console.log(`   ⚠️ 슬롯의 current_bookings: ${targetSlot.current_bookings}명`);

    if (activeReservations.length !== targetSlot.current_bookings) {
      console.log('\n   🚨 불일치 발견!');
      console.log(`      실제 유효 예약: ${activeReservations.length}개`);
      console.log(`      슬롯 current_bookings: ${targetSlot.current_bookings}명`);
      console.log(`      차이: ${Math.abs(activeReservations.length - targetSlot.current_bookings)}개`);
    }
  }

  // 5. 모든 슬롯의 current_bookings vs 실제 예약 수 비교
  console.log('\n5️⃣ 모든 슬롯의 데이터 정합성 검사...');

  const { data: allSlots, error: allSlotsError } = await supabase
    .from('consulting_slots')
    .select('*')
    .eq('linked_seminar_id', campaign.id)
    .order('date')
    .order('time');

  if (allSlotsError) {
    console.error('❌ 슬롯 조회 실패:', allSlotsError);
    return;
  }

  console.log(`\n📊 전체 ${allSlots.length}개 슬롯 검사 중...\n`);

  const mismatches = [];

  for (const slot of allSlots) {
    const slotReservations = allReservations.filter(res => res.slot_id === slot.id);
    const activeCount = slotReservations.filter(
      res => res.status !== 'cancelled' && res.status !== 'auto_cancelled'
    ).length;

    if (activeCount !== slot.current_bookings) {
      mismatches.push({
        slotId: slot.id,
        date: slot.date,
        time: slot.time,
        currentBookings: slot.current_bookings,
        actualBookings: activeCount,
        diff: Math.abs(activeCount - slot.current_bookings)
      });
    }
  }

  if (mismatches.length === 0) {
    console.log('✅ 모든 슬롯의 데이터가 정확합니다!');
  } else {
    console.log(`🚨 ${mismatches.length}개 슬롯에서 불일치 발견:\n`);

    mismatches.forEach((mismatch, idx) => {
      console.log(`${idx + 1}. 슬롯 ID: ${mismatch.slotId}`);
      console.log(`   날짜/시간: ${mismatch.date} ${mismatch.time}`);
      console.log(`   current_bookings: ${mismatch.currentBookings}명`);
      console.log(`   실제 유효 예약: ${mismatch.actualBookings}명`);
      console.log(`   차이: ${mismatch.diff}개`);
      console.log('');
    });
  }

  // 6. 예약자 화면 로직 추적
  console.log('\n6️⃣ 예약자 화면 로직 분석...');
  console.log('예약자 화면에서 슬롯 마감 판단 로직:');
  console.log('```javascript');
  console.log('const isAvailable = slot.current_bookings < slot.max_capacity;');
  console.log('```');
  console.log('\nAdmin 페이지에서 예약 카운트 로직:');
  console.log('```javascript');
  console.log("const { data } = await supabase.from('consulting_reservations')");
  console.log("  .select('*')");
  console.log("  .eq('linked_seminar_id', campaignId)");
  console.log("  .not('status', 'in', '(cancelled,auto_cancelled)');");
  console.log('```');

  console.log('\n🔍 불일치 원인 추정:');
  if (mismatches.length > 0) {
    console.log('1. current_bookings 값이 실제 예약 수와 동기화되지 않음');
    console.log('2. 예약 생성/취소 시 current_bookings 업데이트 로직에 문제가 있을 수 있음');
    console.log('3. RPC 함수 (create_consulting_reservation) 확인 필요');
  }

  // 7. 해결 방법 제시
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 해결 방법:\n');

  if (mismatches.length > 0) {
    console.log('Option 1: current_bookings 재계산 및 업데이트');
    console.log('Option 2: RPC 함수의 트리거 로직 수정');
    console.log('Option 3: 예약 생성/취소 시 current_bookings 동기화 강화');

    console.log('\n🔧 즉시 수정 스크립트 (Option 1):');
    console.log('\n```sql');
    console.log('-- 모든 슬롯의 current_bookings를 실제 예약 수로 재계산');
    console.log('UPDATE consulting_slots cs');
    console.log('SET current_bookings = (');
    console.log('  SELECT COUNT(*)');
    console.log('  FROM consulting_reservations cr');
    console.log('  WHERE cr.slot_id = cs.id');
    console.log("    AND cr.status NOT IN ('cancelled', 'auto_cancelled')");
    console.log(')');
    console.log(`WHERE cs.linked_seminar_id = '${campaign.id}';`);
    console.log('```');
  }

  return {
    campaign,
    totalReservations: allReservations.length,
    adminCount: adminReservations.length,
    mismatches,
    hasMismatch: mismatches.length > 0
  };
}

debugDataMismatch()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('\n📝 요약:\n');
    if (result) {
      console.log(`캠페인: ${result.campaign.location}`);
      console.log(`전체 예약: ${result.totalReservations}개`);
      console.log(`Admin 표시: ${result.adminCount}개`);
      console.log(`불일치 슬롯: ${result.mismatches.length}개`);

      if (result.hasMismatch) {
        console.log('\n⚠️ 데이터 정합성 문제가 발견되었습니다!');
      } else {
        console.log('\n✅ 데이터 정합성에 문제가 없습니다.');
      }
    }
  })
  .catch(console.error);
