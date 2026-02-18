import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminProvider } from './contexts/AdminContext';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import TournamentsPage from './pages/admin/TournamentsPage';
import TournamentEditorPage from './pages/admin/TournamentEditorPage';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import StatsLandingPage from './pages/StatsLandingPage';
import FinalsStatsPage from './pages/FinalsStatsPage';
import OverviewStatsPage from './pages/OverviewStatsPage';
import AchievementsStatsPage from './pages/AchievementsStatsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TournamentPublicView from './pages/TournamentPublicView';
import PlayerProfilePage from './pages/PlayerProfilePage';
import TournamentStructurePage from './pages/TournamentStructurePage';
import Auth from './components/Auth';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AdminProvider user={user}>
        <PWAInstallPrompt />
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/tournament/:id/view" element={<TournamentPublicView />} />
          {!user ? (
            <>
              <Route path="*" element={<Auth />} />
            </>
          ) : (
            <>
              <Route path="/" element={<HomePage user={user} />} />
              <Route path="/stats" element={<StatsLandingPage user={user} />} />
              <Route path="/stats/finals" element={<FinalsStatsPage user={user} />} />
              <Route path="/stats/overview" element={<OverviewStatsPage user={user} />} />
              <Route path="/stats/achievements" element={<AchievementsStatsPage user={user} />} />
              <Route path="/tournament/:id" element={<TournamentPage user={user} />} />
              <Route path="/profile" element={<PlayerProfilePage user={user} />} />
              <Route path="/profile/:userId" element={<PlayerProfilePage user={user} />} />
              <Route path="/structures" element={<TournamentStructurePage />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="tournaments" element={<TournamentsPage />} />
                <Route path="tournament/:id" element={<TournamentEditorPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;