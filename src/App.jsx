// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  ReservationProvider,
  useReservation,
} from './context/ReservationContext';
import { ConsultingProvider, useConsulting } from './context/ConsultingContext';
import ReservationPage from './pages/ReservationPage';
import ConsultingPage from './pages/ConsultingPage';
import TestGuidePage from './pages/TestGuidePage'; // ⭐ 추가
import Loading from './components/common/Loading';
import Toast from './components/common/Toast';

function AppContent() {
  const reservationContext = useReservation();
  const consultingContext = useConsulting();

  // 두 Context 중 하나라도 로딩 중이면 표시
  const loading = reservationContext.loading || consultingContext.loading;

  // Toast는 각 Context의 것을 표시
  const toast = reservationContext.toast || consultingContext.toast;
  const hideToast = reservationContext.toast
    ? reservationContext.hideToast
    : consultingContext.hideToast;

  return (
    <>
      <Routes>
        <Route path="/" element={<ReservationPage />} />
        <Route path="/consulting" element={<ConsultingPage />} />
        <Route path="/test-guide" element={<TestGuidePage />} /> {/* ⭐ 추가 */}
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
      <ReservationProvider>
        <ConsultingProvider>
          <AppContent />
        </ConsultingProvider>
      </ReservationProvider>
    </BrowserRouter>
  );
}

export default App;
