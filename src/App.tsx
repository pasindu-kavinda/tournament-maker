import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import StatsPage from './pages/StatsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TournamentPublicView from './pages/TournamentPublicView';
import Auth from './components/Auth';
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
            <Route path="/stats" element={<StatsPage user={user} />} />
            <Route path="/tournament/:id" element={<TournamentPage user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;