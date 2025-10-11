import Button from '../common/Button';
import { formatDate, formatTime } from '../../utils/format';
import { useReservation } from '../../context/ReservationContext';

export default function ReservationComplete({ reservation, onHome }) {
  const { selectedSeminar } = useReservation();

  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">✅</div>

      <div>
        <h2 className="text-2xl font-bold mb-2">
          {reservation.status === '대기'
            ? '대기예약이 완료되었습니다'
            : '예약이 완료되었습니다'}
        </h2>
        <p className="text-gray-600">
          {reservation.status === '대기'
            ? '취소자 발생 시 우선 연락드리겠습니다.'
            : '설명회에서 뵙겠습니다.'}
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 space-y-3 text-left">
        <div className="flex justify-between">
          <span className="text-gray-600">예약번호</span>
          <span className="font-semibold">{reservation.reservation_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">학생명</span>
          <span className="font-semibold">{reservation.student_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">설명회</span>
          <span className="font-semibold">{selectedSeminar?.title}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">일시</span>
          <span className="font-semibold">
            {formatDate(selectedSeminar?.date)}{' '}
            {formatTime(selectedSeminar?.time)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">장소</span>
          <span className="font-semibold">{selectedSeminar?.location}</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
        <p className="font-semibold text-sm">📌 안내사항</p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 설명회 시작 10분 전까지 도착해주세요.</li>
          <li>• 주차공간이 협소하니 대중교통 이용을 권장합니다.</li>
          <li>• 설명회 참석 후 개별 컨설팅 예약이 가능합니다.</li>
          <li>• 설명회는 90분간 진행됩니다.</li>
        </ul>
      </div>

      <Button onClick={onHome}>홈으로 돌아가기</Button>
    </div>
  );
}
