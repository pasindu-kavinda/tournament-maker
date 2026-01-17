import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, MapPin, User as UserIcon, TrendingUp, Menu, X, Shield } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/contexts/AdminContext';
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastViewport, ToastClose } from '../components/Toast';

interface HomePageProps {
  user: User;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  created_at: string;
  venue: string;
}

const VENUES = [
  'Ambalangoda Urban Council Badminton Court',
  'Badminton Stadium Dharmasoka College',
  'Kandegoda Badminton Court',
  'Batapola Badminton Court'
];

function HomePage({ user }: HomePageProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [tournamentName, setTournamentName] = useState('');
  const [venue, setVenue] = useState(VENUES[0]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [toast, setToast] = useState<{ title: string; description: string; variant: 'success' | 'error' } | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const showToast = (title: string, description: string, variant: 'success' | 'error') => {
    setToast({ title, description, variant });
    setTimeout(() => setToast(null), 5000);
  };

  const loadTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTournaments(data);
  };

  const handleCreateTournament = async () => {
    if (!tournamentName.trim()) {
      showToast('Error', 'Please enter a tournament name', 'error');
      return;
    }

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        name: tournamentName,
        created_by: user.id,
        venue: venue
      })
      .select()
      .single();

    if (error) {
      showToast('Error', error.message, 'error');
    } else if (tournament) {
      navigate(`/tournament/${tournament.id}`);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const displayName = user.user_metadata?.full_name || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
      <ToastProvider>
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between mb-4">
              <div className="flex-1">
                <button
                  onClick={() => navigate('/stats')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition shadow-sm"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">View Stats</span>
                </button>
              </div>
              <div className="flex items-center justify-center flex-1">
                <Trophy className="w-12 h-12 text-indigo-600" />
              </div>
              <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="flex items-center gap-2 text-gray-600">
                  <UserIcon className="w-4 h-4" />
                  <span>{displayName}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Admin</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/profile')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  My Profile
                </button>
                <button
                  onClick={() => navigate('/reset-password')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Reset Password
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="w-10 h-10 text-indigo-600" />
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>

              {/* Mobile Menu */}
              {showMobileMenu && (
                <div className="bg-white rounded-lg shadow-lg p-4 mb-4 space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 text-gray-700 border-b">
                    <UserIcon className="w-4 h-4" />
                    <span className="font-medium">{displayName}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/stats');
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded transition"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>View Stats</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded transition"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>My Profile</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded transition font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigate('/reset-password');
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded transition"
                  >
                    <span>Reset Password</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Tournament Brackets Maker</h1>
            <p className="text-gray-600">Create and manage tournaments!</p>
          </header>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Create New Tournament</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    placeholder="Enter tournament name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue
                  </label>
                  <select
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {VENUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCreateTournament}
                  disabled={!tournamentName.trim()}
                  className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Tournament
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">All Tournaments</h2>
              <div className="space-y-4">
                {tournaments.map(tournament => (
                  <div
                    key={tournament.id}
                    onClick={() => navigate(`/tournament/${tournament.id}`)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium">{tournament.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        tournament.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : tournament.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tournament.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{tournament.venue}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Created: {new Date(tournament.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <Toast className={`${
            toast.variant === 'success' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="grid gap-1">
              <ToastTitle className={`${
                toast.variant === 'success' ? 'text-green-900' : 'text-red-900'
              }`}>
                {toast.title}
              </ToastTitle>
              <ToastDescription className={`${
                toast.variant === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {toast.description}
              </ToastDescription>
            </div>
            <ToastClose />
          </Toast>
        )}
        <ToastViewport />
      </ToastProvider>
    </div>
  );
}

export default HomePage;