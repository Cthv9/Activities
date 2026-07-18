import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useServiceWorker } from './lib/registerSW';
import { ROUTER_BASENAME } from './lib/appUrl';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import OnboardingPage from './pages/OnboardingPage';

// Home e Dettaglio attività trascinano recharts/date-fns: caricate on-demand
// per non appesantire il primo avvio (importante su una PWA mobile offline-first).
const homeImport = () => import('./pages/HomePage');
const HomePage = lazy(homeImport);
const ActivityDetailPage = lazy(() => import('./pages/ActivityDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// La Home è la destinazione quasi certa: avviamo il download del suo chunk
// subito, in parallelo al controllo della sessione, così quando il gate di
// autenticazione si apre il codice è già pronto (niente waterfall lazy dopo
// il login). Il chunk resta comunque separato dal primo paint.
void homeImport();

function RequireFamily({ children }: { children: React.ReactNode }) {
  const { member, loading } = useAuth();
  if (loading) return <div className="p-6 text-text-secondary">Caricamento…</div>;
  if (!member) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function PageFallback() {
  return <div className="p-6 text-text-secondary">Caricamento…</div>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/"
          element={
            <RequireFamily>
              <HomePage />
            </RequireFamily>
          }
        />
        <Route
          path="/activities/:activityId"
          element={
            <RequireFamily>
              <ActivityDetailPage />
            </RequireFamily>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireFamily>
              <SettingsPage />
            </RequireFamily>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  useServiceWorker();

  return (
    <AuthProvider>
      <BrowserRouter basename={ROUTER_BASENAME}>
        <OfflineStatusBanner />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
