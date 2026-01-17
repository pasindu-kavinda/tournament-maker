import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Users, MapPin, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Team, Match } from '../types';
import Bracket from '../components/Bracket';
import TeamStats from '../components/TeamStats';

function TournamentPublicView() {
    const { id: tournamentId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState<any>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [finalMatch, setFinalMatch] = useState<Match | null>(null);
    const [finalTeam, setFinalTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        if (tournamentId) {
            loadTournament();
            subscribeToUpdates();
        }
    }, [tournamentId]);

    const loadTournament = async () => {
        if (!tournamentId) return;

        setLoading(true);

        // Load tournament details
        const { data: tournamentData } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .single();

        if (tournamentData) {
            setTournament(tournamentData);

            // Load teams
            const { data: teamsData } = await supabase
                .from('teams')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('created_at', { ascending: true });

            if (teamsData) setTeams(teamsData);

            // Load matches
            const { data: matchesData } = await supabase
                .from('matches')
                .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*)
        `)
                .eq('tournament_id', tournamentId)
                .order('match_number', { ascending: true });

            if (matchesData) {
                const formattedMatches = matchesData.map(match => ({
                    ...match,
                    teams: [match.team1, match.team2],
                    scores: [match.team1_score, match.team2_score],
                    isCompleted: match.is_completed,
                    winner: match.winner_id,
                    pointDifference: match.point_difference,
                    matchNumber: match.match_number,
                    round: match.round,
                    tournamentStatus: tournamentData.status
                }));

                const regularMatches = formattedMatches.filter(m => m.round === 'regular');
                const finalMatchData = formattedMatches.find(m => m.round === 'final');

                setMatches(regularMatches);
                if (finalMatchData) {
                    setFinalMatch(finalMatchData);
                    if (finalMatchData.winner_id) {
                        const winningTeam = finalMatchData.teams.find((t: any) => t?.id === finalMatchData.winner_id);
                        if (winningTeam) setFinalTeam(winningTeam);
                    }
                }
            }
        }

        setLoading(false);
        setLastUpdate(new Date());
    };

    const subscribeToUpdates = () => {
        if (!tournamentId) return;

        // Subscribe to tournament changes
        const tournamentChannel = supabase
            .channel(`tournament_${tournamentId}_public`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tournaments',
                    filter: `id=eq.${tournamentId}`
                },
                () => {
                    loadTournament();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'matches',
                    filter: `tournament_id=eq.${tournamentId}`
                },
                () => {
                    loadTournament();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'teams',
                    filter: `tournament_id=eq.${tournamentId}`
                },
                () => {
                    loadTournament();
                }
            )
            .subscribe();

        return () => {
            tournamentChannel.unsubscribe();
        };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const formatLastUpdate = () => {
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

        if (diffSeconds < 10) return 'Just now';
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        return lastUpdate.toLocaleTimeString();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
                    <p className="text-gray-700 font-medium">Loading tournament...</p>
                </div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                <div className="text-center">
                    <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Tournament Not Found</h2>
                    <p className="text-gray-600">This tournament may have been deleted or the link is invalid.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 py-4 sm:py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{tournament.name}</h1>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{tournament.venue}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                            <span className={`px-4 py-2 rounded-full text-sm font-medium border-2 ${getStatusColor(tournament.status)}`}>
                                {tournament.status === 'in_progress' ? '🔴 LIVE' : tournament.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <RefreshCw className="w-3 h-3" />
                                <span>Updated {formatLastUpdate()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Spectator Notice */}
                    <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded">
                        <p className="text-sm text-indigo-800">
                            👁️ <strong>Spectator Mode:</strong> You're viewing this tournament in real-time.
                            Scores update automatically as they're entered.
                        </p>
                    </div>
                </div>

                {/* Winner Banner */}
                {tournament.status === 'completed' && finalTeam && (
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl shadow-lg p-6 sm:p-8 mb-6 text-center">
                        <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-yellow-900 mb-3" />
                        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-900 mb-2">🎉 Champion!</h2>
                        <p className="text-xl sm:text-2xl font-semibold text-yellow-900">{finalTeam.name}</p>
                    </div>
                )}

                {/* Teams Section */}
                {teams.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Users className="w-6 h-6 text-indigo-600" />
                            Teams ({teams.length})
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teams.map((team) => (
                                <div key={team.id} className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-400 transition">
                                    <h3 className="font-semibold text-gray-800 text-lg mb-2">{team.name}</h3>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Wins: <strong>{team.wins}</strong></span>
                                        <span>Points: <strong>{team.points}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Matches Section */}
                {(matches.length > 0 || finalMatch) && (
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Matches</h2>
                        <Bracket
                            matches={matches}
                            finalMatch={finalMatch}
                            onSubmitScores={() => { }} // Read-only mode
                        />
                    </div>
                )}

                {/* Team Statistics */}
                {teams.length > 0 && matches.some(m => m.isCompleted) && (
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Standings</h2>
                        <TeamStats teams={teams} />
                    </div>
                )}

                {/* No Data State */}
                {teams.length === 0 && matches.length === 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-medium text-gray-700 mb-2">Tournament Starting Soon</h3>
                        <p className="text-gray-500">Teams and matches will appear here once the tournament begins.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TournamentPublicView;
