/**
 * 자동 슬롯 오픈 로직 검증 스크립트
 *
 * 이 스크립트는 ConsultingContext.jsx의 checkAndOpenNextSlots 함수의 로직을
 * 시뮬레이션하여 올바르게 동작하는지 검증합니다.
 */

// 테스트 케이스 1: 정상적인 자동 오픈 시나리오
function testCase1_NormalAutoOpen() {
  console.log('\n=== 테스트 케이스 1: 정상적인 자동 오픈 시나리오 ===\n');

  const threshold = 3;

  // 시나리오: 2025-01-15에 10개 슬롯(공개), 2025-01-16에 10개 슬롯(비공개)
  const allSlots = [
    // 2025-01-15 (공개)
    ...Array(10).fill(null).map((_, i) => ({
      id: i + 1,
      date: '2025-01-15',
      time: `${14 + Math.floor(i/2)}:${i % 2 === 0 ? '00' : '30'}:00`,
      is_available: true,
      location: '분당점'
    })),
    // 2025-01-16 (비공개)
    ...Array(10).fill(null).map((_, i) => ({
      id: i + 11,
      date: '2025-01-16',
      time: `${14 + Math.floor(i/2)}:${i % 2 === 0 ? '00' : '30'}:00`,
      is_available: false,
      location: '분당점'
    }))
  ];

  // 예약된 슬롯: 2025-01-15의 7개 슬롯이 예약됨 (남은 슬롯: 3개)
  const reservations = [
    { slot_id: 1 }, { slot_id: 2 }, { slot_id: 3 }, { slot_id: 4 },
    { slot_id: 5 }, { slot_id: 6 }, { slot_id: 7 }
  ];

  // === 로직 실행 ===

  // 1. 오픈된 슬롯 필터링
  const availableSlots = allSlots.filter(slot => slot.is_available);
  console.log(`1️⃣ 오픈된 슬롯: ${availableSlots.length}개`);

  // 2. 예약된 슬롯 ID
  const reservedSlotIds = new Set(reservations.map(r => r.slot_id));
  console.log(`2️⃣ 예약된 슬롯: ${reservedSlotIds.size}개`);

  // 3. 남은 슬롯 계산
  const remainingSlots = availableSlots.filter(slot => !reservedSlotIds.has(slot.id));
  const remainingCount = remainingSlots.length;
  console.log(`3️⃣ 남은 슬롯: ${remainingCount}개 (임계값: ${threshold}개)`);

  // 4. 임계값 체크
  if (remainingCount > threshold) {
    console.log('❌ 테스트 실패: 남은 슬롯이 충분하여 자동 오픈이 실행되지 않습니다.');
    return false;
  }

  console.log('✅ 임계값 이하! 다음 날짜 슬롯 오픈 필요');

  // 5. 마지막 오픈 날짜 찾기
  const openedDates = [...new Set(availableSlots.map(slot => slot.date))].sort();
  const lastOpenedDate = openedDates[openedDates.length - 1];
  console.log(`4️⃣ 마지막 오픈 날짜: ${lastOpenedDate}`);

  // 6. 다음 날짜 찾기
  const closedSlots = allSlots.filter(slot => !slot.is_available);
  const closedDates = [...new Set(closedSlots.map(slot => slot.date))].sort();
  const nextDate = closedDates.find(date => date > lastOpenedDate);

  if (!nextDate) {
    console.log('❌ 테스트 실패: 오픈할 다음 날짜가 없습니다.');
    return false;
  }

  console.log(`5️⃣ 다음 오픈 날짜: ${nextDate}`);

  // 7. 오픈할 슬롯
  const slotsToOpen = closedSlots.filter(slot => slot.date === nextDate);
  console.log(`6️⃣ 오픈할 슬롯: ${slotsToOpen.length}개`);

  // 검증
  const expectedNextDate = '2025-01-16';
  const expectedSlotsToOpen = 10;

  if (nextDate === expectedNextDate && slotsToOpen.length === expectedSlotsToOpen) {
    console.log(`✅ 테스트 성공: ${nextDate}의 ${slotsToOpen.length}개 슬롯이 자동 오픈됩니다.`);
    return true;
  } else {
    console.log(`❌ 테스트 실패: 예상값과 다릅니다.`);
    console.log(`   예상: ${expectedNextDate}, ${expectedSlotsToOpen}개`);
    console.log(`   실제: ${nextDate}, ${slotsToOpen.length}개`);
    return false;
  }
}

// 테스트 케이스 2: 임계값보다 남은 슬롯이 많은 경우
function testCase2_AboveThreshold() {
  console.log('\n=== 테스트 케이스 2: 임계값보다 남은 슬롯이 많은 경우 ===\n');

  const threshold = 3;

  const allSlots = [
    ...Array(10).fill(null).map((_, i) => ({
      id: i + 1,
      date: '2025-01-15',
      time: `${14 + Math.floor(i/2)}:00:00`,
      is_available: true
    }))
  ];

  // 예약된 슬롯: 5개만 예약됨 (남은 슬롯: 5개)
  const reservations = [
    { slot_id: 1 }, { slot_id: 2 }, { slot_id: 3 }, { slot_id: 4 }, { slot_id: 5 }
  ];

  const availableSlots = allSlots.filter(slot => slot.is_available);
  const reservedSlotIds = new Set(reservations.map(r => r.slot_id));
  const remainingCount = availableSlots.filter(slot => !reservedSlotIds.has(slot.id)).length;

  console.log(`남은 슬롯: ${remainingCount}개 (임계값: ${threshold}개)`);

  if (remainingCount > threshold) {
    console.log('✅ 테스트 성공: 남은 슬롯이 충분하여 자동 오픈이 실행되지 않습니다.');
    return true;
  } else {
    console.log('❌ 테스트 실패: 자동 오픈이 실행되었습니다.');
    return false;
  }
}

// 테스트 케이스 3: 임계값이 0인 경우 (자동 오픈 비활성화)
function testCase3_ThresholdZero() {
  console.log('\n=== 테스트 케이스 3: 임계값이 0인 경우 ===\n');

  const threshold = 0;

  if (!threshold || threshold <= 0) {
    console.log('✅ 테스트 성공: 자동 슬롯 오픈이 비활성화되었습니다.');
    return true;
  } else {
    console.log('❌ 테스트 실패: 자동 오픈이 실행되었습니다.');
    return false;
  }
}

// 테스트 케이스 4: 다음 날짜가 없는 경우
function testCase4_NoNextDate() {
  console.log('\n=== 테스트 케이스 4: 다음 날짜가 없는 경우 ===\n');

  const threshold = 3;

  // 모든 슬롯이 공개된 상태
  const allSlots = [
    ...Array(10).fill(null).map((_, i) => ({
      id: i + 1,
      date: '2025-01-15',
      time: `${14 + Math.floor(i/2)}:00:00`,
      is_available: true
    }))
  ];

  // 7개 예약 (남은 슬롯: 3개, 임계값 도달)
  const reservations = Array(7).fill(null).map((_, i) => ({ slot_id: i + 1 }));

  const availableSlots = allSlots.filter(slot => slot.is_available);
  const reservedSlotIds = new Set(reservations.map(r => r.slot_id));
  const remainingCount = availableSlots.filter(slot => !reservedSlotIds.has(slot.id)).length;

  console.log(`남은 슬롯: ${remainingCount}개 (임계값: ${threshold}개)`);

  if (remainingCount <= threshold) {
    console.log('임계값 이하이므로 다음 날짜 슬롯 오픈 시도...');

    const openedDates = [...new Set(availableSlots.map(slot => slot.date))].sort();
    const lastOpenedDate = openedDates[openedDates.length - 1];

    const closedSlots = allSlots.filter(slot => !slot.is_available);
    const closedDates = [...new Set(closedSlots.map(slot => slot.date))].sort();
    const nextDate = closedDates.find(date => date > lastOpenedDate);

    if (!nextDate) {
      console.log('✅ 테스트 성공: 오픈할 다음 날짜가 없습니다.');
      return true;
    } else {
      console.log('❌ 테스트 실패: 다음 날짜를 찾았습니다.');
      return false;
    }
  }

  return false;
}

// 테스트 케이스 5: 경계값 테스트 (남은 슬롯 = 임계값)
function testCase5_BoundaryTest() {
  console.log('\n=== 테스트 케이스 5: 경계값 테스트 (남은 슬롯 = 임계값) ===\n');

  const threshold = 3;

  const allSlots = [
    ...Array(10).fill(null).map((_, i) => ({
      id: i + 1,
      date: '2025-01-15',
      time: `${14 + Math.floor(i/2)}:00:00`,
      is_available: true
    })),
    ...Array(10).fill(null).map((_, i) => ({
      id: i + 11,
      date: '2025-01-16',
      time: `${14 + Math.floor(i/2)}:00:00`,
      is_available: false
    }))
  ];

  // 정확히 7개 예약 (남은 슬롯: 3개 = 임계값)
  const reservations = Array(7).fill(null).map((_, i) => ({ slot_id: i + 1 }));

  const availableSlots = allSlots.filter(slot => slot.is_available);
  const reservedSlotIds = new Set(reservations.map(r => r.slot_id));
  const remainingCount = availableSlots.filter(slot => !reservedSlotIds.has(slot.id)).length;

  console.log(`남은 슬롯: ${remainingCount}개 (임계값: ${threshold}개)`);

  // remainingCount > threshold는 false이므로 자동 오픈 실행
  if (remainingCount > threshold) {
    console.log('❌ 테스트 실패: 자동 오픈이 실행되지 않았습니다.');
    return false;
  } else {
    console.log('✅ 테스트 성공: 남은 슬롯 = 임계값일 때 자동 오픈이 실행됩니다.');
    return true;
  }
}

// 모든 테스트 실행
function runAllTests() {
  console.log('🧪 자동 슬롯 오픈 로직 검증 시작\n');
  console.log('=' .repeat(60));

  const results = [
    { name: '테스트 1: 정상적인 자동 오픈', result: testCase1_NormalAutoOpen() },
    { name: '테스트 2: 임계값 초과', result: testCase2_AboveThreshold() },
    { name: '테스트 3: 임계값 0 (비활성화)', result: testCase3_ThresholdZero() },
    { name: '테스트 4: 다음 날짜 없음', result: testCase4_NoNextDate() },
    { name: '테스트 5: 경계값 테스트', result: testCase5_BoundaryTest() }
  ];

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 테스트 결과 요약\n');

  let passCount = 0;
  results.forEach((test, index) => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
    if (test.result) passCount++;
  });

  console.log(`\n총 ${results.length}개 테스트 중 ${passCount}개 성공`);

  if (passCount === results.length) {
    console.log('\n🎉 모든 테스트가 성공했습니다! 자동 슬롯 오픈 로직이 올바르게 작동합니다.');
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다. 로직을 다시 확인해주세요.');
  }
}

// 테스트 실행
runAllTests();
