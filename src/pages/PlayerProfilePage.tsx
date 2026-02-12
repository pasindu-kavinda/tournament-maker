import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Target, TrendingUp, Award, Calendar, Users, ArrowLeft, Filter, Edit2, Save, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface PlayerProfilePageProps {
    user: User;
}

interface PlayerStats {
    totalTournaments: number;
    tournamentsWon: number;
    totalMatches: number;
    matchesWon: number;
    totalPoints: number;
    winRate: number;
    achievements: Achievement[];
    recentTournaments: TournamentHistory[];
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: string;
}

interface TournamentHistory {
    tournamentId: string;
    tournamentName: string;
    venue: string;
    teamName: string;
    placement: number;
    totalTeams: number;
    completedAt: string;
}

function PlayerProfilePage({ user }: PlayerProfilePageProps) {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [playerName, setPlayerName] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'thisYear' | 'lastYear' | 'thisMonth' | 'lastMonth'>('all');

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const targetUserId = userId || user.id;
    const isOwnProfile = user.id === targetUserId;

    useEffect(() => {
        if (playerName) setEditName(playerName);
    }, [playerName]);

    const handleUpdateProfile = async () => {
        if (!editName.trim()) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ full_name: editName })
                .eq('id', user.id);

            if (error) throw error;

            setPlayerName(editName);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        }
    };

    useEffect(() => {
        loadPlayerStats();
    }, [targetUserId, dateFilter]);

    const loadPlayerStats = async () => {
        setLoading(true);

        // Get player name from users table
        const { data: userProfile } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', targetUserId)
            .single();

        if (userProfile) {
            setPlayerName(userProfile.full_name || 'Player');
        }

        // Calculate date range for filtering
        const now = new Date();
        let startDate: Date | null = null;
        let endDate = now;

        if (dateFilter === 'thisYear') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (dateFilter === 'lastYear') {
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        } else if (dateFilter === 'thisMonth') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateFilter === 'lastMonth') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        }

        // Get all teams player is part of with tournament info
        let teamsQuery = supabase
            .from('teams')
            .select(`
        id,
        name,
        wins,
        points,
        matches_played,
        tournament_id,
        tournaments (
          id,
          name,
          venue,
          status,
          created_at
        )
      `)
            .contains('members', [targetUserId]);

        const { data: teams } = await teamsQuery;

        if (!teams || teams.length === 0) {
            setStats({
                totalTournaments: 0,
                tournamentsWon: 0,
                totalMatches: 0,
                matchesWon: 0,
                totalPoints: 0,
                winRate: 0,
                achievements: [],
                recentTournaments: []
            });
            setLoading(false);
            return;
        }

        // Filter teams by tournament creation date
        const filteredTeams = startDate ? teams.filter(team => {
            const tournament = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments;
            if (!tournament) return false;
            const tournamentDate = new Date(tournament.created_at);
            return tournamentDate >= startDate && tournamentDate <= endDate;
        }) : teams;

        // Calculate stats
        let totalMatches = 0;
        let matchesWon = 0;
        let totalPoints = 0;
        let tournamentsWon = 0;
        const tournaments = new Set<string>();

        filteredTeams.forEach(team => {
            tournaments.add(team.tournament_id);
            totalMatches += team.matches_played || 0;
            matchesWon += team.wins || 0;
            totalPoints += team.points || 0;
        });

        // Get tournament placements - optimized to fetch all in parallel
        const tournamentHistory: TournamentHistory[] = [];

        // Group teams by tournament to batch queries
        const completedTournaments = filteredTeams.filter(team => {
            const tournament = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments;
            return tournament && tournament.status === 'completed';
        });

        // Fetch all tournament teams data in parallel
        const tournamentTeamsPromises = completedTournaments.map(team =>
            supabase
                .from('teams')
                .select('id, wins, points, lead_points')
                .eq('tournament_id', team.tournament_id)
                .order('wins', { ascending: false })
        );

        const tournamentTeamsResults = await Promise.all(tournamentTeamsPromises);

        // Process placements
        completedTournaments.forEach((team, index) => {
            const tournament = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments;
            const { data: allTeams } = tournamentTeamsResults[index];

            if (allTeams) {
                // Sort teams properly
                const sortedTeams = allTeams.sort((a: any, b: any) => {
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    if (b.lead_points !== a.lead_points) return b.lead_points - a.lead_points;
                    return b.points - a.points;
                });

                const placement = sortedTeams.findIndex(t => t.id === team.id) + 1;

                if (placement === 1) {
                    tournamentsWon++;
                }

                tournamentHistory.push({
                    tournamentId: tournament.id,
                    tournamentName: tournament.name,
                    venue: tournament.venue,
                    teamName: team.name,
                    placement,
                    totalTeams: sortedTeams.length,
                    completedAt: tournament.created_at
                });
            }
        });

        // Calculate achievements
        const achievements: Achievement[] = [];

        if (tournamentsWon >= 1) {
            achievements.push({
                id: '1',
                title: '🏆 Champion',
                description: `Won ${tournamentsWon} tournament${tournamentsWon > 1 ? 's' : ''}`,
                icon: '🏆',
                earnedAt: new Date().toISOString()
            });
        }

        if (tournaments.size >= 5) {
            achievements.push({
                id: '2',
                title: '🎯 Veteran',
                description: `Participated in ${tournaments.size} tournaments`,
                icon: '🎯',
                earnedAt: new Date().toISOString()
            });
        }

        if (matchesWon >= 10) {
            achievements.push({
                id: '3',
                title: '⚡ Winner',
                description: `Won ${matchesWon} matches`,
                icon: '⚡',
                earnedAt: new Date().toISOString()
            });
        }

        const winRate = totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0;

        if (winRate >= 70 && totalMatches >= 10) {
            achievements.push({
                id: '4',
                title: '🔥 Hot Streak',
                description: `${winRate.toFixed(0)}% win rate`,
                icon: '🔥',
                earnedAt: new Date().toISOString()
            });
        }

        if (totalPoints >= 100) {
            achievements.push({
                id: '5',
                title: '💯 Century',
                description: `Scored ${totalPoints} total points`,
                icon: '💯',
                earnedAt: new Date().toISOString()
            });
        }

        setStats({
            totalTournaments: tournaments.size,
            tournamentsWon,
            totalMatches,
            matchesWon,
            totalPoints,
            winRate,
            achievements,
            recentTournaments: tournamentHistory.sort((a, b) =>
                new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            ).slice(0, 10)
        });

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-600">Player not found</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-800"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>

                <header className="text-center mb-12">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                            {playerName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-4xl font-bold text-gray-800 text-center bg-transparent border-b-2 border-indigo-600 focus:outline-none w-full max-w-md px-2"
                                autoFocus
                            />
                            <button
                                onClick={handleUpdateProfile}
                                className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                                title="Save"
                            >
                                <Save className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditName(playerName);
                                }}
                                className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
                                title="Cancel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold text-gray-800">{playerName}</h1>
                            {isOwnProfile && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
                                    title="Edit Profile"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-gray-600">Player Profile & Achievements</p>

                    {/* Date Filter */}
                    <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                        <Filter className="w-4 h-4 text-gray-600" />
                        <button
                            onClick={() => setDateFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dateFilter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => setDateFilter('thisYear')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dateFilter === 'thisYear'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            This Year
                        </button>
                        <button
                            onClick={() => setDateFilter('lastYear')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dateFilter === 'lastYear'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Last Year
                        </button>
                        <button
                            onClick={() => setDateFilter('thisMonth')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dateFilter === 'thisMonth'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setDateFilter('lastMonth')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dateFilter === 'lastMonth'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Last Month
                        </button>
                    </div>
                </header>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-800">{stats.tournamentsWon}</p>
                        <p className="text-sm text-gray-600">Tournaments Won</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <Calendar className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-800">{stats.totalTournaments}</p>
                        <p className="text-sm text-gray-600">Total Tournaments</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-800">{stats.matchesWon}</p>
                        <p className="text-sm text-gray-600">Matches Won</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-800">{stats.totalMatches}</p>
                        <p className="text-sm text-gray-600">Total Matches</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-800">{stats.winRate.toFixed(0)}%</p>
                        <p className="text-sm text-gray-600">Win Rate</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <Award className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-800">{stats.totalPoints}</p>
                        <p className="text-sm text-gray-600">Total Points</p>
                    </div>
                </div>

                {/* Achievements */}
                {stats.achievements.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                            <Award className="w-6 h-6 text-indigo-600" />
                            Achievements
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.achievements.map((achievement) => (
                                <div
                                    key={achievement.id}
                                    className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4"
                                >
                                    <div className="text-4xl mb-2">{achievement.icon}</div>
                                    <h3 className="font-semibold text-gray-800 mb-1">{achievement.title}</h3>
                                    <p className="text-sm text-gray-600">{achievement.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tournament History */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-indigo-600" />
                        Tournament History
                    </h2>
                    {stats.recentTournaments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No tournament history yet</p>
                    ) : (
                        <div className="space-y-4">
                            {stats.recentTournaments.map((tournament) => (
                                <div
                                    key={`${tournament.tournamentId}-${tournament.teamName}`}
                                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/tournament/${tournament.tournamentId}`)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-gray-800">{tournament.tournamentName}</h3>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${tournament.placement === 1
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : tournament.placement <= 3
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {tournament.placement === 1 ? '🥇' : tournament.placement === 2 ? '🥈' : tournament.placement === 3 ? '🥉' : `#${tournament.placement}`} Place
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <div className="flex items-center gap-4">
                                            <span>Team: {tournament.teamName}</span>
                                            <span>•</span>
                                            <span>{tournament.venue}</span>
                                        </div>
                                        <span>{tournament.totalTeams} teams</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(tournament.completedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PlayerProfilePage;
