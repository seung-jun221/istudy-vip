import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';
import { useAdmin } from '../../../context/AdminContext';
import StudentsTab from './StudentsTab';
import QuestionsTab from './QuestionsTab';
import SessionsTab from './SessionsTab';
import '../CampaignList.css';

export default function MetacogAdmin() {
  const navigate = useNavigate();
  const { logout, authMode, allowedBranchId } = useAdmin();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [tab, setTab] = useState('students');
  const [loading, setLoading] = useState(true);

  // super_admin: 지점 선택 가능 / branch_admin: 본인 지점 자동
  useEffect(() => {
    async function loadBranches() {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('id, code, name')
        .eq('active', true)
        .order('code');

      if (error) {
        console.error('지점 목록 로드 실패:', error);
        setBranches([]);
      } else {
        setBranches(data || []);
        // 초기 선택: branch_admin은 자기 지점, super_admin은 첫 지점
        if (authMode === 'branch' && allowedBranchId) {
          setSelectedBranchId(allowedBranchId);
        } else if (data && data.length > 0) {
          setSelectedBranchId(data[0].id);
        }
      }
      setLoading(false);
    }
    loadBranches();
  }, [authMode, allowedBranchId]);

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/admin/login');
    }
  };

  const currentBranch = branches.find((b) => b.id === selectedBranchId);
  const canManageQuestions = authMode === 'super'; // 문항 업로드는 super만

  return (
    <div className="campaign-list-container">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-title">
            <img
              src="/assets/images/istudy-logo.png"
              alt="아이스터디"
              className="admin-logo"
            />
            <h1>메타인지 트레이닝 관리</h1>
          </div>
          <div className="admin-header-actions">
            {authMode === 'super' && (
              <button
                className="btn btn-outline"
                onClick={() => navigate('/admin/campaigns')}
              >
                예약 관리로
              </button>
            )}
            <button className="btn btn-outline" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="campaign-list-content">
        {/* 지점 선택 / 표시 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '20px',
            padding: '12px 16px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            지점
          </span>
          {authMode === 'super' && branches.length > 1 ? (
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 600 }}>
              {currentBranch ? currentBranch.name : '(지점 없음)'}
            </span>
          )}
        </div>

        {/* 탭 */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            borderBottom: '2px solid #e5e7eb',
            marginBottom: '20px',
          }}
        >
          {[
            { key: 'students', label: '학생 명부' },
            { key: 'sessions', label: '회차' },
            ...(canManageQuestions
              ? [{ key: 'questions', label: '문항' }]
              : []),
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: tab === t.key ? '#1976d2' : 'transparent',
                color: tab === t.key ? 'white' : '#333',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                fontSize: '14px',
                fontWeight: tab === t.key ? 700 : 500,
                position: 'relative',
                top: '2px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p>로드 중...</p>
          </div>
        ) : !selectedBranchId ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            지점이 없습니다. Super Admin에게 문의하세요.
          </div>
        ) : (
          <>
            {tab === 'students' && (
              <StudentsTab branchId={selectedBranchId} />
            )}
            {tab === 'sessions' && (
              <SessionsTab branchId={selectedBranchId} />
            )}
            {tab === 'questions' && canManageQuestions && (
              <QuestionsTab />
            )}
          </>
        )}
      </div>
    </div>
  );
}
