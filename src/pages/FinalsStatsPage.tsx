import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Medal, ArrowLeft, Download, Filter } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import UserDropdown from '@/components/UserDropdown';
import StatCard from '@/components/StatCard';

interface StatsPageProps {
    user: User;
}

interface PlayerStats {
    userId: string;
    userName: string;
    titles: number;
    runnerUps: number;
    winRate: number;
    finalsAppearances: number;
    totalPoints: number;
    tournamentsPlayed: number;
    finalsRate: number;
}

interface DuoStats {
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    titles: number;
    runnerUps: number;
    winRate: number;
    finalsAppearances: number;
    totalPoints: number;
    tournamentsPlayed: number;
    finalsRate: number;
}

function StatsPage({ user }: StatsPageProps) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'players' | 'duos'>('players');
    const [loadingTab, setLoadingTab] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<'all' | 'thisYear' | 'lastYear' | 'thisMonth' | 'lastMonth'>('all');

    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
    const [duoStats, setDuoStats] = useState<DuoStats[]>([]);

    const [displayName, setDisplayName] = useState('User');

    useEffect(() => {
        loadUserName();
    }, []);

    const loadUserName = async () => {
        const { data } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (data) setDisplayName(data.full_name || 'User');
    };

    // CSV Export function
    const exportToCSV = (data: any[], filename: string, headers: string[]) => {
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header] ?? '';
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPlayerStats = () => {
        const data = playerStats.map(p => ({
            userName: p.userName,
            titles: p.titles,
            runnerUps: p.runnerUps,
            winRate: p.winRate.toFixed(2),
            finalsAppearances: p.finalsAppearances,
            tournamentsPlayed: p.tournamentsPlayed
        }));
        exportToCSV(data, 'player-finals-stats.csv', ['userName', 'titles', 'runnerUps', 'winRate', 'finalsAppearances', 'tournamentsPlayed']);
    };

    const exportDuoStats = () => {
        const data = duoStats.map(d => ({
            partnership: `${d.player1Name} & ${d.player2Name}`,
            titles: d.titles,
            runnerUps: d.runnerUps,
            winRate: d.winRate.toFixed(2),
            finalsAppearances: d.finalsAppearances,
            tournamentsPlayed: d.tournamentsPlayed,
            finalsRate: d.finalsRate.toFixed(2)
        }));
        exportToCSV(data, 'duo-finals-stats.csv', ['partnership', 'titles', 'runnerUps', 'winRate', 'finalsAppearances', 'tournamentsPlayed', 'finalsRate']);
    };

    const getDateRange = () => {
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
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            startDate = lastMonth;
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        }

        return { startDate, endDate };
    };

    useEffect(() => {
        // Force reload when date filter changes
        loadTabDataForced(activeTab);
    }, [activeTab, dateFilter]);

    const loadTabDataForced = async (tab: 'players' | 'duos') => {
        setLoadingTab(tab);

        try {
            if (tab === 'players') {
                await loadPlayerStats();
            } else if (tab === 'duos') {
                await loadDuoStats();
            }
        } finally {
            setLoadingTab(null);
        }
    };

    const loadPlayerStats = async () => {
        const { startDate, endDate } = getDateRange();

        let matchesQuery = supabase
            .from('matches')
            .select(`
                *,
                team1:teams!matches_team1_id_fkey(*),
                team2:teams!matches_team2_id_fkey(*),
                tournaments!inner(created_at)
            `)
            .eq('round', 'final')
            .eq('is_completed', true);

        if (startDate) {
            matchesQuery = matchesQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: finalMatches } = await matchesQuery;

        if (!finalMatches || finalMatches.length === 0) {
            setPlayerStats([]);
            return;
        }

        // Collect all unique player IDs from finals
        const allPlayerIds = new Set<string>();
        for (const match of finalMatches) {
            const team1Members = match.team1?.members || [];
            const team2Members = match.team2?.members || [];
            team1Members.forEach((id: string) => allPlayerIds.add(id));
            team2Members.forEach((id: string) => allPlayerIds.add(id));
        }

        // Fetch all teams to count tournaments played for these players
        let teamsQuery = supabase
            .from('teams')
            .select('members, tournaments!inner(created_at)');

        if (startDate) {
            teamsQuery = teamsQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: allTeams } = await teamsQuery;

        // Count tournament participation
        const tournamentCountMap = new Map<string, number>();

        if (allTeams) {
            allTeams.forEach((team: any) => {
                const members = team.members || [];
                members.forEach((memberId: string) => {
                    // Only count if this player has reached at least one final (i.e., is in our finals set)
                    if (allPlayerIds.has(memberId)) {
                        tournamentCountMap.set(memberId, (tournamentCountMap.get(memberId) || 0) + 1);
                    }
                });
            });
        }

        // Fetch all user data
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', Array.from(allPlayerIds));

        const userMap = new Map<string, string>();
        allUsers?.forEach(user => {
            userMap.set(user.id, user.full_name);
        });

        // Track stats for each player
        const statsMap = new Map<string, {
            name: string;
            finalsAppearances: number;
            titles: number;
            runnerUps: number;
            totalPoints: number;
        }>();

        for (const match of finalMatches) {
            const team1Members = match.team1?.members || [];
            const team2Members = match.team2?.members || [];
            const winnerId = match.winner_id;

            // Assuming match.scores is an array [score1, score2] corresponding to team1 and team2
            const scores = match.scores || [0, 0];
            const score1 = scores[0] || 0;
            const score2 = scores[1] || 0;

            const processMember = (memberId: string, isWinner: boolean, score: number) => {
                if (!statsMap.has(memberId)) {
                    statsMap.set(memberId, {
                        name: userMap.get(memberId) || 'Unknown',
                        finalsAppearances: 0,
                        titles: 0,
                        runnerUps: 0,
                        totalPoints: 0
                    });
                }
                const stats = statsMap.get(memberId)!;
                stats.finalsAppearances++;
                stats.totalPoints += score;
                if (isWinner) {
                    stats.titles++;
                } else {
                    stats.runnerUps++;
                }
            };

            const team1IsWinner = winnerId === match.team1_id;
            const team2IsWinner = winnerId === match.team2_id;

            team1Members.forEach((id: string) => processMember(id, team1IsWinner, score1));
            team2Members.forEach((id: string) => processMember(id, team2IsWinner, score2));
        }

        const statsArray: PlayerStats[] = Array.from(statsMap.entries()).map(([userId, stats]) => {
            // Ensure tournamentsPlayed is at least equal to finalsAppearances (sanity check)
            // It should be strictly >= finalsAppearances
            const playedCount = tournamentCountMap.get(userId) || stats.finalsAppearances;

            return {
                userId,
                userName: stats.name,
                titles: stats.titles,
                runnerUps: stats.runnerUps,
                finalsAppearances: stats.finalsAppearances,
                winRate: stats.finalsAppearances > 0 ? (stats.titles / stats.finalsAppearances) * 100 : 0,
                finalsRate: playedCount > 0 ? (stats.finalsAppearances / playedCount) * 100 : 0,
                totalPoints: stats.totalPoints,
                tournamentsPlayed: playedCount
            };
        });

        // Sort by Titles, then Win Rate, then Finals Appearances
        statsArray.sort((a, b) => {
            if (b.titles !== a.titles) return b.titles - a.titles;
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.finalsAppearances - a.finalsAppearances;
        });

        setPlayerStats(statsArray);
    };

    const loadDuoStats = async () => {
        const { startDate, endDate } = getDateRange();

        let matchesQuery = supabase
            .from('matches')
            .select(`
                *,
                team1:teams!matches_team1_id_fkey(*),
                team2:teams!matches_team2_id_fkey(*),
                tournaments!inner(created_at)
            `)
            .eq('round', 'final')
            .eq('is_completed', true);

        if (startDate) {
            matchesQuery = matchesQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: finalMatches } = await matchesQuery;

        if (!finalMatches || finalMatches.length === 0) {
            setDuoStats([]);
            return;
        }

        // Collect all unique player IDs and identify existing duos in finals
        const allPlayerIds = new Set<string>();
        const finalistsDuos = new Set<string>();

        for (const match of finalMatches) {
            const teams = [match.team1, match.team2];
            for (const team of teams) {
                const members = team?.members || [];
                members.forEach((id: string) => allPlayerIds.add(id));

                if (members.length === 2) {
                    const [p1, p2] = members.sort();
                    finalistsDuos.add(`${p1}_${p2}`);
                }
            }
        }

        // Fetch all teams to count tournaments played for these duos
        let teamsQuery = supabase
            .from('teams')
            .select('members, tournaments!inner(created_at)');

        if (startDate) {
            teamsQuery = teamsQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: allTeams } = await teamsQuery;

        const duoTournamentCountMap = new Map<string, number>();

        if (allTeams) {
            allTeams.forEach((team: any) => {
                const members = team.members || [];
                if (members.length === 2) {
                    const [p1, p2] = members.sort();
                    const duoKey = `${p1}_${p2}`;

                    // Only count if this duo has reached at least one final
                    if (finalistsDuos.has(duoKey)) {
                        duoTournamentCountMap.set(duoKey, (duoTournamentCountMap.get(duoKey) || 0) + 1);
                    }
                }
            });
        }

        const { data: allUsers } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', Array.from(allPlayerIds));

        const userMap = new Map<string, string>();
        allUsers?.forEach(user => {
            userMap.set(user.id, user.full_name);
        });

        const duoMap = new Map<string, {
            player1Id: string;
            player2Id: string;
            player1Name: string;
            player2Name: string;
            finalsAppearances: number;
            titles: number;
            runnerUps: number;
            totalPoints: number;
        }>();

        for (const match of finalMatches) {
            const teams = [match.team1, match.team2];
            const winnerId = match.winner_id;
            const scores = match.scores || [0, 0];

            // Helper to process a team
            const processTeam = (team: any, score: number, isWinner: boolean) => {
                const members = team?.members || [];
                if (members.length === 2) {
                    const [p1, p2] = members.sort();
                    const duoKey = `${p1}_${p2}`;

                    if (!duoMap.has(duoKey)) {
                        duoMap.set(duoKey, {
                            player1Id: p1,
                            player2Id: p2,
                            player1Name: userMap.get(p1) || 'Unknown',
                            player2Name: userMap.get(p2) || 'Unknown',
                            finalsAppearances: 0,
                            titles: 0,
                            runnerUps: 0,
                            totalPoints: 0
                        });
                    }

                    const stats = duoMap.get(duoKey)!;
                    stats.finalsAppearances++;
                    stats.totalPoints += score;
                    if (isWinner) {
                        stats.titles++;
                    } else {
                        stats.runnerUps++;
                    }
                }
            };

            processTeam(match.team1, scores[0], winnerId === match.team1_id);
            processTeam(match.team2, scores[1], winnerId === match.team2_id);
        }

        const duosArray: DuoStats[] = Array.from(duoMap.entries()).map(([duoKey, duo]) => {
            const playedCount = duoTournamentCountMap.get(duoKey) || duo.finalsAppearances;

            return {
                ...duo,
                winRate: duo.finalsAppearances > 0 ? (duo.titles / duo.finalsAppearances) * 100 : 0,
                finalsRate: playedCount > 0 ? (duo.finalsAppearances / playedCount) * 100 : 0,
                totalPoints: duo.totalPoints,
                finalsAppearances: duo.finalsAppearances,
                tournamentsPlayed: playedCount
            };
        });

        duosArray.sort((a, b) => {
            if (b.titles !== a.titles) return b.titles - a.titles;
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.finalsAppearances - a.finalsAppearances;
        });

        setDuoStats(duosArray);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigate('/stats')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm sm:text-base">Back to Stats</span>
                        </button>

                        <UserDropdown displayName={displayName} />
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" />
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">Finals Statistics</h1>
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 px-4">Championship performance overview</p>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                        <Filter className="w-4 h-4 text-gray-600" />
                        {['all', 'thisYear', 'lastYear', 'thisMonth', 'lastMonth'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setDateFilter(filter as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dateFilter === filter
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                {filter === 'all' ? 'All Time' : filter.replace(/([A-Z])/g, ' $1').trim()}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex max-sm:flex-col gap-4 mb-8 justify-center">
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
                </div>

                {/* Player Stats Tab */}
                {activeTab === 'players' && (
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <Medal className="w-6 h-6 text-indigo-600" />
                                    Top Players
                                </h2>
                                {playerStats.length > 0 && (
                                    <button
                                        onClick={exportPlayerStats}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition min-h-[44px]"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                )}
                            </div>

                            {loadingTab === 'players' ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
                                    <p className="text-gray-600">Loading player statistics...</p>
                                </div>
                            ) : playerStats.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No finals data available yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {playerStats.map((player, index) => (
                                        <StatCard
                                            key={player.userId}
                                            rank={index + 1}
                                            title={
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/profile/${player.userId}`);
                                                    }}
                                                    className="hover:text-indigo-600 transition text-left"
                                                >
                                                    {player.userName}
                                                </button>
                                            }
                                            subtitle={`Played ${player.tournamentsPlayed} tournament${player.tournamentsPlayed !== 1 ? 's' : ''}`}
                                            stats={[
                                                { label: 'Titles', value: player.titles, color: 'text-yellow-600' },
                                                { label: 'Win Rate', value: `${player.winRate.toFixed(0)}%`, color: 'text-green-600' },
                                                { label: 'Finals', value: player.finalsAppearances, color: 'text-indigo-600' },
                                                { label: 'Finals Rate', value: `${player.finalsRate.toFixed(0)}%`, color: 'text-blue-600' },
                                            ]}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Duo Stats Tab */}
                {activeTab === 'duos' && (
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <Users className="w-6 h-6 text-indigo-600" />
                                    Top Duo Partnerships
                                </h2>
                                {duoStats.length > 0 && (
                                    <button
                                        onClick={exportDuoStats}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition min-h-[44px]"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                )}
                            </div>

                            {loadingTab === 'duos' ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
                                    <p className="text-gray-600">Loading duo statistics...</p>
                                </div>
                            ) : duoStats.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No duo finals data available yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {duoStats.map((duo, index) => (
                                        <StatCard
                                            key={`${duo.player1Id}_${duo.player2Id}`}
                                            rank={index + 1}
                                            title={
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/profile/${duo.player1Id}`);
                                                        }}
                                                        className="hover:text-indigo-600 transition"
                                                    >
                                                        {duo.player1Name}
                                                    </button>
                                                    {' & '}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/profile/${duo.player2Id}`);
                                                        }}
                                                        className="hover:text-indigo-600 transition"
                                                    >
                                                        {duo.player2Name}
                                                    </button>
                                                </>
                                            }
                                            subtitle={`Played ${duo.tournamentsPlayed} tournament${duo.tournamentsPlayed !== 1 ? 's' : ''}`}
                                            stats={[
                                                { label: 'Titles', value: duo.titles, color: 'text-yellow-600' },
                                                { label: 'Win Rate', value: `${duo.winRate.toFixed(0)}%`, color: 'text-green-600' },
                                                { label: 'Finals', value: duo.finalsAppearances, color: 'text-indigo-600' },
                                                { label: 'Finals Rate', value: `${duo.finalsRate.toFixed(0)}%`, color: 'text-blue-600' },
                                            ]}
                                        />
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
