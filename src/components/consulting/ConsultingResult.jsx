// src/components/consulting/ConsultingResult.jsx
import { useEffect, useState } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase } from '../../utils/supabase';

export default function ConsultingResult({
  reservation,
  onBack,
  onHome,
  onStartTestReservation,
}) {
  const { showToast, setLoading, loadTestMethod, refreshTestTimeSlots } =
    useConsulting();

  // 진단검사 관련 state
  const [testMethod, setTestMethod] = useState(null); // 'onsite' or 'home'
  const [testReservation, setTestReservation] = useState(null); // 역삼점 진단검사 예약
  const [testApplication, setTestApplication] = useState(null); // 대치점 시험지 다운로드
  const [loadingTest, setLoadingTest] = useState(true);

  // 예약 정보
  const slot = reservation.consulting_slots;
  const location = slot.location;
  const dateObj = new Date(slot.date);
  const dateStr = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[dateObj.getDay()];
  const timeStr = slot.time.slice(0, 5);

  // 예약번호 (UUID 앞 8자리)
  const reservationId = reservation.id
    ? reservation.id.slice(0, 8).toUpperCase()
    : '-';

  // ========================================
  // 진단검사 정보 로드
  // ========================================
  useEffect(() => {
    console.log('🔄 ConsultingResult 마운트 - 진단검사 정보 로드');
    loadTestInfo();

    return () => {
      console.log('🔄 ConsultingResult 언마운트');
    };
  }, [reservation.id, location]);

  const loadTestInfo = async () => {
    console.log('📊 진단검사 정보 로딩 시작...');
    setLoadingTest(true);

    try {
      // 1) 지역별 진단검사 방식 확인
      const method = await loadTestMethod(location);
      console.log('✅ 진단검사 방식:', method);
      setTestMethod(method);

      // 2) 역삼점: 진단검사 예약 확인
      if (method === 'onsite') {
        console.log('🔍 역삼점 - 진단검사 예약 조회 중...');
        console.log('조회 조건:', {
          consulting_reservation_id: reservation.id,
        });

        const { data: testRes, error: testError } = await supabase
          .from('test_reservations')
          .select('*')
          .eq('consulting_reservation_id', reservation.id)
          .in('status', ['예약', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('진단검사 예약 결과:', testRes);
        console.log('에러:', testError);

        if (testError) {
          console.error('진단검사 예약 조회 실패:', testError);
        }

        const testReservation =
          testRes && testRes.length > 0 ? testRes[0] : null;

        // test_slots 형식으로 변환 (기존 코드 호환성)
        if (testReservation) {
          testReservation.test_slots = {
            location: testReservation.location,
            date: testReservation.test_date,
            time: testReservation.test_time,
            id: testReservation.slot_id,
          };
        }

        setTestReservation(testReservation);
      }

      // 3) 대치점: 시험지 다운로드 확인
      else if (method === 'home') {
        console.log('🔍 대치점 - 시험지 다운로드 조회 중...');
        const { data: testApp, error: appError } = await supabase
          .from('test_applications')
          .select('*')
          .eq('parent_phone', reservation.parent_phone)
          .not('downloaded_at', 'is', null)
          .order('downloaded_at', { ascending: false })
          .limit(1);

        console.log('시험지 다운로드 결과:', testApp);

        if (appError && appError.code !== 'PGRST116') {
          console.error('시험지 다운로드 조회 실패:', appError);
        }

        setTestApplication(testApp?.[0] || null);
      }

      console.log('✅ 진단검사 정보 로딩 완료');
    } catch (error) {
      console.error('❌ 진단검사 정보 로드 실패:', error);
    } finally {
      setLoadingTest(false);
    }
  };

  // ========================================
  // 컨설팅 취소 (진단검사도 자동 취소)
  // ========================================
  const handleCancelConsulting = async () => {
    // 진단검사 예약이 있는 경우 추가 경고
    const confirmMessage = testReservation
      ? '정말로 컨설팅 예약을 취소하시겠습니까?\n\n⚠️ 진단검사 예약도 함께 취소됩니다.\n취소 후에는 복구할 수 없습니다.'
      : '정말로 예약을 취소하시겠습니까?\n취소 후에는 복구할 수 없습니다.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 취소 프로세스 시작');
      console.log('예약 ID:', reservation.id);
      console.log('진단검사 예약:', testReservation);

      // 1) 역삼점: 진단검사 예약도 함께 취소 (예약이 있는 경우에만)
      if (testReservation && testReservation.id) {
        try {
          console.log('🗑️ 진단검사 취소 시도:', testReservation.id);

          // ✅ RPC 함수 사용 (슬롯 감소 포함)
          const { data: cancelData, error: cancelError } = await supabase.rpc(
            'cancel_test_reservation',
            {
              reservation_id: testReservation.id,
            }
          );

          console.log('진단검사 취소 결과:', { cancelData, cancelError });

          if (cancelError) {
            console.error('⚠️ 진단검사 취소 실패:', cancelError);
            // 에러가 나도 컨설팅 취소는 계속 진행
          } else if (cancelData && !cancelData.success) {
            console.warn('⚠️ 진단검사 취소 경고:', cancelData.message);
          } else {
            console.log('✅ 진단검사 취소 성공');
          }
        } catch (rpcError) {
          console.error('⚠️ 진단검사 취소 중 오류:', rpcError);
          // 에러가 나도 컨설팅 취소는 계속 진행
        }
      }

      // 2) 컨설팅 예약 취소
      console.log('💾 컨설팅 예약 취소 시도:', reservation.id);

      const { data: cancelData, error: consultingError } = await supabase
        .from('consulting_reservations')
        .update({
          status: 'cancelled',
        })
        .eq('id', reservation.id)
        .select();

      console.log('✅ 컨설팅 취소 결과:', { cancelData, consultingError });

      if (consultingError) {
        console.error('❌ 컨설팅 취소 오류:', consultingError);
        console.error('에러 상세:', {
          message: consultingError.message,
          code: consultingError.code,
          details: consultingError.details,
          hint: consultingError.hint,
        });
        throw new Error(`컨설팅 취소 실패: ${consultingError.message}`);
      }

      // 3) current_bookings 감소
      console.log('📊 슬롯 업데이트 시도:', reservation.slot_id);

      const { data: updateData, error: updateError } = await supabase.rpc(
        'decrement_bookings',
        {
          slot_uuid: reservation.slot_id,
        }
      );

      console.log('슬롯 업데이트 결과:', { updateData, updateError });

      // RPC 실패 시 대체 방법
      if (updateError) {
        console.warn('⚠️ RPC 실패, 대체 방법 사용:', updateError);

        const { data: slotData } = await supabase
          .from('consulting_slots')
          .select('current_bookings')
          .eq('id', reservation.slot_id)
          .single();

        if (slotData) {
          const newCount = Math.max((slotData.current_bookings || 1) - 1, 0);
          const { data: altData, error: altError } = await supabase
            .from('consulting_slots')
            .update({ current_bookings: newCount })
            .eq('id', reservation.slot_id)
            .select();

          console.log('대체 방법 결과:', { altData, altError });

          if (altError) {
            console.error('⚠️ 슬롯 업데이트 실패:', altError);
          }
        }
      }

      console.log('✅ 취소 프로세스 완료');
      showToast('예약이 취소되었습니다.', 'success');
      onHome();
    } catch (error) {
      console.error('❌ 예약 취소 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      showToast(
        `예약 취소 중 오류가 발생했습니다.\n${
          error.message || '알 수 없는 오류'
        }`,
        'error',
        5000
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 진단검사 예약 취소 (컨설팅은 유지)
  // ========================================
  const handleCancelTest = async () => {
    if (!testReservation) return;

    const consultingDateStr = `${
      dateObj.getMonth() + 1
    }월 ${dateObj.getDate()}일`;

    if (
      !window.confirm(
        `⚠️ 진단검사 예약을 취소하시겠습니까?\n\n` +
          `⚠️ 중요 안내:\n` +
          `• 진단검사는 컨설팅의 필수 조건입니다.\n` +
          `• 이 예약을 취소하시면 다른 날짜로 다시 예약해주셔야 합니다.\n` +
          `• 컨설팅 날짜(${consultingDateStr}) 이전에 진단검사를 완료해야 합니다.\n\n` +
          `취소하시겠습니까?`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ 진단검사 취소 시작:', testReservation.id);

      // ⭐⭐⭐ 중요: null로 만들기 전에 날짜를 저장!
      const savedTestDate = testReservation.test_date;
      const savedLocation = location;

      const { data: cancelData, error } = await supabase.rpc(
        'cancel_test_reservation',
        {
          reservation_id: testReservation.id,
        }
      );

      console.log('진단검사 취소 결과:', { cancelData, error });

      if (error) {
        console.error('❌ RPC 오류:', error);
        console.error('에러 상세:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`진단검사 취소 실패: ${error.message}`);
      }

      console.log('✅ 진단검사 취소 완료');

      showToast('진단검사 예약이 취소되었습니다.', 'success', 3000);

      // 상태 업데이트
      setTestReservation(null);

      // 진단검사 정보 다시 로드 (잔여석 갱신을 위해)
      console.log('🔄 진단검사 정보 다시 로드 중...');
      await loadTestInfo();

      // ⭐⭐⭐ 수정: 저장해둔 날짜 사용
      if (refreshTestTimeSlots && savedTestDate) {
        console.log('🔄 시간 슬롯 정보 다시 로드 중...');
        console.log('날짜:', savedTestDate, '지역:', savedLocation);
        await refreshTestTimeSlots(savedTestDate, savedLocation);
        console.log('✅ 시간 슬롯 다시 로드 완료');
      }

      console.log('✅ 정보 다시 로드 완료');
    } catch (error) {
      console.error('❌ 진단검사 취소 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      showToast(
        `취소 중 오류가 발생했습니다.\n${error.message || '알 수 없는 오류'}`,
        'error',
        5000
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 렌더링
  // ========================================
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">예약 확인</h2>
        <p className="text-gray-600">예약 정보를 확인하세요</p>

        <button
          onClick={loadTestInfo}
          disabled={loadingTest}
          className="mt-3 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
        >
          {loadingTest ? '⏳ 확인 중...' : '🔄 최신 정보 다시 불러오기'}
        </button>
      </div>

      {/* ========== 컨설팅 예약 정보 ========== */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
          📘 컨설팅 예약
        </h3>

        <div className="space-y-3 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">예약번호</span>
            <span className="font-semibold">{reservationId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">학생명</span>
            <span className="font-semibold">{reservation.student_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">날짜</span>
            <span className="font-semibold">
              {dateStr} ({dayName})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">시간</span>
            <span className="font-semibold">{timeStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">장소</span>
            <span className="font-semibold">{location}</span>
          </div>
        </div>

        <button
          onClick={handleCancelConsulting}
          className="w-full mt-4 py-2.5 bg-[#E94E3D] text-white rounded-lg font-semibold hover:bg-[#C62828] transition-all"
        >
          컨설팅 예약 취소
        </button>
      </div>

      {/* ========== 진단검사 정보 ========== */}
      {loadingTest ? (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">진단검사 정보 확인 중...</p>
        </div>
      ) : testMethod === 'onsite' ? (
        testReservation ? (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
              📗 진단검사 예약 (학원 방문)
            </h3>

            <div className="space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">예약번호</span>
                <span className="font-semibold">
                  {testReservation.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">날짜</span>
                <span className="font-semibold">
                  {new Date(testReservation.test_date).getMonth() + 1}월{' '}
                  {new Date(testReservation.test_date).getDate()}일 (
                  {dayNames[new Date(testReservation.test_date).getDay()]})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">시간</span>
                <span className="font-semibold">
                  {testReservation.test_time.slice(0, 5)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">장소</span>
                <span className="font-semibold">{location}</span>
              </div>
            </div>

            <button
              onClick={handleCancelTest}
              className="w-full mt-4 py-2.5 bg-[#FF7846] text-white rounded-lg font-semibold hover:bg-[#E94E3D] transition-all"
            >
              진단검사 예약 취소
            </button>
          </div>
        ) : (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-orange-800 mb-3 flex items-center">
              ⚠️ 진단검사 예약 필요
            </h3>

            <p className="text-sm text-gray-700 mb-4">
              컨설팅을 위해 <strong>진단검사 예약</strong>이 필요합니다.
            </p>

            {onStartTestReservation ? (
              <button
                onClick={onStartTestReservation}
                className="w-full py-2.5 bg-[#FF7846] text-white rounded-lg font-semibold hover:bg-[#E94E3D] transition-all"
              >
                진단검사 예약하러 가기 →
              </button>
            ) : (
              <a href="/consulting" className="block">
                <button className="w-full py-2.5 bg-[#FF7846] text-white rounded-lg font-semibold hover:bg-[#E94E3D] transition-all">
                  진단검사 예약하러 가기 →
                </button>
              </a>
            )}
          </div>
        )
      ) : testMethod === 'home' ? (
        testApplication ? (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
              ✅ 진단검사 (가정 응시)
            </h3>

            <div className="space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">시험지 다운로드</span>
                <span className="font-semibold text-emerald-700">✅ 완료</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">다운로드 일시</span>
                <span className="font-semibold">10. 17. 오후 12:11</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">시험 유형</span>
                <span className="font-semibold">HME_초3</span>
              </div>
            </div>

            {/* ⭐ 깔끔한 재다운로드 버튼 */}
            <a
              href={`/test-guide?phone=${encodeURIComponent(
                reservation.parent_phone
              )}&name=${encodeURIComponent(
                reservation.student_name
              )}&verified=true`}
              className="block mt-4"
            >
              <button className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all">
                📥 시험지 재다운로드하기
              </button>
            </a>

            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 컨설팅 시 작성한 시험지를 지참해주세요.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-orange-800 mb-3 flex items-center">
              ⚠️ 진단검사 시험지 다운로드 필요
            </h3>

            <p className="text-sm text-gray-700 mb-4">
              컨설팅을 위해 <strong>시험지 다운로드</strong>가 필요합니다.
            </p>

            <a
              href={`/test-guide?phone=${encodeURIComponent(
                reservation.parent_phone
              )}&name=${encodeURIComponent(
                reservation.student_name
              )}&verified=true`}
              className="block"
            >
              <button className="w-full py-2.5 bg-[#FF7846] text-white rounded-lg font-semibold hover:bg-[#E94E3D] transition-all">
                시험지 다운로드하러 가기 →
              </button>
            </a>
          </div>
        )
      ) : null}

      {/* 하단 버튼 */}
      <div className="space-y-3">
        <Button onClick={onBack} variant="secondary">
          ← 뒤로
        </Button>
        <Button onClick={onHome}>홈으로 돌아가기</Button>
      </div>
    </div>
  );
}
