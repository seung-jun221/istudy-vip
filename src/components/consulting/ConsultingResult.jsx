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
  const { showToast, setLoading, loadTestMethod } = useConsulting();

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
    loadTestInfo();
  }, [reservation.id]);

  const loadTestInfo = async () => {
    setLoadingTest(true);

    try {
      // 1) 지역별 진단검사 방식 확인
      const method = await loadTestMethod(location);
      setTestMethod(method);

      // 2) 역삼점: 진단검사 예약 확인
      if (method === 'onsite') {
        const { data: testRes, error: testError } = await supabase
          .from('test_reservations')
          .select('*, test_slots(*)')
          .eq('consulting_reservation_id', reservation.id)
          .eq('status', 'confirmed')
          .maybeSingle();

        if (testError && testError.code !== 'PGRST116') {
          console.error('진단검사 예약 조회 실패:', testError);
        }

        setTestReservation(testRes);
      }

      // 3) 대치점: 시험지 다운로드 확인
      else if (method === 'home') {
        const { data: testApp, error: appError } = await supabase
          .from('test_applications')
          .select('*')
          .eq('parent_phone', reservation.parent_phone)
          .not('downloaded_at', 'is', null)
          .order('downloaded_at', { ascending: false })
          .limit(1);

        if (appError && appError.code !== 'PGRST116') {
          console.error('시험지 다운로드 조회 실패:', appError);
        }

        setTestApplication(testApp?.[0] || null);
      }
    } catch (error) {
      console.error('진단검사 정보 로드 실패:', error);
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
      // 1) 역삼점: 진단검사 예약도 함께 취소 (예약이 있는 경우에만)
      if (testReservation && testReservation.id) {
        try {
          const { error: cancelError } = await supabase.rpc(
            'cancel_test_reservation',
            {
              reservation_id: testReservation.id,
            }
          );

          if (cancelError) {
            console.error('진단검사 취소 실패:', cancelError);
            // 진단검사 취소 실패해도 컨설팅은 계속 진행
          }
        } catch (rpcError) {
          console.error('RPC 호출 실패:', rpcError);
          // 에러가 나도 컨설팅 취소는 계속 진행
        }
      }

      // 2) 컨설팅 예약 취소
      const { error: consultingError } = await supabase
        .from('consulting_reservations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', reservation.id);

      if (consultingError) throw consultingError;

      // 3) current_bookings 감소
      const { error: updateError } = await supabase.rpc('decrement_bookings', {
        slot_uuid: reservation.slot_id,
      });

      // RPC 실패 시 대체 방법
      if (updateError) {
        console.error('RPC 실패, 대체 방법 사용:', updateError);
        const { error: altError } = await supabase
          .from('consulting_slots')
          .update({
            current_bookings: supabase.sql`GREATEST(current_bookings - 1, 0)`,
          })
          .eq('id', reservation.slot_id);

        if (altError) {
          console.error('슬롯 업데이트 실패:', altError);
        }
      }

      showToast('예약이 취소되었습니다.', 'success');
      onHome();
    } catch (error) {
      console.error('예약 취소 실패:', error);
      showToast('예약 취소 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 진단검사 예약 취소 (컨설팅은 유지)
  // ========================================
  const handleCancelTest = async () => {
    if (!testReservation) return;

    // 컨설팅 날짜 정보
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
      const { error } = await supabase.rpc('cancel_test_reservation', {
        reservation_id: testReservation.id,
      });

      if (error) throw error;

      showToast(
        '진단검사 예약이 취소되었습니다.\n다른 날짜로 다시 예약해주세요.',
        'warning',
        5000
      );

      // 상태 업데이트
      setTestReservation(null);
    } catch (error) {
      console.error('진단검사 취소 실패:', error);
      showToast('취소 중 오류가 발생했습니다.', 'error');
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
          className="w-full mt-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
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
        // 역삼점: 학원 방문 응시
        testReservation ? (
          // 진단검사 예약 완료
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
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
                  {new Date(testReservation.test_slots.date).getMonth() + 1}월{' '}
                  {new Date(testReservation.test_slots.date).getDate()}일 (
                  {dayNames[new Date(testReservation.test_slots.date).getDay()]}
                  )
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">시간</span>
                <span className="font-semibold">
                  {testReservation.test_slots.time.slice(0, 5)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">장소</span>
                <span className="font-semibold">{location}</span>
              </div>
            </div>

            <button
              onClick={handleCancelTest}
              className="w-full mt-4 py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all"
            >
              진단검사 예약 취소
            </button>
          </div>
        ) : (
          // 진단검사 미예약
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center">
              ⚠️ 진단검사 예약 필요
            </h3>

            <p className="text-sm text-gray-700 mb-4">
              컨설팅을 위해 <strong>진단검사 예약</strong>이 필요합니다.
            </p>

            {onStartTestReservation ? (
              <button
                onClick={onStartTestReservation}
                className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all"
              >
                진단검사 예약하러 가기 →
              </button>
            ) : (
              <a href="/consulting" className="block">
                <button className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all">
                  진단검사 예약하러 가기 →
                </button>
              </a>
            )}
          </div>
        )
      ) : testMethod === 'home' ? (
        // 대치점: 가정 셀프 응시
        testApplication ? (
          // 시험지 다운로드 완료
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
              ✅ 진단검사 (가정 응시)
            </h3>

            <div className="space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">시험지 다운로드</span>
                <span className="font-semibold text-green-700">✅ 완료</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">다운로드 일시</span>
                <span className="font-semibold">
                  {new Date(testApplication.downloaded_at).toLocaleString(
                    'ko-KR',
                    {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">시험 유형</span>
                <span className="font-semibold">
                  {testApplication.test_type || '-'}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 컨설팅 시 작성한 시험지를 지참해주세요.
              </p>
            </div>
          </div>
        ) : (
          // 시험지 미다운로드
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center">
              ⚠️ 진단검사 시험지 다운로드 필요
            </h3>

            <p className="text-sm text-gray-700 mb-4">
              컨설팅을 위해 <strong>시험지 다운로드</strong>가 필요합니다.
            </p>

            <a href="/test-guide" className="block">
              <button className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all">
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
