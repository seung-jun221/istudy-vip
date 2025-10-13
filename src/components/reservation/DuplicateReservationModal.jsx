import { formatDate, formatTime } from '../../utils/format';

export default function DuplicateReservationModal({
  reservation,
  onViewDetails,
  onClose,
}) {
  if (!reservation) return null;

  // 상태 표시 텍스트
  const getStatusText = (status) => {
    switch (status) {
      case '예약':
        return '예약 확정';
      case '대기':
        return '대기 예약';
      case '참석':
        return '참석 완료';
      case '취소':
        return '예약 취소';
      default:
        return status;
    }
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '예약':
        return '#27ae60';
      case '대기':
        return '#f39c12';
      case '참석':
        return '#3498db';
      case '취소':
        return '#95a5a6';
      default:
        return '#333';
    }
  };

  return (
    <>
      {/* 오버레이 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={onClose}
      >
        {/* 모달 */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            animation: 'modalSlideIn 0.3s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid #e0e0e0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>💬</div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#333',
                margin: 0,
              }}
            >
              예약 확인
            </h2>
          </div>

          {/* 내용 */}
          <div style={{ padding: '24px' }}>
            {/* 안내 메시지 */}
            <p
              style={{
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#666',
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              이 전화번호로 이미 예약하신 내역이 있습니다.
            </p>

            {/* 예약 정보 박스 */}
            <div
              style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📋 예약 정보
              </div>

              <div
                style={{
                  borderTop: '1px solid #e0e0e0',
                  paddingTop: '12px',
                }}
              >
                {/* 설명회 */}
                <div
                  style={{
                    display: 'flex',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      minWidth: '60px',
                    }}
                  >
                    설명회:
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#333',
                      fontWeight: '500',
                    }}
                  >
                    {reservation.seminar_title || '설명회 정보'}
                  </span>
                </div>

                {/* 일시 */}
                <div
                  style={{
                    display: 'flex',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      minWidth: '60px',
                    }}
                  >
                    일시:
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#333',
                      fontWeight: '500',
                    }}
                  >
                    {formatDate(reservation.seminar_date)}{' '}
                    {formatTime(reservation.seminar_time)}
                  </span>
                </div>

                {/* 학생명 */}
                <div
                  style={{
                    display: 'flex',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      minWidth: '60px',
                    }}
                  >
                    학생명:
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#333',
                      fontWeight: '500',
                    }}
                  >
                    {reservation.student_name}
                  </span>
                </div>

                {/* 상태 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      minWidth: '60px',
                    }}
                  >
                    상태:
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: getStatusColor(reservation.status),
                      fontWeight: '600',
                    }}
                  >
                    {getStatusText(reservation.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* 질문 */}
            <p
              style={{
                fontSize: '14px',
                color: '#333',
                textAlign: 'center',
                marginBottom: '20px',
                fontWeight: '500',
              }}
            >
              ❓ 어떻게 하시겠어요?
            </p>

            {/* 버튼 그룹 */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
              }}
            >
              {/* 예약 상세보기 버튼 */}
              <button
                onClick={onViewDetails}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#1a73e8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = '#1557b0')
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = '#1a73e8')
                }
              >
                예약 상세보기
              </button>

              {/* 뒤로 가기 버튼 */}
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: 'white',
                  color: '#1a73e8',
                  border: '2px solid #1a73e8',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = '#e3f2fd')
                }
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'white')}
              >
                뒤로 가기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 애니메이션 */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
