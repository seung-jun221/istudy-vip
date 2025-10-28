import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(password);

      if (result.success) {
        if (result.mode === 'super') {
          // 수퍼 관리자 - 캠페인 목록으로
          navigate('/admin/campaigns');
        } else if (result.mode === 'campaign') {
          // 캠페인 관리자 - 해당 캠페인 상세 페이지로
          navigate(`/admin/campaigns/${result.campaignId}`);
        }
      } else {
        setError('비밀번호가 올바르지 않습니다.');
        setPassword('');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>관리자 로그인</h1>
          <p>i.study VIP 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="관리자 비밀번호를 입력하세요"
              autoFocus
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
