import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

export default function ConsultingComplete({ reservation, onHome }) {
  const { availableDates } = useConsulting();

  // 예약 날짜 정보
  const slot = reservation.consulting_slots;
  const dateObj = new Date(slot.date);
  const dateStr = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[dateObj.getDay()];
  const timeStr = slot.time.slice(0, 5);

  // 예약번호 (UUID 앞 8자리)
  const reservationId = reservation.id
    ? reservation.id.slice(0, 8).toUpperCase()
    : '-';

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
          <span className="font-semibold">수학의 아침 학원</span>
        </div>
      </div>

      {/* 📝 진단검사 안내 (중요!) */}
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

      {/* 컨설팅 준비사항 */}
      <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
        <p className="font-semibold text-sm">📌 컨설팅 준비사항</p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 작성한 진단검사 시험지 지참 (필수)</li>
          <li>• 최근 성적표나 문제집 지참 (선택)</li>
          <li>• 컨설팅 시작 10분 전까지 도착</li>
        </ul>
      </div>

      {/* 홈으로 버튼 */}
      <Button onClick={onHome}>홈으로 돌아가기</Button>
    </div>
  );
}
