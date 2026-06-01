import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = useAdmin();

  // 세션 복원 완료 전엔 리다이렉트하지 않음 (새로고침 시 race condition 회피)
  if (authLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
