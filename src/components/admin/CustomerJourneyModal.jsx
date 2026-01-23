import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import './AdminTabs.css';

export default function CustomerJourneyModal({ phone, onClose }) {
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState({
    profile: null,
    seminars: [],
    consultings: [],
    tests: [],
    results: [],
  });

  useEffect(() => {
    if (phone) {
      loadJourney();
    }
  }, [phone]);

  const loadJourney = async () => {
    setLoading(true);
    try {
      // 1. 설명회 예약 조회
      const { data: seminars } = await supabase
        .from('reservations')
        .select('*, seminar_slots(*)')
        .eq('parent_phone', phone)
        .order('created_at', { ascending: false });

      // 2. 컨설팅 예약 조회
      const { data: consultings } = await supabase
        .from('consulting_reservations')
        .select('*, consulting_slots(*)')
        .eq('parent_phone', phone)
        .order('created_at', { ascending: false });

      // 3. 진단검사 예약 조회
      const { data: tests } = await supabase
        .from('test_reservations')
        .select('*, test_slots(*)')
        .eq('parent_phone', phone)
        .order('created_at', { ascending: false });

      // 4. 진단검사 결과 조회
      const { data: results } = await supabase
        .from('diagnostic_results')
        .select('*')
        .eq('parent_phone', phone)
        .order('created_at', { ascending: false });

      // 프로필 정보 추출 (가장 최근 데이터에서)
      const profile = extractProfile(seminars, consultings, tests);

      setJourney({
        profile,
        seminars: seminars || [],
        consultings: consultings || [],
        tests: tests || [],
        results: results || [],
      });
    } catch (error) {
      console.error('여정 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractProfile = (seminars, consultings, tests) => {
    // 컨설팅 예약에서 가장 최근 정보
    const consulting = consultings?.[0];
    if (consulting) {
      return {
        student_name: consulting.student_name,
        school: consulting.school,
        grade: consulting.grade,
        math_level: consulting.math_level,
      };
    }
    // 설명회 예약에서
    const seminar = seminars?.[0];
    if (seminar) {
      return {
        student_name: seminar.student_name,
        school: seminar.school,
        grade: seminar.grade,
        math_level: seminar.math_level,
      };
    }
    return null;
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const dateFormatted = `${date.getMonth() + 1}/${date.getDate()}`;
    const time = timeStr ? timeStr.slice(0, 5) : '';
    return time ? `${dateFormatted} ${time}` : dateFormatted;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      '예약': { bg: '#dbeafe', color: '#1d4ed8' },
      '참석': { bg: '#dcfce7', color: '#16a34a' },
      '대기': { bg: '#fef3c7', color: '#d97706' },
      '취소': { bg: '#fee2e2', color: '#dc2626' },
      'cancelled': { bg: '#fee2e2', color: '#dc2626' },
      'auto_cancelled': { bg: '#fef3c7', color: '#d97706' },
      'confirmed': { bg: '#dcfce7', color: '#16a34a' },
      'pending': { bg: '#e0e7ff', color: '#4f46e5' },
    };
    const style = styles[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
      }}>
        {status === 'auto_cancelled' ? '자동취소' : status === 'cancelled' ? '취소' : status}
      </span>
    );
  };

  // 타임라인 이벤트 생성
  const buildTimeline = () => {
    const events = [];

    // 설명회 예약
    journey.seminars.forEach(s => {
      events.push({
        date: s.created_at,
        type: 'seminar_reservation',
        label: '설명회 예약',
        detail: `${formatDateTime(s.seminar_slots?.date, s.seminar_slots?.time)} ${s.seminar_slots?.location || ''}`,
        status: s.status,
        icon: '📝',
      });
      if (s.status === '참석') {
        events.push({
          date: s.seminar_slots?.date,
          type: 'seminar_attend',
          label: '설명회 참석',
          detail: s.seminar_slots?.location || '',
          status: '참석',
          icon: '🎓',
        });
      }
    });

    // 컨설팅 예약
    journey.consultings.forEach(c => {
      events.push({
        date: c.created_at,
        type: 'consulting_reservation',
        label: '컨설팅 예약',
        detail: `${formatDateTime(c.consulting_slots?.date, c.consulting_slots?.time)} ${c.consulting_slots?.location || ''}`,
        status: c.status,
        icon: '📅',
      });
      if (c.status === 'auto_cancelled' || c.status === 'cancelled') {
        events.push({
          date: c.cancelled_at || c.created_at,
          type: 'consulting_cancel',
          label: '컨설팅 취소',
          detail: c.cancel_reason || (c.status === 'auto_cancelled' ? '자동 취소' : '수동 취소'),
          status: c.status,
          icon: '❌',
        });
      }
      if (c.consulted_at) {
        events.push({
          date: c.consulted_at,
          type: 'consulting_done',
          label: '컨설팅 완료',
          detail: `등록상태: ${c.enrollment_status || '미정'}`,
          status: c.enrollment_status === '확정' ? '확정' : '완료',
          icon: '✅',
        });
      }
    });

    // 진단검사 예약
    journey.tests.forEach(t => {
      events.push({
        date: t.created_at,
        type: 'test_reservation',
        label: '진단검사 예약',
        detail: `${formatDateTime(t.test_slots?.date, t.test_slots?.time)} ${t.test_slots?.location || ''}`,
        status: t.status,
        icon: '📋',
      });
    });

    // 진단검사 결과
    journey.results.forEach(r => {
      events.push({
        date: r.created_at,
        type: 'test_result',
        label: '진단검사 완료',
        detail: `총점: ${r.total_score?.toFixed(1) || 0}점`,
        status: '완료',
        icon: '🏆',
      });
    });

    // 날짜순 정렬 (최신 먼저)
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const timeline = buildTimeline();

  if (!phone) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>고객 여정</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>로딩 중...</p>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            {/* 기본 정보 */}
            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b' }}>
                기본 정보
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>연락처</span>
                  <div style={{ fontWeight: '600' }}>{phone}</div>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>학생명</span>
                  <div style={{ fontWeight: '600' }}>{journey.profile?.student_name || '-'}</div>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>학교</span>
                  <div>{journey.profile?.school || '-'}</div>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>학년</span>
                  <div>{journey.profile?.grade || '-'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>수학 선행</span>
                  <div>{journey.profile?.math_level || '-'}</div>
                </div>
              </div>
            </div>

            {/* 요약 통계 */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}>
              <div style={{ background: '#dbeafe', padding: '8px 16px', borderRadius: '8px', flex: 1, textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1d4ed8' }}>{journey.seminars.length}</div>
                <div style={{ fontSize: '12px', color: '#3b82f6' }}>설명회</div>
              </div>
              <div style={{ background: '#dcfce7', padding: '8px 16px', borderRadius: '8px', flex: 1, textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{journey.consultings.filter(c => !['cancelled', 'auto_cancelled'].includes(c.status)).length}</div>
                <div style={{ fontSize: '12px', color: '#22c55e' }}>컨설팅</div>
              </div>
              <div style={{ background: '#fef3c7', padding: '8px 16px', borderRadius: '8px', flex: 1, textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#d97706' }}>{journey.tests.length}</div>
                <div style={{ fontSize: '12px', color: '#f59e0b' }}>진단검사</div>
              </div>
              <div style={{ background: '#e0e7ff', padding: '8px 16px', borderRadius: '8px', flex: 1, textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#4f46e5' }}>{journey.results.length}</div>
                <div style={{ fontSize: '12px', color: '#6366f1' }}>결과</div>
              </div>
            </div>

            {/* 타임라인 */}
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b' }}>
              타임라인 (최신순)
            </h3>
            {timeline.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                기록이 없습니다.
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* 타임라인 라인 */}
                <div style={{
                  position: 'absolute',
                  left: '15px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  background: '#e2e8f0',
                }} />

                {timeline.map((event, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom: '16px',
                      position: 'relative',
                    }}
                  >
                    {/* 아이콘 */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#fff',
                      border: '2px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      zIndex: 1,
                    }}>
                      {event.icon}
                    </div>

                    {/* 내용 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{event.label}</span>
                        {getStatusBadge(event.status)}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>{event.detail}</div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                        {formatTimestamp(event.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
