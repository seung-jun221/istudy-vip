import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import './AdminTabs.css';

export default function CustomerManagementTab({ campaignId, onPhoneClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [memos, setMemos] = useState([]); // 상태가 있는 메모 목록
  const [searchResults, setSearchResults] = useState([]); // 검색 결과
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // all, 대기중, 처리중, 처리완료

  useEffect(() => {
    loadMemos();
  }, [campaignId]);

  // 상태가 설정된 메모 목록 로드
  const loadMemos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_memos')
        .select('*')
        .eq('campaign_id', campaignId)
        .not('status', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setMemos(data || []);
    } catch (error) {
      console.error('메모 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 연락처/학생명 검색 (모든 예약자 대상)
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = [];
      const seenPhones = new Set();

      // 1. 설명회 예약자 검색
      const { data: seminars } = await supabase
        .from('reservations')
        .select('parent_phone, student_name, school, grade, seminar_slots(location)')
        .or(`parent_phone.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%`);

      seminars?.forEach(s => {
        if (!seenPhones.has(s.parent_phone)) {
          seenPhones.add(s.parent_phone);
          results.push({
            parent_phone: s.parent_phone,
            student_name: s.student_name,
            school: s.school,
            grade: s.grade,
            source: '설명회',
            location: s.seminar_slots?.location,
          });
        }
      });

      // 2. 컨설팅 예약자 검색
      const { data: consultings } = await supabase
        .from('consulting_reservations')
        .select('parent_phone, student_name, school, grade, consulting_slots(location)')
        .or(`parent_phone.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%`);

      consultings?.forEach(c => {
        if (!seenPhones.has(c.parent_phone)) {
          seenPhones.add(c.parent_phone);
          results.push({
            parent_phone: c.parent_phone,
            student_name: c.student_name,
            school: c.school,
            grade: c.grade,
            source: '컨설팅',
            location: c.consulting_slots?.location,
          });
        }
      });

      // 3. 진단검사 예약자 검색
      const { data: tests } = await supabase
        .from('test_reservations')
        .select('parent_phone, student_name, school, grade, test_slots(location)')
        .or(`parent_phone.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%`);

      tests?.forEach(t => {
        if (!seenPhones.has(t.parent_phone)) {
          seenPhones.add(t.parent_phone);
          results.push({
            parent_phone: t.parent_phone,
            student_name: t.student_name,
            school: t.school,
            grade: t.grade,
            source: '진단검사',
            location: t.test_slots?.location,
          });
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setSearching(false);
    }
  };

  // 검색어 변경 시 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 필터링된 메모 목록
  const filteredMemos = memos.filter(memo => {
    return statusFilter === 'all' || memo.status === statusFilter;
  });

  // 상태별 카운트
  const statusCounts = {
    all: memos.length,
    '대기중': memos.filter(m => m.status === '대기중').length,
    '처리중': memos.filter(m => m.status === '처리중').length,
    '처리완료': memos.filter(m => m.status === '처리완료').length,
  };

  // 상태 변경
  const handleStatusChange = async (memoId, newStatus) => {
    try {
      const { error } = await supabase
        .from('customer_memos')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId);

      if (error) throw error;

      setMemos(prev =>
        prev.map(m => (m.id === memoId ? { ...m, status: newStatus } : m))
      );
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getStatusStyle = (status) => {
    const styles = {
      '대기중': { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
      '처리중': { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
      '처리완료': { bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
    };
    return styles[status] || { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };
  };

  return (
    <div className="tab-container">
      {/* 고객 검색 섹션 */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0369a1' }}>
          고객 검색 (전체 예약자 대상)
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="전화번호 또는 학생명으로 검색..."
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>

        {/* 검색 결과 */}
        {searching && (
          <div style={{ marginTop: '12px', color: '#64748b', fontSize: '13px' }}>
            검색 중...
          </div>
        )}
        {!searching && searchResults.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
              검색 결과: {searchResults.length}건
            </div>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white',
            }}>
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => onPhoneClick?.(result.parent_phone)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  className="hover-row"
                >
                  <div>
                    <div style={{ fontWeight: '500' }}>
                      {result.student_name || '-'}
                      <span style={{ color: '#64748b', fontWeight: '400', marginLeft: '8px' }}>
                        {result.parent_phone}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {result.school} {result.grade}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    color: '#64748b',
                  }}>
                    {result.source}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              클릭하면 고객 여정을 확인하고 메모를 작성할 수 있습니다.
            </div>
          </div>
        )}
        {!searching && searchTerm && searchResults.length === 0 && (
          <div style={{ marginTop: '12px', color: '#94a3b8', fontSize: '13px' }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* 상태 필터 탭 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
      }}>
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', alignSelf: 'center', marginRight: '8px' }}>
          메모 목록:
        </span>
        {[
          { value: 'all', label: '전체' },
          { value: '대기중', label: '대기중' },
          { value: '처리중', label: '처리중' },
          { value: '처리완료', label: '처리완료' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: statusFilter === tab.value ? '2px solid #1a73e8' : '1px solid #e2e8f0',
              background: statusFilter === tab.value ? '#e0f2fe' : 'white',
              color: statusFilter === tab.value ? '#1a73e8' : '#64748b',
              fontWeight: statusFilter === tab.value ? '600' : '400',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {tab.label} ({statusCounts[tab.value]})
          </button>
        ))}
      </div>

      {/* 메모 목록 */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      ) : filteredMemos.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          {statusFilter === 'all'
            ? '상태가 설정된 메모가 없습니다. 위 검색에서 고객을 찾아 메모를 작성해주세요.'
            : `${statusFilter} 상태의 메모가 없습니다.`}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>연락처</th>
                <th>학생명</th>
                <th>상태</th>
                <th>메모</th>
                <th>수정일</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemos.map((memo) => {
                const statusStyle = getStatusStyle(memo.status);
                return (
                  <tr key={memo.id}>
                    <td>
                      <span
                        onClick={() => onPhoneClick?.(memo.parent_phone)}
                        style={{
                          cursor: 'pointer',
                          color: '#1a73e8',
                          textDecoration: 'underline',
                        }}
                      >
                        {memo.parent_phone}
                      </span>
                    </td>
                    <td>{memo.student_name || '-'}</td>
                    <td>
                      <select
                        value={memo.status || '대기중'}
                        onChange={(e) => handleStatusChange(memo.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${statusStyle.border}`,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: '500',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="대기중">대기중</option>
                        <option value="처리중">처리중</option>
                        <option value="처리완료">처리완료</option>
                      </select>
                    </td>
                    <td style={{
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={memo.memo}>
                      {memo.memo || '-'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {formatDateTime(memo.updated_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 요약 */}
      <div className="summary-bar">
        총 {filteredMemos.length}명
        {statusFilter !== 'all' && ` (${statusFilter})`}
      </div>

      <style>{`
        .hover-row:hover {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
