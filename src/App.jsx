import {
  ReservationProvider,
  useReservation,
} from './context/ReservationContext';
import ReservationPage from './pages/ReservationPage';
import Loading from './components/common/Loading';
import Toast from './components/common/Toast';

function AppContent() {
  const { loading, toast, hideToast } = useReservation();

  return (
    <>
      <ReservationPage />
      {loading && <Loading />}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
}

function App() {
  return (
    <ReservationProvider>
      <AppContent />
    </ReservationProvider>
  );
}

export default App;
