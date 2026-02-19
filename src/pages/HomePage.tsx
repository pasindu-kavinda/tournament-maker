import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, MapPin, Eye } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastViewport, ToastClose } from '../components/Toast';
import UserDropdown from '@/components/UserDropdown';

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

const TOURNAMENT_TYPES = [
  { value: 'men-single', label: "Men's Single" },
  { value: 'women-single', label: "Women's Single" },
  { value: 'men-double', label: "Men's Double" },
  { value: 'women-double', label: "Women's Double" },
  { value: 'mixed-double', label: "Mixed Double" },
  { value: 'mixed-single', label: "Mixed Single" }
];
const TOURNAMENT_STRUCTURES = [
  { value: 'round-robin', label: 'Round Robin' },
  { value: 'groups', label: 'Groups' },
  { value: 'knockout', label: 'Knockout' }
];
const HomePage = ({ user }: HomePageProps) => {
  const navigate = useNavigate();
  const [tournamentName, setTournamentName] = useState('');
  const [venue, setVenue] = useState(VENUES[0]);
  const [tournamentType, setTournamentType] = useState(TOURNAMENT_TYPES[0].value);
  const [tournamentStructure, setTournamentStructure] = useState(TOURNAMENT_STRUCTURES[0].value);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [toast, setToast] = useState<{ title: string; description: string; variant: 'success' | 'error' } | null>(null);
  const [displayName, setDisplayName] = useState('User');

  useEffect(() => {
    loadTournaments();
    loadUserName();
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

  const loadUserName = async () => {
    const { data } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (data) setDisplayName(data.full_name || 'User');
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
        venue: venue,
        type: tournamentType,
        structure: tournamentStructure
      })
      .select()
      .single();

    if (error) {
      showToast('Error', error.message, 'error');
    } else if (tournament) {
      navigate(`/tournament/${tournament.id}`);
    }
  };

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
                <UserDropdown displayName={displayName} />
              </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="w-10 h-10 text-indigo-600" />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/stats')}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition"
                    title="View Stats"
                  >
                    <TrendingUp className="w-6 h-6" />
                  </button>
                  <UserDropdown displayName={displayName} />
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Tournament Brackets Maker</h1>
            <p className="text-gray-600">Create and manage tournaments!</p>
          </header>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Create New Tournament</h2>

              <div className="space-y-4 mb-5">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tournament Structure
                  </label>
                  <select
                    value={tournamentStructure}
                    onChange={(e) => setTournamentStructure(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {TOURNAMENT_STRUCTURES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tournament Type
                  </label>
                  <select
                    value={tournamentType}
                    onChange={(e) => setTournamentType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {TOURNAMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleCreateTournament}
                disabled={!tournamentName.trim()}
                className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Tournament
              </button>
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
                    <div className="mb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 break-words sm:truncate pr-2">{tournament.name}</h3>

                          {/* Desktop Status */}
                          <div className="hidden sm:flex items-center gap-2 mt-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${tournament.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : tournament.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                              {tournament.status === 'in_progress' ? 'Live' : tournament.status.replace('_', ' ')}
                            </span>
                            {/* @ts-ignore */}
                            {tournament.type && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {/* @ts-ignore */}
                                {tournament.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            )}
                            {/* @ts-ignore */}
                            {tournament.structure && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {/* @ts-ignore */}
                                {tournament.structure.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desktop Inspect Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tournament/${tournament.id}/view`);
                          }}
                          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium flex-shrink-0"
                          title="Live Inspect"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Inspect</span>
                        </button>
                      </div>

                      {/* Mobile Controls Row */}
                      <div className="flex sm:hidden items-center justify-between mt-3">
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${tournament.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : tournament.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {tournament.status === 'in_progress' ? 'Live' : tournament.status.replace('_', ' ')}
                          </span>
                          {/* @ts-ignore */}
                          {tournament.type && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {/* @ts-ignore */}
                              {tournament.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tournament/${tournament.id}/view`);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                          title="Live Inspect"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Inspect</span>
                        </button>
                      </div>
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
        {
          toast && (
            <Toast className={`${toast.variant === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="grid gap-1">
                <ToastTitle className={`${toast.variant === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                  {toast.title}
                </ToastTitle>
                <ToastDescription className={`${toast.variant === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {toast.description}
                </ToastDescription>
              </div>
              <ToastClose />
            </Toast>
          )
        }
        <ToastViewport />
      </ToastProvider >
    </div >
  );
};

export default HomePage;