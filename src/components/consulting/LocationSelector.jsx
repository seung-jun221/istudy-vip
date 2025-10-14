import { useEffect } from 'react';
import Button from '../common/Button';
import { useConsulting } from '../../context/ConsultingContext';

export default function LocationSelector({ onNext, onBack }) {
  const {
    availableLocations,
    loadAvailableLocations,
    selectedLocation,
    setSelectedLocation,
  } = useConsulting();

  useEffect(() => {
    loadAvailableLocations();
  }, []);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  const handleNext = () => {
    if (!selectedLocation) {
      return;
    }
    onNext();
  };

  // 날짜 포맷팅 (1/25 형태)
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">컨설팅 지역 선택</h3>
        <p className="text-gray-600 text-sm">
          방문 가능한 학원을 선택해주세요.
        </p>
      </div>

      {/* 지역이 없는 경우 */}
      {availableLocations.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium mb-2">
            현재 예약 가능한 컨설팅이 없습니다.
          </p>
          <p className="text-sm text-gray-600">
            설명회에 참석하시면 전용 컨설팅 날짜가 제공됩니다.
          </p>
        </div>
      )}

      {/* 지역 선택 그리드 */}
      <div className="grid grid-cols-1 gap-3">
        {availableLocations.map((locInfo) => (
          <div
            key={locInfo.location}
            onClick={() => handleLocationSelect(locInfo.location)}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all
              ${
                selectedLocation === locInfo.location
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }
            `}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📍</span>
                  <span className="font-bold text-lg">{locInfo.location}</span>
                </div>
                <div className="text-sm text-gray-600 ml-8">
                  가장 빠른 날짜: {formatDate(locInfo.nextAvailableDate)}
                </div>
              </div>
              <div className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {locInfo.availableDateCount}개 날짜
              </div>
            </div>

            {/* 선택된 경우 체크 표시 */}
            {selectedLocation === locInfo.location && (
              <div className="mt-2 text-primary text-sm font-medium">
                ✓ 선택됨
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 안내 메시지 */}
      {availableLocations.length > 0 && (
        <div className="info-box" style={{ fontSize: '13px', padding: '12px' }}>
          💡 선택하신 지역의 예약 가능한 날짜만 표시됩니다.
        </div>
      )}

      {/* 버튼 그룹 */}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
        <Button onClick={handleNext} disabled={!selectedLocation}>
          날짜 선택하기
        </Button>
      </div>
    </div>
  );
}
