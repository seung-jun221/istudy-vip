import { useReservation } from '../../context/ReservationContext';
import { formatDate, formatTime } from '../../utils/format';

export default function SeminarSelector() {
  const { seminars, selectedSeminar, setSelectedSeminar } = useReservation();

  const handleSelect = (seminar) => {
    setSelectedSeminar(seminar);
  };

  if (seminars.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">진행 예정인 설명회가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-4">
        참석하실 설명회를 선택해주세요
      </p>

      {seminars.map((seminar) => (
        <div
          key={seminar.id}
          onClick={() => handleSelect(seminar)}
          className={`
            border-2 rounded-lg p-4 cursor-pointer transition-all
            ${
              selectedSeminar?.id === seminar.id
                ? 'border-primary bg-blue-50'
                : 'border-gray-200 hover:border-primary hover:shadow-md'
            }
          `}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="text-base font-semibold text-primary mb-2">
                {seminar.title}
              </h4>
              <p className="text-sm text-gray-600">
                • {formatDate(seminar.date)} {formatTime(seminar.time)}
              </p>
              <p className="text-sm text-gray-600 mt-1">• {seminar.location}</p>
            </div>

            <div className="ml-4">
              {seminar.isFull ? (
                <span className="px-3 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
                  마감
                </span>
              ) : seminar.available < 5 ? (
                <span className="px-3 py-1 bg-orange-100 text-orange-600 text-sm font-medium rounded-full">
                  마감임박
                </span>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-600 text-sm font-medium rounded-full">
                  예약가능
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
