// src/components/consulting/TestComplete.jsx
import Button from '../common/Button';

export default function TestComplete({
  testReservation,
  consultingReservation,
  onHome,
}) {
  // 진단검사 정보
  const testSlot = testReservation.test_slots;
  const testDateObj = new Date(testSlot.date);
  const testDateStr = `${
    testDateObj.getMonth() + 1
  }월 ${testDateObj.getDate()}일`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const testDayName = dayNames[testDateObj.getDay()];
  const testTimeStr = testSlot.time.slice(0, 5);

  // 컨설팅 정보
  const consultingSlot = consultingReservation.consulting_slots;
  const consultingDateObj = new Date(consultingSlot.date);
  const consultingDateStr = `${
    consultingDateObj.getMonth() + 1
  }월 ${consultingDateObj.getDate()}일`;
  const consultingDayName = dayNames[consultingDateObj.getDay()];
  const consultingTimeStr = consultingSlot.time.slice(0, 5);

  // 예약번호
  const testReservationId = testReservation.id
    ? testReservation.id.slice(0, 8).toUpperCase()
    : '-';

  return (
    <div className="space-y-6 text-center">
      {/* 성공 아이콘 */}
      <div className="text-6xl">✅</div>

      {/* 제목 */}
      <div>
        <h2 className="text-2xl font-bold mb-2">모든 예약이 완료되었습니다!</h2>
        <p className="text-gray-600">진단검사와 컨설팅에서 뵙겠습니다.</p>
      </div>

      {/* 진단검사 예약 정보 */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6 text-left">
        <h3 className="text-lg font-bold text-emerald-800 mb-3">
          📝 진단검사 예약
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">예약번호</span>
            <span className="font-semibold">{testReservationId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">날짜</span>
            <span className="font-semibold">
              {testDateStr} ({testDayName})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">시간</span>
            <span className="font-semibold">{testTimeStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">장소</span>
            <span className="font-semibold">{testSlot.location}</span>
          </div>
        </div>
      </div>

      {/* 컨설팅 예약 정보 */}
      <div className="bg-blue-50 rounded-lg p-6 text-left">
        <h3 className="text-lg font-bold text-blue-800 mb-3">💬 컨설팅 예약</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">날짜</span>
            <span className="font-semibold">
              {consultingDateStr} ({consultingDayName})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">시간</span>
            <span className="font-semibold">{consultingTimeStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">장소</span>
            <span className="font-semibold">{consultingSlot.location}</span>
          </div>
        </div>
      </div>

      {/* 준비사항 안내 */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 text-left">
        <h4 className="text-lg font-bold text-orange-800 mb-3">
          📌 진단검사 준비사항
        </h4>
        <ul className="text-sm text-gray-700 space-y-1 ml-5 list-disc">
          <li>필기구 지참 (샤프, 지우개)</li>
          <li>시험 시작 10분 전까지 도착</li>
          <li>학생 본인이 직접 응시</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left">
        <h4 className="text-lg font-bold text-gray-800 mb-3">
          📌 컨설팅 준비사항
        </h4>
        <ul className="text-sm text-gray-700 space-y-1 ml-5 list-disc">
          <li>작성한 진단검사 시험지는 학원에서 보관합니다</li>
          <li>최근 성적표나 문제집 지참 (선택)</li>
          <li>컨설팅 시작 10분 전까지 도착</li>
        </ul>
      </div>

      {/* 홈으로 버튼 */}
      <Button onClick={onHome}>홈으로 돌아가기</Button>
    </div>
  );
}
