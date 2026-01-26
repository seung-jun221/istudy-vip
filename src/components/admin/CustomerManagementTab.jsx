import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import './AdminTabs.css';

export default function CustomerManagementTab({ campaignId, onPhoneClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // all, 대기중, 처리중, 처리완료
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // 신규 고객 폼 상태
  const [newCustomer, setNewCustomer] = useState({
    parent_phone: '',
    student_name: '',
    memo: '',
    status: '대기중',
  });

  useEffect(() => {
    loadCustomers();
  }, [campaignId]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // customer_memos 테이블에서 캠페인에 해당하는 메모 조회
      const { data, error } = await supabase
        .from('customer_memos')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('고객 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.parent_phone?.includes(searchTerm) ||
      customer.student_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 상태별 카운트
  const statusCounts = {
    all: customers.length,
    '대기중': customers.filter(c => c.status === '대기중').length,
    '처리중': customers.filter(c => c.status === '처리중').length,
    '처리완료': customers.filter(c => c.status === '처리완료').length,
  };

  // 신규 고객 등록
  const handleAddCustomer = async () => {
    if (!newCustomer.parent_phone) {
      alert('연락처를 입력해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_memos')
        .insert({
          parent_phone: newCustomer.parent_phone,
          student_name: newCustomer.student_name || null,
          memo: newCustomer.memo || null,
          status: newCustomer.status,
          campaign_id: campaignId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      alert('고객이 등록되었습니다.');
      setIsAddModalOpen(false);
      setNewCustomer({
        parent_phone: '',
        student_name: '',
        memo: '',
        status: '대기중',
      });
      loadCustomers();
    } catch (error) {
      console.error('고객 등록 실패:', error);
      alert('고객 등록에 실패했습니다.');
    }
  };

  // 상태 변경
  const handleStatusChange = async (customerId, newStatus) => {
    try {
      const { error } = await supabase
        .from('customer_memos')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setCustomers(prev =>
        prev.map(c => (c.id === customerId ? { ...c, status: newStatus } : c))
      );
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 메모 수정
  const handleMemoUpdate = async (customerId, newMemo) => {
    try {
      const { error } = await supabase
        .from('customer_memos')
        .update({
          memo: newMemo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setCustomers(prev =>
        prev.map(c => (c.id === customerId ? { ...c, memo: newMemo } : c))
      );
    } catch (error) {
      console.error('메모 수정 실패:', error);
    }
  };

  // 고객 삭제
  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('이 고객 정보를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('customer_memos')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      setCustomers(prev => prev.filter(c => c.id !== customerId));
    } catch (error) {
      console.error('고객 삭제 실패:', error);
      alert('삭제에 실패했습니다.');
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
      {/* 상태 필터 탭 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
      }}>
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

      {/* 검색 및 추가 버튼 */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="전화번호 또는 학생명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          className="btn-primary"
          onClick={() => setIsAddModalOpen(true)}
          style={{ background: '#1a73e8', borderColor: '#1a73e8' }}
        >
          신규 고객 등록
        </button>
      </div>

      {/* 고객 목록 */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      ) : filteredCustomers.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          {searchTerm ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
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
                <th>등록일</th>
                <th>수정일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const statusStyle = getStatusStyle(customer.status);
                return (
                  <tr key={customer.id}>
                    <td>
                      <span
                        onClick={() => onPhoneClick?.(customer.parent_phone)}
                        style={{
                          cursor: onPhoneClick ? 'pointer' : 'default',
                          color: onPhoneClick ? '#1a73e8' : 'inherit',
                          textDecoration: onPhoneClick ? 'underline' : 'none',
                        }}
                      >
                        {customer.parent_phone}
                      </span>
                    </td>
                    <td>{customer.student_name || '-'}</td>
                    <td>
                      <select
                        value={customer.status || '대기중'}
                        onChange={(e) => handleStatusChange(customer.id, e.target.value)}
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
                    <td>
                      {editingCustomer === customer.id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="text"
                            defaultValue={customer.memo || ''}
                            onBlur={(e) => {
                              handleMemoUpdate(customer.id, e.target.value);
                              setEditingCustomer(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleMemoUpdate(customer.id, e.target.value);
                                setEditingCustomer(null);
                              }
                              if (e.key === 'Escape') {
                                setEditingCustomer(null);
                              }
                            }}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                      ) : (
                        <span
                          onClick={() => setEditingCustomer(customer.id)}
                          style={{
                            cursor: 'pointer',
                            color: customer.memo ? '#333' : '#94a3b8',
                            maxWidth: '200px',
                            display: 'inline-block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={customer.memo || '클릭하여 메모 입력'}
                        >
                          {customer.memo || '메모 입력...'}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {formatDateTime(customer.created_at)}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {formatDateTime(customer.updated_at)}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        삭제
                      </button>
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
        총 {filteredCustomers.length}명
        {statusFilter !== 'all' && ` (${statusFilter})`}
        {searchTerm && ` (검색 결과)`}
      </div>

      {/* 신규 고객 등록 모달 */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px' }}
          >
            <div className="modal-header">
              <h2>신규 고객 등록</h2>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  연락처 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={newCustomer.parent_phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, parent_phone: e.target.value })}
                  placeholder="010-0000-0000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  학생명
                </label>
                <input
                  type="text"
                  value={newCustomer.student_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, student_name: e.target.value })}
                  placeholder="학생 이름"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  상태
                </label>
                <select
                  value={newCustomer.status}
                  onChange={(e) => setNewCustomer({ ...newCustomer, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="대기중">대기중</option>
                  <option value="처리중">처리중</option>
                  <option value="처리완료">처리완료</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  메모
                </label>
                <textarea
                  value={newCustomer.memo}
                  onChange={(e) => setNewCustomer({ ...newCustomer, memo: e.target.value })}
                  placeholder="문의 내용, 특이사항 등..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleAddCustomer}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#1a73e8',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
