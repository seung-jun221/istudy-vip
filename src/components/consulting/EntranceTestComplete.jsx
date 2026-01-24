// src/components/consulting/EntranceTestComplete.jsx
// 입학테스트 예약 완료 화면
export default function EntranceTestComplete({ reservation, onHome }) {
  if (!reservation) return null;

  const testSlot = reservation.test_slots;

  // 날짜 포맷팅
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}월 ${day}일 (${dayName})`;
  };

  // 시간 포맷팅
  const formatTime = (timeStr) => {
    return timeStr?.slice(0, 5) || '';
  };

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          입학테스트 예약 완료!
        </h2>
        <p className="text-gray-600">
          예약이 성공적으로 완료되었습니다.
        </p>
      </div>

      {/* 예약 정보 카드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
          <span>📋</span> 예약 정보
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">학생명</span>
            <span className="font-medium">{reservation.student_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">연락처</span>
            <span className="font-medium">{reservation.parent_phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">지역</span>
            <span className="font-medium">{testSlot?.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">날짜</span>
            <span className="font-medium">{formatDate(testSlot?.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">시간</span>
            <span className="font-medium">{formatTime(testSlot?.time)}</span>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
          <span>💡</span> 안내사항
        </h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• 테스트 소요시간은 약 <strong>80분</strong>입니다.</li>
          <li>• 예약 시간 <strong>10분 전</strong>까지 도착해주세요.</li>
          <li>• 필기도구를 지참해주세요.</li>
          <li>• <strong>컨설팅은 테스트 결과 확인 후</strong> 학원에서 개별 연락드립니다.</li>
        </ul>
      </div>

      {/* 예약 변경 안내 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
        <p className="text-sm text-gray-600">
          예약 변경 또는 취소가 필요하신 경우,<br />
          <strong>'예약 확인/취소'</strong> 메뉴를 이용해주세요.
        </p>
      </div>

      <button
        onClick={onHome}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}
