import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Medal, TrendingUp, ArrowLeft, User as UserIcon, Download, Filter } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface StatsPageProps {
    user: User;
}

interface PlayerStats {
    userId: string;
    userName: string;
    totalMatches: number;
    totalWins: number;
    winRate: number;
    tournaments: number;
}

interface DuoStats {
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    totalMatches: number;
    totalWins: number;
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
    const [activeTab, setActiveTab] = useState<'players' | 'duos' | 'teams'>('players');
    const [loadingTab, setLoadingTab] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<'all' | 'thisYear' | 'lastYear' | 'thisMonth' | 'lastMonth'>('all');

    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
    const [duoStats, setDuoStats] = useState<DuoStats[]>([]);
    const [teamNameStats, setTeamNameStats] = useState<TeamNameStats[]>([]);

    // Cache flags to avoid reloading
    const [playerStatsLoaded, setPlayerStatsLoaded] = useState(false);
    const [duoStatsLoaded, setDuoStatsLoaded] = useState(false);
    const [teamStatsLoaded, setTeamStatsLoaded] = useState(false);

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
            totalMatches: p.totalMatches,
            totalWins: p.totalWins,
            winRate: p.winRate.toFixed(2),
            tournaments: p.tournaments
        }));
        exportToCSV(data, 'overview-player-stats.csv', ['userName', 'totalMatches', 'totalWins', 'winRate', 'tournaments']);
    };

    const exportDuoStats = () => {
        const data = duoStats.map(d => ({
            partnership: `${d.player1Name} & ${d.player2Name}`,
            totalMatches: d.totalMatches,
            totalWins: d.totalWins,
            winRate: d.winRate.toFixed(2)
        }));
        exportToCSV(data, 'overview-duo-stats.csv', ['partnership', 'totalMatches', 'totalWins', 'winRate']);
    };

    const exportTeamStats = () => {
        const data = teamNameStats.map(t => ({
            teamName: t.teamName,
            finalsAppearances: t.finalsAppearances,
            totalWins: t.totalWins,
            tournamentsPlayed: t.tournamentsPlayed,
            totalPoints: t.totalPoints
        }));
        exportToCSV(data, 'team-stats.csv', ['teamName', 'finalsAppearances', 'totalWins', 'tournamentsPlayed', 'totalPoints']);
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

    const loadTabDataForced = async (tab: 'players' | 'duos' | 'teams') => {
        // Force load regardless of cache
        setLoadingTab(tab);

        try {
            if (tab === 'players') {
                await loadPlayerStats();
                setPlayerStatsLoaded(true);
            } else if (tab === 'duos') {
                await loadDuoStats();
                setDuoStatsLoaded(true);
            } else if (tab === 'teams') {
                await loadTeamNameStats();
                setTeamStatsLoaded(true);
            }
        } finally {
            setLoadingTab(null);
        }
    };

    const loadTabData = async (tab: 'players' | 'duos' | 'teams') => {
        // Check if already loaded
        if (tab === 'players' && playerStatsLoaded) return;
        if (tab === 'duos' && duoStatsLoaded) return;
        if (tab === 'teams' && teamStatsLoaded) return;

        await loadTabDataForced(tab);
    };

    const loadPlayerStats = async () => {
        const { startDate, endDate } = getDateRange();

        // Get ALL completed matches (not just finals)
        let matchesQuery = supabase
            .from('matches')
            .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        tournaments!inner(created_at)
      `)
            .eq('is_completed', true);

        if (startDate) {
            matchesQuery = matchesQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: allMatches } = await matchesQuery;

        if (!allMatches || allMatches.length === 0) {
            setPlayerStats([]);
            return;
        }

        // Collect all unique player IDs
        const allPlayerIds = new Set<string>();
        for (const match of allMatches) {
            const team1Members = match.team1?.members || [];
            const team2Members = match.team2?.members || [];
            team1Members.forEach((id: string) => allPlayerIds.add(id));
            team2Members.forEach((id: string) => allPlayerIds.add(id));
        }

        // Fetch all user data in ONE query
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', Array.from(allPlayerIds));

        // Create a lookup map for user names
        const userMap = new Map<string, string>();
        allUsers?.forEach(user => {
            userMap.set(user.id, user.full_name);
        });

        // Track stats for each player
        const statsMap = new Map<string, {
            name: string;
            totalMatches: number;
            totalWins: number;
            tournamentsSet: Set<string>;
        }>();

        for (const match of allMatches) {
            const team1Members = match.team1?.members || [];
            const team2Members = match.team2?.members || [];
            const winnerId = match.winner_id;

            // Process team1 members
            for (const memberId of team1Members) {
                if (!statsMap.has(memberId)) {
                    statsMap.set(memberId, {
                        name: userMap.get(memberId) || 'Unknown',
                        totalMatches: 0,
                        totalWins: 0,
                        tournamentsSet: new Set()
                    });
                }

                const stats = statsMap.get(memberId)!;
                stats.totalMatches++;
                stats.tournamentsSet.add(match.tournament_id);
                if (winnerId === match.team1_id) {
                    stats.totalWins++;
                }
            }

            // Process team2 members
            for (const memberId of team2Members) {
                if (!statsMap.has(memberId)) {
                    statsMap.set(memberId, {
                        name: userMap.get(memberId) || 'Unknown',
                        totalMatches: 0,
                        totalWins: 0,
                        tournamentsSet: new Set()
                    });
                }

                const stats = statsMap.get(memberId)!;
                stats.totalMatches++;
                stats.tournamentsSet.add(match.tournament_id);
                if (winnerId === match.team2_id) {
                    stats.totalWins++;
                }
            }
        }

        // Convert to array and calculate win rates
        let statsArray: PlayerStats[] = Array.from(statsMap.entries()).map(([userId, stats]) => ({
            userId,
            userName: stats.name,
            totalMatches: stats.totalMatches,
            totalWins: stats.totalWins,
            winRate: stats.totalMatches > 0 ? (stats.totalWins / stats.totalMatches) * 100 : 0,
            tournaments: stats.tournamentsSet.size
        }));

        // Filter: only show players with at least 3 matches
        statsArray = statsArray.filter(p => p.totalMatches >= 3);

        // Sort by win rate, then by total wins
        statsArray.sort((a, b) => {
            if (Math.abs(b.winRate - a.winRate) > 0.01) return b.winRate - a.winRate;
            return b.totalWins - a.totalWins;
        });

        setPlayerStats(statsArray);
    };

    const loadDuoStats = async () => {
        const { startDate, endDate } = getDateRange();

        // Get ALL completed matches (not just finals)
        let matchesQuery = supabase
            .from('matches')
            .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        tournaments!inner(created_at)
      `)
            .eq('is_completed', true);

        if (startDate) {
            matchesQuery = matchesQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: allMatches } = await matchesQuery;

        if (!allMatches || allMatches.length === 0) {
            setDuoStats([]);
            return;
        }

        // Collect all unique player IDs
        const allPlayerIds = new Set<string>();
        for (const match of allMatches) {
            const teams = [match.team1, match.team2];
            for (const team of teams) {
                const members = team?.members || [];
                members.forEach((id: string) => allPlayerIds.add(id));
            }
        }

        // Fetch all user data in ONE query
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', Array.from(allPlayerIds));

        // Create a lookup map for user names
        const userMap = new Map<string, string>();
        allUsers?.forEach(user => {
            userMap.set(user.id, user.full_name);
        });

        // Track stats for each duo (pair of players)
        const duoMap = new Map<string, {
            player1Id: string;
            player2Id: string;
            player1Name: string;
            player2Name: string;
            totalMatches: number;
            totalWins: number;
        }>();

        for (const match of allMatches) {
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
                        duoMap.set(duoKey, {
                            player1Id: p1,
                            player2Id: p2,
                            player1Name: userMap.get(p1) || 'Unknown',
                            player2Name: userMap.get(p2) || 'Unknown',
                            totalMatches: 0,
                            totalWins: 0
                        });
                    }

                    const duoStats = duoMap.get(duoKey)!;
                    duoStats.totalMatches++;
                    if (winnerId === team?.id) {
                        duoStats.totalWins++;
                    }
                }
            }
        }

        // Convert to array and calculate win rates
        let duosArray: DuoStats[] = Array.from(duoMap.values()).map(duo => ({
            ...duo,
            winRate: duo.totalMatches > 0 ? (duo.totalWins / duo.totalMatches) * 100 : 0
        }));

        // Filter: only show duos with at least 3 matches
        duosArray = duosArray.filter(d => d.totalMatches >= 3);

        // Sort by win rate, then by total wins
        duosArray.sort((a, b) => {
            if (Math.abs(b.winRate - a.winRate) > 0.01) return b.winRate - a.winRate;
            return b.totalWins - a.totalWins;
        });

        setDuoStats(duosArray);
    };

    const loadTeamNameStats = async () => {
        const { startDate, endDate } = getDateRange();

        // Get all teams across all tournaments with date filtering
        let teamsQuery = supabase
            .from('teams')
            .select('*, tournaments!inner(created_at)');

        if (startDate) {
            teamsQuery = teamsQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: allTeams } = await teamsQuery;

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
        let finalMatchesQuery = supabase
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
            finalMatchesQuery = finalMatchesQuery
                .gte('tournaments.created_at', startDate.toISOString())
                .lte('tournaments.created_at', endDate.toISOString());
        }

        const { data: finalMatches } = await finalMatchesQuery;

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
                            <span>Back to Stats</span>
                        </button>

                        <div className="flex items-center gap-2 text-gray-600">
                            <UserIcon className="w-4 h-4" />
                            <span>{displayName}</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <TrendingUp className="w-10 h-10 text-indigo-600" />
                            <h1 className="text-4xl font-bold text-gray-800">Overview Statistics</h1>
                        </div>
                        <p className="text-gray-600">Complete performance across all matches and tournaments</p>
                    </div>

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
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/profile/${player.userId}`);
                                                            }}
                                                            className="font-semibold text-gray-800 hover:text-indigo-600 transition text-left"
                                                        >
                                                            {player.userName}
                                                        </button>
                                                        <div className="text-sm text-gray-500">
                                                            {player.tournaments} tournament{player.tournaments !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-6 text-center">
                                                    <div>
                                                        <div className="text-2xl font-bold text-indigo-600">{player.totalWins}</div>
                                                        <div className="text-xs text-gray-500">Wins</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-gray-700">{player.totalMatches}</div>
                                                        <div className="text-xs text-gray-500">Matches</div>
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
                                                        </div>
                                                        <div className="text-sm text-gray-500">Partnership</div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-6 text-center">
                                                    <div>
                                                        <div className="text-2xl font-bold text-indigo-600">{duo.totalWins}</div>
                                                        <div className="text-xs text-gray-500">Wins</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-gray-700">{duo.totalMatches}</div>
                                                        <div className="text-xs text-gray-500">Matches</div>
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
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <Trophy className="w-6 h-6 text-indigo-600" />
                                    Team Name Performance
                                </h2>
                                {teamNameStats.length > 0 && (
                                    <button
                                        onClick={exportTeamStats}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition min-h-[44px]"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                )}
                            </div>

                            {loadingTab === 'teams' ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
                                    <p className="text-gray-600">Loading team statistics...</p>
                                </div>
                            ) : teamNameStats.length === 0 ? (
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
