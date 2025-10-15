// src/components/consulting/ConsultingComplete.jsx
import { useEffect, useState } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

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
      const method = await loadTestMethod(location);
      setTestMethod(method);
      setLoading(false);
    };

    fetchTestMethod();
  }, [location]);

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
    <div className="space-y-6 text-center">
      {/* 성공 아이콘 */}
      <div className="text-6xl">✅</div>

      {/* 제목 */}
      <div>
        <h2 className="text-2xl font-bold mb-2">
          컨설팅 예약이 완료되었습니다!
        </h2>
        <p className="text-gray-600">컨설팅에서 뵙겠습니다.</p>
      </div>

      {/* 예약 정보 */}
      <div className="bg-blue-50 rounded-lg p-6 space-y-3 text-left">
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

      {/* ⭐ 진단검사 안내 - 지점별 분기 */}
      {testMethod === 'onsite' ? (
        // 🏫 학원 방문 응시
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-bold text-green-800 mb-3">
            📝 다음 단계: 진단검사 학원 방문 예약
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            <strong>{location}</strong>에서 진단검사를 응시하시려면 별도로
            예약해주세요.
          </p>
          <ol className="text-sm text-gray-700 space-y-2 ml-5 list-decimal">
            <li>진단검사 날짜/시간 예약</li>
            <li>학원 방문하여 응시</li>
            <li>컨설팅 날짜에 결과 상담</li>
          </ol>

          {/* 진단검사 예약 버튼 */}
          <button
            onClick={onTestReservation}
            className="w-full mt-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
          >
            진단검사 예약하러 가기 →
          </button>
        </div>
      ) : (
        // 🏠 가정 셀프테스트
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-bold text-yellow-800 mb-3">
            📝 다음 단계: 진단검사 신청
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            컨설팅을 위해 <strong>진단검사</strong>를 신청해주세요.
          </p>
          <ol className="text-sm text-gray-700 space-y-2 ml-5 list-decimal">
            <li>진단검사 시험지 다운로드</li>
            <li>집에서 응시 (시간 측정)</li>
            <li>컨설팅 시 시험지 지참</li>
          </ol>

          {/* 진단검사 신청 버튼 */}
          <a
            href="/test-guide.html"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4"
          >
            <button className="w-full py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all">
              진단검사 신청하러 가기 →
            </button>
          </a>
        </div>
      )}

      {/* 컨설팅 준비사항 */}
      <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
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

      {/* 홈으로 버튼 */}
      <Button onClick={onHome}>홈으로 돌아가기</Button>
    </div>
  );
}
