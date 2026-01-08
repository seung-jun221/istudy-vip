// src/components/consulting/TimeSelector.jsx - 동의 체크박스 추가
import { useEffect, useState } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

export default function TimeSelector({ onNext, onBack, agreed, onAgreeChange }) {
  const {
    selectedDate,
    selectedTime,
    setSelectedTime,
    timeSlots,
    loadTimeSlots,
    availableDates,
    selectedLocation,
    loadTestMethod,
  } = useConsulting();

  const [testMethod, setTestMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  // ⭐ 시간 페이지 진입 시 로드 (selectedLocation이 업데이트되면 다시 로드)
  useEffect(() => {
    const init = async () => {
      // timeSlots가 이미 있으면 DateSelector에서 이미 로드한 것이므로 스킵
      if (timeSlots.length > 0) {
        console.log('⏭️ timeSlots 이미 로드됨:', timeSlots.length);

        // 진단검사 방식만 확인
        if (selectedLocation) {
          const method = await loadTestMethod(selectedLocation);
          setTestMethod(method);
        }
        setLoading(false);
        return;
      }

      // selectedLocation이 있으면 시간 슬롯 로드
      if (selectedDate && selectedLocation) {
        console.log('⏰ 시간 슬롯 로딩:', selectedDate, selectedLocation);
        await loadTimeSlots(selectedDate, selectedLocation);

        // 진단검사 방식 확인
        const method = await loadTestMethod(selectedLocation);
        setTestMethod(method);
        setLoading(false);
      }
    };
    init();
  }, [selectedDate, selectedLocation, timeSlots.length]); // ⭐ 의존성 배열 수정

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handleNext = () => {
    // 역삼점/수내캠퍼스(onsite)인데 동의 안 했으면 경고
    if (testMethod === 'onsite' && !agreed) {
      alert('진단검사 예약 마감 안내에 동의해주세요.');
      return;
    }

    if (!selectedTime) {
      return;
    }
    onNext();
  };

  const dateInfo = availableDates.find((d) => d.date === selectedDate);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">컨설팅 시간 선택</h3>
        <p className="text-gray-600 text-sm">
          {selectedLocation && (
            <span className="font-medium text-primary">{selectedLocation}</span>
          )}{' '}
          {dateInfo?.display} ({dateInfo?.dayOfWeek}요일)의 예약 가능한
          시간입니다.
        </p>
      </div>

      {/* ⭐ 로딩 중 표시 추가 */}
      {timeSlots.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-700 font-medium">
            시간 정보를 불러오는 중...
          </p>
          <p className="text-sm text-gray-600 mt-2">잠시만 기다려주세요</p>
        </div>
      )}

      {timeSlots.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {timeSlots.map((slot) => {
            const timeStr = slot.time.slice(0, 5);
            const availableSeats = slot.max_capacity - slot.current_bookings;
            const isAvailable = slot.isAvailable;

            return (
              <div
                key={slot.id}
                onClick={() => (isAvailable ? handleTimeSelect(timeStr) : null)}
                className={`
                  border rounded-lg p-4 transition-all text-center
                  ${
                    !isAvailable
                      ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                      : selectedTime === timeStr
                      ? 'border-primary bg-primary text-white cursor-pointer'
                      : 'border-gray-300 hover:border-primary hover:bg-gray-50 cursor-pointer'
                  }
                `}
              >
                <div className="text-lg font-semibold mb-1">{timeStr}</div>
                <div className="text-xs">
                  {isAvailable ? `잔여 ${availableSeats}석` : '예약 마감'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ⭐ 역삼점/수내캠퍼스인 경우 동의 체크박스 표시 */}
      {!loading && testMethod === 'onsite' && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <p className="text-sm font-bold text-yellow-900 mb-3">
            ⚠️ 진단검사 예약 마감 안내
          </p>
          <ul className="text-sm text-gray-700 space-y-2 list-disc ml-5 mb-4">
            <li>컨설팅을 위해 <strong>사전 진단검사가 필수</strong>입니다.</li>
            <li>진단검사는 <strong>컨설팅 날짜 이전</strong>에 완료해야 합니다.</li>
            <li>진단검사 예약은 <strong className="text-red-600">당일 자정(23:59)까지만 가능</strong>합니다.</li>
            <li><strong className="text-red-600">자정까지 진단검사 예약을 하지 않으시면 컨설팅 예약이 자동으로 취소됩니다.</strong></li>
          </ul>

          <label className="flex items-start space-x-3 cursor-pointer p-3 border-2 border-gray-300 rounded-lg hover:border-yellow-500 transition-all bg-white">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => onAgreeChange(e.target.checked)}
              className="mt-1 w-5 h-5 cursor-pointer"
            />
            <span className="text-sm text-gray-800">
              위 내용을 확인했으며, <strong>당일 자정까지 진단검사 예약을 완료</strong>하겠습니다.
            </span>
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 날짜 다시 선택
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedTime || (testMethod === 'onsite' && !agreed)}
        >
          예약 확정하기
        </Button>
      </div>
    </div>
  );
}
