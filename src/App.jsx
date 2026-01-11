// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  ReservationProvider,
  useReservation,
} from './context/ReservationContext';
import { ConsultingProvider, useConsulting } from './context/ConsultingContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { DiagnosticProvider, useDiagnostic } from './context/DiagnosticContext';
import ReservationPage from './pages/ReservationPage';
import ReservationPasswordReset from './pages/ReservationPasswordReset';
import ConsultingPage from './pages/ConsultingPage';
import ConsultingPasswordReset from './pages/ConsultingPasswordReset';
import TestGuidePage from './pages/TestGuidePage';
import DiagnosticTestPage from './pages/DiagnosticTestPage';
import DiagnosticReportPage from './pages/DiagnosticReportPage';
import AdminLogin from './pages/admin/AdminLogin';
import CampaignList from './pages/admin/CampaignList';
import CampaignDetail from './pages/admin/CampaignDetail';
import DiagnosticGrading from './pages/admin/DiagnosticGrading';
import ProtectedRoute from './components/admin/ProtectedRoute';
import Loading from './components/common/Loading';
import Toast from './components/common/Toast';

function AppContent() {
  const reservationContext = useReservation();
  const consultingContext = useConsulting();
  const adminContext = useAdmin();
  const diagnosticContext = useDiagnostic();

  // 어느 Context라도 로딩 중이면 표시
  const loading =
    reservationContext.loading ||
    consultingContext.loading ||
    adminContext.loading ||
    diagnosticContext.loading;

  // Toast 우선순위: admin > diagnostic > reservation > consulting
  const toast =
    adminContext.toast ||
    diagnosticContext.toast ||
    reservationContext.toast ||
    consultingContext.toast;
  const hideToast = adminContext.toast
    ? adminContext.hideToast
    : diagnosticContext.toast
    ? diagnosticContext.hideToast
    : reservationContext.toast
    ? reservationContext.hideToast
    : consultingContext.hideToast;

  return (
    <>
      <Routes>
        {/* 고객용 페이지 */}
        <Route path="/" element={<ReservationPage />} />
        <Route path="/reservation" element={<ReservationPage />} />
        <Route path="/reservation/password-reset" element={<ReservationPasswordReset />} />
        <Route path="/consulting" element={<ConsultingPage />} />
        <Route path="/consulting/password-reset" element={<ConsultingPasswordReset />} />
        <Route path="/test-guide" element={<TestGuidePage />} />
        <Route path="/diagnostic-test" element={<DiagnosticTestPage />} />
        <Route path="/diagnostic-report/:id" element={<DiagnosticReportPage />} />

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
        <Route
          path="/admin/diagnostic-grading"
          element={
            <ProtectedRoute>
              <DiagnosticGrading />
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
            <DiagnosticProvider>
              <AppContent />
            </DiagnosticProvider>
          </ConsultingProvider>
        </ReservationProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
