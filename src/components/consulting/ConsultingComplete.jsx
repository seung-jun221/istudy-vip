// src/components/consulting/ConsultingComplete.jsx
import { useEffect, useState } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase } from '../../utils/supabase';

export default function ConsultingComplete({
  reservation,
  onHome,
  onTestReservation,
}) {
  const { loadTestMethod } = useConsulting();
  const [testMethod, setTestMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  // 예약 날짜 정보
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

  // 컴포넌트 마운트 시 진단검사 방식 확인
  useEffect(() => {
    const fetchTestMethod = async () => {
      setLoading(true);

      // ⭐ campaigns와 seminar_slots에서 test_method 가져오기
      const campaignId = reservation.linked_seminar_id;
      if (campaignId) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select(`
            seminar_slots (test_method)
          `)
          .eq('id', campaignId)
          .single();

        // 첫 번째 슬롯의 test_method 사용
        const testMethodFromSlot = campaign?.seminar_slots?.[0]?.test_method;
        if (testMethodFromSlot) {
          setTestMethod(testMethodFromSlot);
          setLoading(false);
          return;
        }
      }

      // ⭐ fallback: 기존 test_methods 테이블 조회 (레거시 지원)
      const method = await loadTestMethod(location);
      setTestMethod(method);
      setLoading(false);
    };

    fetchTestMethod();
  }, [location, reservation]);

  // ⭐ 진단검사 예약 페이지로 이동 (동의는 이미 받음)
  const handleProceedToTest = () => {
    onTestReservation();
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-4xl">⏳</div>
        <p className="text-gray-600">예약 정보를 확인하는 중...</p>
      </div>
    );
  }

  return (
    <>
      {/* 성공 아이콘 */}
      <div className="text-6xl text-center">✅</div>

      {/* 제목 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">
          컨설팅 예약이 완료되었습니다!
        </h2>
        <p className="text-gray-600">컨설팅에서 뵙겠습니다.</p>
      </div>

      {/* 예약 정보 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3 text-left mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">예약번호</span>
          <span className="font-semibold">{reservationId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">학생명</span>
          <span className="font-semibold">{reservation.student_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">컨설팅 날짜</span>
          <span className="font-semibold">
            {dateStr} ({dayName})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">컨설팅 시간</span>
          <span className="font-semibold">{timeStr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">장소</span>
          <span className="font-semibold">{location}</span>
        </div>
      </div>

      {/* ⭐ 진단검사 안내 - 방식별 분기 */}
      {testMethod === 'onsite' ? (
        // 🏫 방문 진단검사만 (학원 방문 응시)
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-bold text-emerald-800 mb-3">
            📝 다음 단계: 진단검사 예약 (필수)
          </h4>

          <div className="bg-orange-50 border border-[#FF7846] rounded-lg p-4 mb-4">
            <p className="text-sm font-bold text-orange-900 mb-2">
              ⚠️ 중요 안내
            </p>
            <ul className="text-sm text-gray-700 space-y-2 list-disc ml-5">
              <li>
                컨설팅을 위해 <strong>사전 진단검사가 필수</strong>입니다.
              </li>
              <li>
                진단검사는 <strong>컨설팅 날짜 이전</strong>에 완료해야 합니다.
              </li>
              <li>
                진단검사 예약은{' '}
                <strong className="text-[#E94E3D]">
                  당일 자정(23:59)까지만 가능
                </strong>
                합니다.
              </li>
              <li>
                <strong className="text-[#E94E3D]">
                  자정까지 진단검사 예약을 하지 않으시면 컨설팅 예약이 자동으로
                  취소됩니다.
                </strong>
              </li>
            </ul>
          </div>

          {/* 진단검사 예약 버튼 */}
          <button
            onClick={handleProceedToTest}
            className="w-full py-3 rounded-lg font-semibold transition-all bg-emerald-700 text-white hover:bg-emerald-800"
          >
            진단검사 예약하러 가기 →
          </button>

          <button
            onClick={onHome}
            className="w-full mt-3 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            나중에 하기 (홈으로)
          </button>
        </div>
      ) : testMethod === 'both' ? (
        // 🔄 둘 다 가능 (사용자 선택)
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-bold text-purple-800 mb-3">
            📝 다음 단계: 진단검사 방식 선택 (필수)
          </h4>

          <p className="text-sm text-gray-700 mb-4">
            진단검사는 <strong>방문 또는 가정</strong> 중 선택하실 수 있습니다.
          </p>

          {/* 진단검사 방식 선택 버튼 */}
          <button
            onClick={handleProceedToTest}
            className="w-full py-3 rounded-lg font-semibold transition-all bg-purple-700 text-white hover:bg-purple-800"
          >
            진단검사 방식 선택하기 →
          </button>

          <button
            onClick={onHome}
            className="w-full mt-3 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            나중에 하기 (홈으로)
          </button>
        </div>
      ) : (
        // 🏠 대치점: 가정 셀프테스트 (단순 안내)
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-bold text-orange-800 mb-3">
            📝 다음 단계: 진단검사 응시 (필수)
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            컨설팅을 위해 <strong>진단검사</strong>를 신청해주세요.
          </p>
          <ol className="text-sm text-gray-700 space-y-2 ml-5 list-decimal mb-4">
            <li>진단검사 시험지 다운로드</li>
            <li>집에서 응시 (시간 측정)</li>
            <li>컨설팅 시 시험지 지참</li>
          </ol>

          {/* 시험지 다운로드 버튼 */}
          <a
            href={`/test-guide?phone=${encodeURIComponent(
              reservation.parent_phone
            )}&name=${encodeURIComponent(
              reservation.student_name
            )}&verified=true`}
            className="block mb-3"
          >
            <button className="w-full py-3 bg-[#FF7846] text-white rounded-lg font-semibold hover:bg-[#E94E3D] transition-all">
              시험지 다운로드하러 가기 →
            </button>
          </a>

          <button
            onClick={onHome}
            className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            나중에 하기 (홈으로)
          </button>
        </div>
      )}

      {/* 컨설팅 준비사항 */}
      <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mt-6">
        <p className="font-semibold text-sm">📌 컨설팅 준비사항</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {testMethod === 'onsite' ? (
            <>
              <li>• 진단검사는 학원에서 응시하고 보관합니다</li>
              <li>• 최근 성적표나 문제집 지참 (선택)</li>
            </>
          ) : (
            <>
              <li>• 작성한 진단검사 시험지 지참 (필수)</li>
              <li>• 최근 성적표나 문제집 지참 (선택)</li>
            </>
          )}
          <li>• 컨설팅 시작 10분 전까지 도착</li>
        </ul>
      </div>
    </>
  );
}
