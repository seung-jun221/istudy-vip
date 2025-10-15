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
  const [agreed, setAgreed] = useState(false); // ⭐ 동의 체크박스
  const [saving, setSaving] = useState(false);

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
      const method = await loadTestMethod(location);
      setTestMethod(method);
      setLoading(false);
    };

    fetchTestMethod();
  }, [location]);

  // ⭐ 동의 체크 후 DB 저장 & 진단검사 예약 이동
  const handleProceedToTest = async () => {
    if (testMethod === 'onsite' && !agreed) {
      alert('하단의 안내 사항에 동의해주세요.');
      return;
    }

    // 역삼점인 경우에만 동의 저장
    if (testMethod === 'onsite') {
      try {
        setSaving(true);
        const { error } = await supabase
          .from('consulting_reservations')
          .update({
            test_deadline_agreed: true,
            test_deadline_agreed_at: new Date().toISOString(),
          })
          .eq('id', reservation.id);

        if (error) throw error;
      } catch (error) {
        console.error('동의 저장 실패:', error);
        alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      } finally {
        setSaving(false);
      }
    }

    // 진단검사 예약 페이지로 이동
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
      <div className="bg-blue-50 rounded-lg p-6 space-y-3 text-left mb-6">
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

      {/* ⭐ 진단검사 안내 - 지역별 분기 */}
      {testMethod === 'onsite' ? (
        // 🏫 역삼점: 학원 방문 응시 (체크박스 + 자정 마감 경고)
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-bold text-green-800 mb-3">
            📝 다음 단계: 진단검사 예약 (필수)
          </h4>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
            <p className="text-sm font-bold text-yellow-900 mb-2">
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
                <strong className="text-red-600">
                  당일 자정(23:59)까지만 가능
                </strong>
                합니다.
              </li>
              <li>
                <strong className="text-red-600">
                  자정까지 진단검사 예약을 하지 않으시면 컨설팅 예약이 자동으로
                  취소됩니다.
                </strong>
              </li>
            </ul>
          </div>

          {/* 동의 체크박스 */}
          <label className="flex items-start space-x-3 cursor-pointer mb-4 p-3 border-2 border-gray-300 rounded-lg hover:border-green-500 transition-all">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 cursor-pointer"
            />
            <span className="text-sm text-gray-800">
              위 내용을 확인했으며,{' '}
              <strong>당일 자정까지 진단검사 예약을 완료</strong>하겠습니다.
            </span>
          </label>

          {/* 진단검사 예약 버튼 */}
          <button
            onClick={handleProceedToTest}
            disabled={!agreed || saving}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              agreed && !saving
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? '처리 중...' : '진단검사 예약하러 가기 →'}
          </button>

          <button
            onClick={onHome}
            className="w-full mt-3 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            나중에 하기 (홈으로)
          </button>
        </div>
      ) : (
        // 🏠 대치점: 가정 셀프테스트 (단순 안내)
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-bold text-yellow-800 mb-3">
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
          <a href="/test-guide" className="block mb-3">
            <button className="w-full py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all">
              시험지 다운로드하러 가기 →
            </button>
          </a>

          <button
            onClick={onHome}
            className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
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
