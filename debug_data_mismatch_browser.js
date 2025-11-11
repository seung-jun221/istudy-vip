/**
 * 브라우저 콘솔에서 실행: 광교 캠페인 데이터 불일치 디버깅
 *
 * 사용 방법:
 * 1. Admin 페이지에서 F12 (개발자 도구)
 * 2. Console 탭
 * 3. 이 파일 내용 복사 & 붙여넣기
 */

(async function debugDataMismatch() {
  console.log('🔍 광교 캠페인 데이터 불일치 디버깅\n');
  console.log('='.repeat(60));

  const { createClient } = supabase;
  const client = createClient(
    'https://xooglumwuzctbcjtcvnd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2dsdW13dXpjdGJjanRjdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTk5OTgsImV4cCI6MjA3MTE3NTk5OH0.Uza-Z3CzwQgkYKJmKdwTNCAYgaxeKFs__2udUSAGpJg'
  );

  // 1. 광교 캠페인 찾기
  console.log('\n1️⃣ 광교 캠페인 조회...');
  const { data: campaigns } = await client
    .from('campaigns')
    .select('*')
    .ilike('location', '%광교%');

  if (!campaigns?.[0]) {
    console.error('❌ 광교 캠페인을 찾을 수 없습니다.');
    return;
  }

  const campaign = campaigns[0];
  console.log('✅ 캠페인:', campaign.location);
  console.log('   ID:', campaign.id);

  // 2. 모든 예약 조회
  console.log('\n2️⃣ 모든 컨설팅 예약 조회...');
  const { data: allReservations } = await client
    .from('consulting_reservations')
    .select('id, slot_id, student_name, parent_phone, status, created_at')
    .eq('linked_seminar_id', campaign.id)
    .order('created_at', { ascending: false });

  console.log(`✅ 전체 예약: ${allReservations.length}개`);

  // 상태별 카운트
  const byStatus = {
    confirmed: allReservations.filter(r => r.status === 'confirmed').length,
    cancelled: allReservations.filter(r => r.status === 'cancelled').length,
    auto_cancelled: allReservations.filter(r => r.status === 'auto_cancelled').length,
    other: allReservations.filter(r => !['confirmed', 'cancelled', 'auto_cancelled'].includes(r.status)).length
  };

  console.log('   상태별:');
  console.log(`   - confirmed: ${byStatus.confirmed}개`);
  console.log(`   - cancelled: ${byStatus.cancelled}개`);
  console.log(`   - auto_cancelled: ${byStatus.auto_cancelled}개`);
  console.log(`   - 기타: ${byStatus.other}개`);

  // 3. Admin 페이지 카운트 (취소 제외)
  const adminCount = allReservations.filter(
    r => r.status !== 'cancelled' && r.status !== 'auto_cancelled'
  ).length;

  console.log(`\n📋 Admin 페이지 표시: ${adminCount}개 (cancelled 제외)`);

  // 4. 11/17 20:30 슬롯 조회
  console.log('\n3️⃣ 11/17 20:30 슬롯 조회...');
  const { data: targetSlot } = await client
    .from('consulting_slots')
    .select('*')
    .eq('linked_seminar_id', campaign.id)
    .eq('date', '2025-11-17')
    .eq('time', '20:30:00')
    .maybeSingle();

  if (!targetSlot) {
    console.log('⚠️ 11/17 20:30 슬롯을 찾을 수 없습니다.');

    // 11/17의 모든 슬롯 조회
    const { data: dateSlots } = await client
      .from('consulting_slots')
      .select('*')
      .eq('linked_seminar_id', campaign.id)
      .eq('date', '2025-11-17')
      .order('time');

    if (dateSlots?.length) {
      console.log(`\n📅 11/17의 슬롯 목록 (${dateSlots.length}개):`);
      dateSlots.forEach(slot => {
        console.log(`   ${slot.time.slice(0, 5)} - ID: ${slot.id}, 예약: ${slot.current_bookings}/${slot.max_capacity}`);
      });
    }
  } else {
    console.log('✅ 슬롯 발견:');
    console.log(`   ID: ${targetSlot.id}`);
    console.log(`   시간: ${targetSlot.time}`);
    console.log(`   current_bookings: ${targetSlot.current_bookings}명`);
    console.log(`   max_capacity: ${targetSlot.max_capacity}명`);
    console.log(`   is_available: ${targetSlot.is_available}`);

    // 해당 슬롯의 실제 예약 조회
    const slotReservations = allReservations.filter(r => r.slot_id === targetSlot.id);
    const activeReservations = slotReservations.filter(
      r => r.status !== 'cancelled' && r.status !== 'auto_cancelled'
    );

    console.log(`\n   📊 해당 슬롯의 예약:`);
    console.log(`   - 전체: ${slotReservations.length}개`);
    console.log(`   - 유효 (cancelled 제외): ${activeReservations.length}개`);
    console.log(`   - current_bookings: ${targetSlot.current_bookings}명`);

    if (activeReservations.length !== targetSlot.current_bookings) {
      console.log(`\n   🚨 불일치 발견!`);
      console.log(`      실제 유효 예약: ${activeReservations.length}개`);
      console.log(`      슬롯 current_bookings: ${targetSlot.current_bookings}명`);
      console.log(`      차이: ${Math.abs(activeReservations.length - targetSlot.current_bookings)}개`);
    } else {
      console.log(`\n   ✅ 데이터 일치`);
    }

    if (slotReservations.length > 0) {
      console.log(`\n   예약 상세:`);
      slotReservations.forEach((res, idx) => {
        const statusEmoji = res.status === 'confirmed' ? '✅' :
                           res.status === 'cancelled' ? '❌' :
                           res.status === 'auto_cancelled' ? '🚫' : '❓';
        console.log(`   ${idx + 1}. ${statusEmoji} ${res.student_name} (${res.parent_phone}) - ${res.status}`);
      });
    }
  }

  // 5. 모든 슬롯 검사
  console.log('\n4️⃣ 모든 슬롯 데이터 정합성 검사...');
  const { data: allSlots } = await client
    .from('consulting_slots')
    .select('*')
    .eq('linked_seminar_id', campaign.id)
    .order('date')
    .order('time');

  const mismatches = [];

  allSlots.forEach(slot => {
    const slotReservations = allReservations.filter(r => r.slot_id === slot.id);
    const activeCount = slotReservations.filter(
      r => r.status !== 'cancelled' && r.status !== 'auto_cancelled'
    ).length;

    if (activeCount !== slot.current_bookings) {
      mismatches.push({
        slotId: slot.id,
        date: slot.date,
        time: slot.time.slice(0, 5),
        currentBookings: slot.current_bookings,
        actualActive: activeCount,
        totalReservations: slotReservations.length,
        diff: activeCount - slot.current_bookings
      });
    }
  });

  console.log(`\n검사 완료: ${allSlots.length}개 슬롯 중 ${mismatches.length}개 불일치 발견`);

  if (mismatches.length > 0) {
    console.log('\n🚨 불일치 슬롯 목록:\n');
    mismatches.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.date} ${m.time} (슬롯 ID: ${m.slotId})`);
      console.log(`   current_bookings: ${m.currentBookings}명`);
      console.log(`   실제 유효 예약: ${m.actualActive}명`);
      console.log(`   전체 예약 (취소 포함): ${m.totalReservations}개`);
      console.log(`   차이: ${m.diff > 0 ? '+' : ''}${m.diff}개\n`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 원인 분석:\n');
    console.log('1. 예약자 화면은 slot.current_bookings 값으로 마감 여부 판단');
    console.log('2. Admin 페이지는 실제 DB 쿼리로 유효 예약 수 계산');
    console.log('3. current_bookings와 실제 예약 수가 동기화되지 않음');
    console.log('\n가능한 원인:');
    console.log('- 예약 취소 시 current_bookings 감소 안 됨');
    console.log('- 예약 생성 시 current_bookings 증가 안 됨');
    console.log('- RPC 함수의 트리거 로직 문제');

    console.log('\n' + '='.repeat(60));
    console.log('\n🔧 해결 방법: current_bookings 재계산\n');
    console.log('다음 SQL을 실행하여 모든 슬롯의 current_bookings를 재계산할 수 있습니다:\n');
    console.log('```sql');
    console.log('UPDATE consulting_slots cs');
    console.log('SET current_bookings = (');
    console.log('  SELECT COUNT(*)');
    console.log('  FROM consulting_reservations cr');
    console.log('  WHERE cr.slot_id = cs.id');
    console.log("    AND cr.status NOT IN ('cancelled', 'auto_cancelled')");
    console.log(')');
    console.log(`WHERE cs.linked_seminar_id = '${campaign.id}';`);
    console.log('```');

    // 브라우저에서 직접 수정할 수 있는 스크립트 제공
    console.log('\n또는 브라우저에서 즉시 수정:\n');
    console.log('// 아래 코드를 콘솔에 붙여넣어 실행하세요');
    console.log('(async () => {');
    console.log('  const mismatches = ' + JSON.stringify(mismatches, null, 2) + ';');
    console.log('  for (const m of mismatches) {');
    console.log('    const { error } = await client');
    console.log('      .from("consulting_slots")');
    console.log('      .update({ current_bookings: m.actualActive })');
    console.log('      .eq("id", m.slotId);');
    console.log('    if (error) console.error("수정 실패:", m.slotId, error);');
    console.log('    else console.log("✅ 수정 완료:", m.date, m.time);');
    console.log('  }');
    console.log('  console.log("🎉 모든 슬롯 수정 완료!");');
    console.log('  location.reload();');
    console.log('})();');

  } else {
    console.log('\n✅ 모든 슬롯의 데이터가 정확합니다!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 최종 요약:\n');
  console.log(`캠페인: ${campaign.location}`);
  console.log(`전체 예약: ${allReservations.length}개`);
  console.log(`유효 예약 (Admin 표시): ${adminCount}개`);
  console.log(`불일치 슬롯: ${mismatches.length}개`);

  return { campaign, allReservations, adminCount, mismatches };
})();
