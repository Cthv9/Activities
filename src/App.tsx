import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import SettingsPage from './pages/SettingsPage';

function RequireFamily({ children }: { children: React.ReactNode }) {
  const { member, loading } = useAuth();
  if (loading) return <div className="p-6 text-text-secondary">Caricamento…</div>;
  if (!member) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
