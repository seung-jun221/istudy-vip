import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabase';
import { useAdmin } from '../../context/AdminContext';
import { formatTimestampShort, formatDateTimeForExcel } from '../../utils/format';
import './CampaignList.css';

const COURSE_OPTIONS = {
  1: '초등 교과반 바로 입학 (주2회 / 초4~초6)',
  2: '중등입문 방학특강 → 9월 정규/주1회',
  3: '중등심화 방학특강 → 9월 정규/주1회',
  4: '고등 교과반 바로 입학 (정규/주1회)',
  5: '상담 후 결정 (맞는 과정 상담 요청)',
};

const STATUS_OPTIONS = ['신청', '연락중', '등록완료', '취소'];

const statusBgColor = {
  '신청': '#d1ecf1',
  '연락중': '#fff3cd',
  '등록완료': '#d4edda',
  '취소': '#f5c6cb',
};

export default function CourseEnrollmentsAdmin() {
  const navigate = useNavigate();
  const { authMode, logout } = useAdmin();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  useEffect(() => {
    if (authMode !== 'super') {
      navigate('/admin/campaigns', { replace: true });
      return;
    }
    fetchEnrollments();
  }, [authMode, navigate]);

  const fetchEnrollments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('수강신청 로드 실패:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } else {
      setEnrollments(data || []);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('course_enrollments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경 실패');
      return;
    }
    setEnrollments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );
  };

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (courseFilter !== 'all' && e.course_option !== parseInt(courseFilter, 10))
        return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !e.student_name?.toLowerCase().includes(term) &&
          !e.parent_phone?.includes(term) &&
          !e.school?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [enrollments, statusFilter, courseFilter, searchTerm]);

  const stats = useMemo(() => {
    return enrollments.reduce(
      (acc, e) => {
        acc.total++;
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      },
      { total: 0 }
    );
  }, [enrollments]);

  const handleExportExcel = () => {
    const excelData = filtered.map((e) => ({
      신청일시: formatDateTimeForExcel(e.created_at),
      학생명: e.student_name || '',
      학년: e.grade || '',
      학교: e.school || '',
      선행정도: e.math_level || '',
      '학부모 연락처': e.parent_phone || '',
      '희망 수강': COURSE_OPTIONS[e.course_option] || '',
      문의사항: e.notes || '',
      상태: e.status || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 },
      { wch: 30 },
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '수강신청');

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `수강신청_사직점_${dateStr}.xlsx`);
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/admin/login');
    }
  };

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
            <h1>수강신청 관리 · 사직점 7월</h1>
          </div>
          <div className="admin-header-actions">
            <button className="btn btn-primary" onClick={handleExportExcel}>
              엑셀 다운로드
            </button>
            <button className="btn btn-secondary" onClick={fetchEnrollments}>
              새로고침
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/admin/campaigns')}
            >
              캠페인 목록
            </button>
            <button className="btn btn-outline" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="campaign-list-content">
        {/* 통계 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          {['total', '신청', '연락중', '등록완료', '취소'].map((k) => (
            <div
              key={k}
              style={{
                padding: '12px 20px',
                background: '#f5f5f5',
                borderRadius: '8px',
                minWidth: '100px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                {k === 'total' ? '전체' : k}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {stats[k] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="학생명 / 전화번호 / 학교 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1 1 200px',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="all">전체 상태</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="all">전체 수강</option>
            {Object.entries(COURSE_OPTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {k}번: {v}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>수강신청 로드 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>수강신청 내역이 없습니다.</p>
          </div>
        ) : (
          <div
            style={{
              overflowX: 'auto',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    신청일시
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>학생명</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>학년</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>학교</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>선행정도</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    학부모 연락처
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '250px' }}>
                    희망 수강
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>문의사항</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td style={{ padding: '12px 8px', whiteSpace: 'nowrap', color: '#666', fontSize: '13px' }}>
                      {formatTimestampShort(e.created_at)}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>
                      {e.student_name}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{e.grade || '-'}</td>
                    <td style={{ padding: '12px 8px' }}>{e.school || '-'}</td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      {e.math_level || '-'}
                    </td>
                    <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                      <a
                        href={`tel:${e.parent_phone}`}
                        style={{ color: '#1a73e8', textDecoration: 'underline' }}
                      >
                        {e.parent_phone}
                      </a>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            background: '#eef2ff',
                            color: '#4338ca',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {e.course_option}
                        </span>
                        <span style={{ fontSize: '13px' }}>
                          {COURSE_OPTIONS[e.course_option]}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '12px 8px',
                        fontSize: '13px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={e.notes || ''}
                    >
                      {e.notes || '-'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <select
                        value={e.status}
                        onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          fontSize: '13px',
                          cursor: 'pointer',
                          backgroundColor: statusBgColor[e.status] || '#fff',
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '16px', color: '#666', fontSize: '13px' }}>
          총 {filtered.length}건 (전체 {enrollments.length}건)
        </div>
      </div>
    </div>
  );
}
