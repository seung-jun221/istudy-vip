// src/components/consulting/TestMethodSelector.jsx
import './DateSelector.css'; // 기존 DateSelector CSS 재사용

export default function TestMethodSelector({
  testSlotsAvailable,
  onSelectOnsite,
  onSelectHome,
  onBack,
}) {
  return (
    <div className="date-selector-container">
      <h2 className="text-2xl font-bold mb-6 text-center">
        진단검사 방식 선택
      </h2>

      {/* 안내 메시지 */}
      <div
        style={{ maxWidth: '800px', margin: '0 auto 1.5rem auto' }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <p className="text-sm text-blue-800">
          💡 진단검사는 <strong>방문 또는 가정</strong> 중 선택하실 수 있습니다.
          {!testSlotsAvailable && (
            <><br /><span className="text-orange-600">⚠️ 현재 방문 진단검사 슬롯이 모두 마감되어 가정 셀프 테스트만 가능합니다.</span></>
          )}
        </p>
      </div>

      {/* 방식 선택 카드 */}
      <div className="dates-grid" style={{ gridTemplateColumns: testSlotsAvailable ? '1fr 1fr' : '1fr', maxWidth: '800px', margin: '0 auto' }}>
        {/* 방문 진단검사 */}
        {testSlotsAvailable && (
          <button
            className="date-button date-available"
            onClick={onSelectOnsite}
            style={{ height: 'auto', padding: '24px' }}
          >
            <div className="date-content" style={{ flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '48px' }}>🏫</span>
              <span className="text-xl font-bold">방문 진단검사</span>
              <div className="date-status-wrapper" style={{ marginTop: '8px' }}>
                <span className="date-badge badge-green">예약 가능</span>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '12px', textAlign: 'center' }}>
                학원에 방문하여 진단검사를 응시합니다.<br />
                날짜와 시간을 선택하실 수 있습니다.
              </p>
            </div>
          </button>
        )}

        {/* 가정 셀프 테스트 */}
        <button
          className="date-button date-available"
          onClick={onSelectHome}
          style={{ height: 'auto', padding: '24px' }}
        >
          <div className="date-content" style={{ flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '48px' }}>🏠</span>
            <span className="text-xl font-bold">가정 셀프 테스트</span>
            <div className="date-status-wrapper" style={{ marginTop: '8px' }}>
              <span className="date-badge badge-green">즉시 가능</span>
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '12px', textAlign: 'center' }}>
              시험지를 다운로드하여 집에서 응시합니다.<br />
              편한 시간에 진행하실 수 있습니다.
            </p>
          </div>
        </button>
      </div>

      <div className="button-group" style={{ marginTop: '24px' }}>
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          ← 이전
        </button>
      </div>
    </div>
  );
}
