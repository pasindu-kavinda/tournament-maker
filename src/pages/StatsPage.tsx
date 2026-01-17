import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Medal, TrendingUp, ArrowLeft, User as UserIcon } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface StatsPageProps {
    user: User;
}

interface PlayerStats {
    userId: string;
    userName: string;
    finalsAppearances: number;
    finalsWins: number;
    winRate: number;
    tournaments: number;
}

interface DuoStats {
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    finalsAppearances: number;
    finalsWins: number;
    winRate: number;
}

interface TeamNameStats {
    teamName: string;
    totalWins: number;
    finalsAppearances: number;
    tournamentsPlayed: number;
    totalPoints: number;
}

function StatsPage({ user }: StatsPageProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'players' | 'duos' | 'teams'>('players');

    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
    const [duoStats, setDuoStats] = useState<DuoStats[]>([]);
    const [teamNameStats, setTeamNameStats] = useState<TeamNameStats[]>([]);

    useEffect(() => {
        loadAllStats();
    }, []);

    const loadAllStats = async () => {
        setLoading(true);
        await Promise.all([
            loadPlayerStats(),
            loadDuoStats(),
            loadTeamNameStats()
        ]);
        setLoading(false);
    };

    const loadPlayerStats = async () => {
        // Get all matches where round = 'final' and is_completed = true
        const { data: finalMatches } = await supabase
            .from('matches')
            .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*)
      `)
            .eq('round', 'final')
            .eq('is_completed', true);

        if (!finalMatches) return;

        // Track stats for each player
        const statsMap = new Map<string, {
            name: string;
            finalsAppearances: number;
            finalsWins: number;
            tournamentsSet: Set<string>;
        }>();

        for (const match of finalMatches) {
            const team1Members = match.team1?.members || [];
            const team2Members = match.team2?.members || [];
            const winnerId = match.winner_id;

            // Process team1 members
            for (const memberId of team1Members) {
                if (!statsMap.has(memberId)) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('full_name')
                        .eq('id', memberId)
                        .single();

                    statsMap.set(memberId, {
                        name: userData?.full_name || 'Unknown',
                        finalsAppearances: 0,
                        finalsWins: 0,
                        tournamentsSet: new Set()
                    });
                }

                const stats = statsMap.get(memberId)!;
                stats.finalsAppearances++;
                stats.tournamentsSet.add(match.tournament_id);
                if (winnerId === match.team1_id) {
                    stats.finalsWins++;
                }
            }

            // Process team2 members
            for (const memberId of team2Members) {
                if (!statsMap.has(memberId)) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('full_name')
                        .eq('id', memberId)
                        .single();

                    statsMap.set(memberId, {
                        name: userData?.full_name || 'Unknown',
                        finalsAppearances: 0,
                        finalsWins: 0,
                        tournamentsSet: new Set()
                    });
                }

                const stats = statsMap.get(memberId)!;
                stats.finalsAppearances++;
                stats.tournamentsSet.add(match.tournament_id);
                if (winnerId === match.team2_id) {
                    stats.finalsWins++;
                }
            }
        }

        // Convert to array and calculate win rates
        const statsArray: PlayerStats[] = Array.from(statsMap.entries()).map(([userId, stats]) => ({
            userId,
            userName: stats.name,
            finalsAppearances: stats.finalsAppearances,
            finalsWins: stats.finalsWins,
            winRate: stats.finalsAppearances > 0 ? (stats.finalsWins / stats.finalsAppearances) * 100 : 0,
            tournaments: stats.tournamentsSet.size
        }));

        // Sort by finals wins, then by win rate
        statsArray.sort((a, b) => {
            if (b.finalsWins !== a.finalsWins) return b.finalsWins - a.finalsWins;
            return b.winRate - a.winRate;
        });

        setPlayerStats(statsArray);
    };

    const loadDuoStats = async () => {
        // Get all final matches
        const { data: finalMatches } = await supabase
            .from('matches')
            .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*)
      `)
            .eq('round', 'final')
            .eq('is_completed', true);

        if (!finalMatches) return;

        // Track stats for each duo (pair of players)
        const duoMap = new Map<string, {
            player1Id: string;
            player2Id: string;
            player1Name: string;
            player2Name: string;
            finalsAppearances: number;
            finalsWins: number;
        }>();

        for (const match of finalMatches) {
            const teams = [match.team1, match.team2];
            const winnerId = match.winner_id;

            for (let i = 0; i < teams.length; i++) {
                const team = teams[i];
                const members = team?.members || [];

                if (members.length === 2) {
                    // Sort member IDs to ensure consistent key
                    const [p1, p2] = members.sort();
                    const duoKey = `${p1}_${p2}`;

                    if (!duoMap.has(duoKey)) {
                        const { data: user1 } = await supabase
                            .from('users')
                            .select('full_name')
                            .eq('id', p1)
                            .single();

                        const { data: user2 } = await supabase
                            .from('users')
                            .select('full_name')
                            .eq('id', p2)
                            .single();

                        duoMap.set(duoKey, {
                            player1Id: p1,
                            player2Id: p2,
                            player1Name: user1?.full_name || 'Unknown',
                            player2Name: user2?.full_name || 'Unknown',
                            finalsAppearances: 0,
                            finalsWins: 0
                        });
                    }

                    const duoStats = duoMap.get(duoKey)!;
                    duoStats.finalsAppearances++;
                    if (winnerId === team?.id) {
                        duoStats.finalsWins++;
                    }
                }
            }
        }

        // Convert to array and calculate win rates
        const duosArray: DuoStats[] = Array.from(duoMap.values()).map(duo => ({
            ...duo,
            winRate: duo.finalsAppearances > 0 ? (duo.finalsWins / duo.finalsAppearances) * 100 : 0
        }));

        // Sort by finals wins, then by win rate
        duosArray.sort((a, b) => {
            if (b.finalsWins !== a.finalsWins) return b.finalsWins - a.finalsWins;
            return b.winRate - a.winRate;
        });

        setDuoStats(duosArray);
    };

    const loadTeamNameStats = async () => {
        // Get all teams across all tournaments
        const { data: allTeams } = await supabase
            .from('teams')
            .select('*');

        if (!allTeams) return;

        // Track stats for each team name
        const teamMap = new Map<string, {
            totalWins: number;
            finalsAppearances: number;
            tournamentsSet: Set<string>;
            totalPoints: number;
        }>();

        for (const team of allTeams) {
            const teamName = team.name;

            if (!teamMap.has(teamName)) {
                teamMap.set(teamName, {
                    totalWins: 0,
                    finalsAppearances: 0,
                    tournamentsSet: new Set(),
                    totalPoints: 0
                });
            }

            const stats = teamMap.get(teamName)!;
            stats.totalWins += team.wins || 0;
            stats.tournamentsSet.add(team.tournament_id);
            stats.totalPoints += team.points || 0;
        }

        // Check finals appearances
        const { data: finalMatches } = await supabase
            .from('matches')
            .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*)
      `)
            .eq('round', 'final');

        if (finalMatches) {
            for (const match of finalMatches) {
                const team1Name = match.team1?.name;
                const team2Name = match.team2?.name;

                if (team1Name && teamMap.has(team1Name)) {
                    teamMap.get(team1Name)!.finalsAppearances++;
                }
                if (team2Name && teamMap.has(team2Name)) {
                    teamMap.get(team2Name)!.finalsAppearances++;
                }
            }
        }

        // Convert to array
        const teamsArray: TeamNameStats[] = Array.from(teamMap.entries()).map(([teamName, stats]) => ({
            teamName,
            totalWins: stats.totalWins,
            finalsAppearances: stats.finalsAppearances,
            tournamentsPlayed: stats.tournamentsSet.size,
            totalPoints: stats.totalPoints
        }));

        // Sort by finals appearances, then total wins
        teamsArray.sort((a, b) => {
            if (b.finalsAppearances !== a.finalsAppearances) return b.finalsAppearances - a.finalsAppearances;
            return b.totalWins - a.totalWins;
        });

        setTeamNameStats(teamsArray);
    };

    const displayName = user.user_metadata?.full_name || 'User';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back to Home</span>
                        </button>

                        <div className="flex items-center gap-2 text-gray-600">
                            <UserIcon className="w-4 h-4" />
                            <span>{displayName}</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <TrendingUp className="w-10 h-10 text-indigo-600" />
                            <h1 className="text-4xl font-bold text-gray-800">Tournament Statistics</h1>
                        </div>
                        <p className="text-gray-600">Performance analytics across all tournaments</p>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 justify-center">
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${activeTab === 'players'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Medal className="w-5 h-5" />
                        Player Stats
                    </button>
                    <button
                        onClick={() => setActiveTab('duos')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${activeTab === 'duos'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Users className="w-5 h-5" />
                        Duo Stats
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${activeTab === 'teams'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Trophy className="w-5 h-5" />
                        Team Names
                    </button>
                </div>

                {/* Player Stats Tab */}
                {activeTab === 'players' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Medal className="w-6 h-6 text-indigo-600" />
                                Player Performance in Finals
                            </h2>

                            {playerStats.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No finals data available yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {playerStats.map((player, index) => (
                                        <div
                                            key={player.userId}
                                            className={`p-4 rounded-lg border-2 ${index === 0
                                                    ? 'bg-yellow-50 border-yellow-400'
                                                    : index === 1
                                                        ? 'bg-gray-50 border-gray-400'
                                                        : index === 2
                                                            ? 'bg-orange-50 border-orange-400'
                                                            : 'bg-white border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${index === 0
                                                            ? 'bg-yellow-400 text-yellow-900'
                                                            : index === 1
                                                                ? 'bg-gray-400 text-gray-900'
                                                                : index === 2
                                                                    ? 'bg-orange-400 text-orange-900'
                                                                    : 'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{player.userName}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {player.tournaments} tournament{player.tournaments !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-6 text-center">
                                                    <div>
                                                        <div className="text-2xl font-bold text-indigo-600">{player.finalsWins}</div>
                                                        <div className="text-xs text-gray-500">Wins</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-gray-700">{player.finalsAppearances}</div>
                                                        <div className="text-xs text-gray-500">Finals</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-green-600">{player.winRate.toFixed(0)}%</div>
                                                        <div className="text-xs text-gray-500">Win Rate</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Duo Stats Tab */}
                {activeTab === 'duos' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Users className="w-6 h-6 text-indigo-600" />
                                Top Performing Duos in Finals
                            </h2>

                            {duoStats.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No duo finals data available yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {duoStats.map((duo, index) => (
                                        <div
                                            key={`${duo.player1Id}_${duo.player2Id}`}
                                            className={`p-4 rounded-lg border-2 ${index === 0
                                                    ? 'bg-yellow-50 border-yellow-400'
                                                    : index === 1
                                                        ? 'bg-gray-50 border-gray-400'
                                                        : index === 2
                                                            ? 'bg-orange-50 border-orange-400'
                                                            : 'bg-white border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${index === 0
                                                            ? 'bg-yellow-400 text-yellow-900'
                                                            : index === 1
                                                                ? 'bg-gray-400 text-gray-900'
                                                                : index === 2
                                                                    ? 'bg-orange-400 text-orange-900'
                                                                    : 'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">
                                                            {duo.player1Name} & {duo.player2Name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">Partnership</div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-6 text-center">
                                                    <div>
                                                        <div className="text-2xl font-bold text-indigo-600">{duo.finalsWins}</div>
                                                        <div className="text-xs text-gray-500">Wins</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-gray-700">{duo.finalsAppearances}</div>
                                                        <div className="text-xs text-gray-500">Finals</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-green-600">{duo.winRate.toFixed(0)}%</div>
                                                        <div className="text-xs text-gray-500">Win Rate</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Team Names Tab */}
                {activeTab === 'teams' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-indigo-600" />
                                Team Name Performance
                            </h2>

                            {teamNameStats.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No team data available yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {teamNameStats.map((team, index) => (
                                        <div
                                            key={team.teamName}
                                            className={`p-4 rounded-lg border-2 ${index === 0
                                                    ? 'bg-yellow-50 border-yellow-400'
                                                    : index === 1
                                                        ? 'bg-gray-50 border-gray-400'
                                                        : index === 2
                                                            ? 'bg-orange-50 border-orange-400'
                                                            : 'bg-white border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${index === 0
                                                            ? 'bg-yellow-400 text-yellow-900'
                                                            : index === 1
                                                                ? 'bg-gray-400 text-gray-900'
                                                                : index === 2
                                                                    ? 'bg-orange-400 text-orange-900'
                                                                    : 'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{team.teamName}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {team.tournamentsPlayed} tournament{team.tournamentsPlayed !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 text-center">
                                                    <div>
                                                        <div className="text-2xl font-bold text-indigo-600">{team.finalsAppearances}</div>
                                                        <div className="text-xs text-gray-500">Finals</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-green-600">{team.totalWins}</div>
                                                        <div className="text-xs text-gray-500">Total Wins</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-gray-700">{team.totalPoints}</div>
                                                        <div className="text-xs text-gray-500">Points</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StatsPage;
