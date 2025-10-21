// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  ReservationProvider,
  useReservation,
} from './context/ReservationContext';
import { ConsultingProvider, useConsulting } from './context/ConsultingContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import ReservationPage from './pages/ReservationPage';
import ConsultingPage from './pages/ConsultingPage';
import TestGuidePage from './pages/TestGuidePage';
import AdminLogin from './pages/admin/AdminLogin';
import CampaignList from './pages/admin/CampaignList';
import CampaignDetail from './pages/admin/CampaignDetail';
import ProtectedRoute from './components/admin/ProtectedRoute';
import Loading from './components/common/Loading';
import Toast from './components/common/Toast';

function AppContent() {
  const reservationContext = useReservation();
  const consultingContext = useConsulting();
  const adminContext = useAdmin();

  // 어느 Context라도 로딩 중이면 표시
  const loading =
    reservationContext.loading ||
    consultingContext.loading ||
    adminContext.loading;

  // Toast 우선순위: admin > reservation > consulting
  const toast =
    adminContext.toast || reservationContext.toast || consultingContext.toast;
  const hideToast = adminContext.toast
    ? adminContext.hideToast
    : reservationContext.toast
    ? reservationContext.hideToast
    : consultingContext.hideToast;

  return (
    <>
      <Routes>
        {/* 고객용 페이지 */}
        <Route path="/" element={<ReservationPage />} />
        <Route path="/consulting" element={<ConsultingPage />} />
        <Route path="/test-guide" element={<TestGuidePage />} />

        {/* 관리자 페이지 */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/campaigns"
          element={
            <ProtectedRoute>
              <CampaignList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/campaigns/:id"
          element={
            <ProtectedRoute>
              <CampaignDetail />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* 공통 컴포넌트 */}
      {loading && <Loading />}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration || 3000}
          onClose={hideToast}
        />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <ReservationProvider>
          <ConsultingProvider>
            <AppContent />
          </ConsultingProvider>
        </ReservationProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
