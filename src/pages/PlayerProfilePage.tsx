import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Target, TrendingUp, Award, Calendar, Users, ArrowLeft, Filter, Edit2, Save, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import UserDropdown from '@/components/UserDropdown';

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
    finalsMatches: number;
    finalsWins: number;
    finalsWinRate: number;
    recentForm: string; // e.g., "W-W-L-W-W"
    currentStreak: { type: 'W' | 'L'; count: number } | null;
    achievements: Achievement[];
    records: PlayerRecords;
    recentTournaments: TournamentHistory[];
    recentMatches: MatchHistory[];
}

interface PlayerRecords {
    backToBackTitles: number; // Consecutive tournament wins
    longestWinStreak: number; // All-time best win streak
    finalsStreak: number; // Consecutive finals appearances
    perfectTournaments: number; // Won tournament without losing
}


interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    tier: 'beginner' | 'intermediate' | 'advanced' | 'elite';
    category: 'tournament' | 'winrate' | 'activity' | 'finals' | 'streak' | 'milestone';
    earnedAt: string;
    isDynamic?: boolean; // Can be lost (e.g., streaks)
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

interface MatchHistory {
    matchId: string;
    opponent: string;
    result: 'W' | 'L';
    round: string;
    tournamentName: string;
    playedAt: string;
}

function PlayerProfilePage({ user }: PlayerProfilePageProps) {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [playerName, setPlayerName] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'thisYear' | 'lastYear' | 'thisMonth' | 'lastMonth'>('all');

    // For UserDropdown
    const [loggedInDisplayName, setLoggedInDisplayName] = useState('User');

    useEffect(() => {
        if (user) {
            loadLoggedInUserName();
        }
    }, [user]);

    const loadLoggedInUserName = async () => {
        const { data } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (data) setLoggedInDisplayName(data.full_name || 'User');
    };

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
                finalsMatches: 0,
                finalsWins: 0,
                finalsWinRate: 0,
                recentForm: '',
                currentStreak: null,
                achievements: [],
                records: {
                    backToBackTitles: 0,
                    longestWinStreak: 0,
                    finalsStreak: 0,
                    perfectTournaments: 0
                },
                recentTournaments: [],
                recentMatches: []
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

        // Calculate stats using ACCURATE match-based queries (matching stats page logic)
        let totalMatches = 0;
        let matchesWon = 0;
        let totalPoints = 0;
        const tournaments = new Set<string>();

        // Get all team IDs for this player
        const teamIds = filteredTeams.map(t => t.id);

        // Query ALL completed matches where player's teams participated
        const { data: allMatches } = await supabase
            .from('matches')
            .select(`
                *,
                team1:teams!matches_team1_id_fkey(id, name, members),
                team2:teams!matches_team2_id_fkey(id, name, members),
                tournaments!inner(created_at)
            `)
            .eq('is_completed', true)
            .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`);

        // Filter matches by date if needed
        const filteredMatches = startDate && allMatches ? allMatches.filter(match => {
            const matchDate = new Date(match.tournaments.created_at);
            return matchDate >= startDate && matchDate <= endDate;
        }) : allMatches || [];

        // Count matches and wins accurately based on actual match results
        filteredMatches.forEach(match => {
            const isTeam1 = teamIds.includes(match.team1_id);
            const isTeam2 = teamIds.includes(match.team2_id);

            if (isTeam1 || isTeam2) {
                totalMatches++;

                // Count win if this player's team won
                if (match.winner_id && teamIds.includes(match.winner_id)) {
                    matchesWon++;
                }
            }
        });

        // Calculate points and tournament participation from teams table
        filteredTeams.forEach(team => {
            tournaments.add(team.tournament_id);
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

        // Fetch finals matches for all tournaments to determine accurate placements
        const finalsMatchesPromises = completedTournaments.map(team =>
            supabase
                .from('matches')
                .select('team1_id, team2_id, winner_id')
                .eq('tournament_id', team.tournament_id)
                .eq('round', 'final')
                .eq('is_completed', true)
                .single()
        );

        const finalsMatchesResults = await Promise.all(finalsMatchesPromises);

        // Process placements
        completedTournaments.forEach((team, index) => {
            const tournament = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments;
            const { data: allTeams } = tournamentTeamsResults[index];
            const { data: finalMatch } = finalsMatchesResults[index];

            if (allTeams) {
                let placement: number;

                // Check if this team was in the finals
                if (finalMatch && (finalMatch.team1_id === team.id || finalMatch.team2_id === team.id)) {
                    // Team was in finals - determine 1st or 2nd place based on winner
                    placement = finalMatch.winner_id === team.id ? 1 : 2;
                } else {
                    // Team didn't reach finals - calculate placement based on wins/points
                    const sortedTeams = allTeams.sort((a: any, b: any) => {
                        if (b.wins !== a.wins) return b.wins - a.wins;
                        if (b.lead_points !== a.lead_points) return b.lead_points - a.lead_points;
                        return b.points - a.points;
                    });

                    placement = sortedTeams.findIndex(t => t.id === team.id) + 1;
                }

                tournamentHistory.push({
                    tournamentId: tournament.id,
                    tournamentName: tournament.name,
                    venue: tournament.venue,
                    teamName: team.name,
                    placement,
                    totalTeams: allTeams.length,
                    completedAt: tournament.created_at
                });
            }
        });

        // Calculate finals-specific stats
        const finalsMatches = filteredMatches.filter(m => m.round === 'final');
        const finalsWins = finalsMatches.filter(m =>
            m.winner_id && teamIds.includes(m.winner_id)
        ).length;
        const finalsWinRate = finalsMatches.length > 0
            ? (finalsWins / finalsMatches.length) * 100
            : 0;

        // Tournaments Won = Finals Won (winning a tournament means winning the final)
        const tournamentsWon = finalsWins;

        // Calculate recent match history (last 10 matches, properly sorted by date)
        // First, sort ALL matches by created_at to ensure chronological order
        const sortedByDate = [...filteredMatches].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const recentMatches: MatchHistory[] = sortedByDate
            .slice(-50) // Get last 50 matches
            .map(match => {
                const playerTeamId = teamIds.includes(match.team1_id) ? match.team1_id : match.team2_id;
                const opponentTeam = playerTeamId === match.team1_id ? match.team2 : match.team1;
                const tournament = match.tournaments;

                return {
                    matchId: match.id,
                    opponent: opponentTeam?.name || 'Unknown',
                    result: (match.winner_id === playerTeamId ? 'W' : 'L') as 'W' | 'L',
                    round: match.round || 'Unknown',
                    tournamentName: tournament?.name || 'Unknown',
                    playedAt: match.created_at
                };
            })
            .reverse(); // Reverse to show newest first

        // Calculate recent form string (W-L-W-W-L)
        const recentForm = recentMatches.map(m => m.result).join('-');

        // Calculate current streak
        let currentStreak: { type: 'W' | 'L'; count: number } | null = null;
        if (recentMatches.length > 0) {
            const latestResult = recentMatches[0].result;
            let streakCount = 1;

            for (let i = 1; i < recentMatches.length; i++) {
                if (recentMatches[i].result === latestResult) {
                    streakCount++;
                } else {
                    break;
                }
            }

            currentStreak = { type: latestResult, count: streakCount };
        }


        // Calculate winRate and achievements (after tournamentsWon is defined)
        const winRate = totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0;
        const achievements: Achievement[] = [];


        // ========================================
        // CATEGORY 1: Tournament Success
        // ========================================
        if (tournamentsWon >= 1) {
            achievements.push({
                id: 'tournament_first_blood',
                title: '🏆 First Blood',
                description: 'Won your first tournament',
                icon: '🏆',
                tier: 'beginner',
                category: 'tournament',
                earnedAt: new Date().toISOString()
            });
        }

        if (tournamentsWon >= 3) {
            achievements.push({
                id: 'tournament_champion',
                title: '🥇 Champion',
                description: `Won ${tournamentsWon} tournaments`,
                icon: '🥇',
                tier: 'intermediate',
                category: 'tournament',
                earnedAt: new Date().toISOString()
            });
        }

        if (tournamentsWon >= 5) {
            achievements.push({
                id: 'tournament_dynasty',
                title: '👑 Dynasty',
                description: `Won ${tournamentsWon} tournaments`,
                icon: '👑',
                tier: 'advanced',
                category: 'tournament',
                earnedAt: new Date().toISOString()
            });
        }

        if (tournamentsWon >= 10) {
            achievements.push({
                id: 'tournament_legend',
                title: '🌟 Legend',
                description: `Won ${tournamentsWon} tournaments`,
                icon: '🌟',
                tier: 'elite',
                category: 'tournament',
                earnedAt: new Date().toISOString()
            });
        }

        // ========================================
        // CATEGORY 2: Win Rate Excellence
        // ========================================
        if (winRate >= 60 && totalMatches >= 20) {
            achievements.push({
                id: 'winrate_rising_star',
                title: '📈 Rising Star',
                description: `${winRate.toFixed(0)}% win rate (${totalMatches} matches)`,
                icon: '📈',
                tier: 'intermediate',
                category: 'winrate',
                earnedAt: new Date().toISOString()
            });
        }

        if (winRate >= 70 && totalMatches >= 30) {
            achievements.push({
                id: 'winrate_dominator',
                title: '🔥 Dominator',
                description: `${winRate.toFixed(0)}% win rate (${totalMatches} matches)`,
                icon: '🔥',
                tier: 'advanced',
                category: 'winrate',
                earnedAt: new Date().toISOString()
            });
        }

        if (winRate >= 80 && totalMatches >= 40) {
            achievements.push({
                id: 'winrate_unstoppable',
                title: '⚡ Unstoppable',
                description: `${winRate.toFixed(0)}% win rate (${totalMatches} matches)`,
                icon: '⚡',
                tier: 'elite',
                category: 'winrate',
                earnedAt: new Date().toISOString()
            });
        }

        // ========================================
        // CATEGORY 3: Activity & Dedication
        // ========================================
        if (tournaments.size >= 10) {
            achievements.push({
                id: 'activity_regular',
                title: '🎯 Regular',
                description: `Participated in ${tournaments.size} tournaments`,
                icon: '🎯',
                tier: 'beginner',
                category: 'activity',
                earnedAt: new Date().toISOString()
            });
        }

        if (totalMatches >= 100) {
            achievements.push({
                id: 'activity_grinder',
                title: '🏃 Grinder',
                description: `Played ${totalMatches} matches`,
                icon: '🏃',
                tier: 'intermediate',
                category: 'activity',
                earnedAt: new Date().toISOString()
            });
        }

        if (totalMatches >= 250) {
            achievements.push({
                id: 'activity_iron_man',
                title: '💪 Iron Man',
                description: `Played ${totalMatches} matches`,
                icon: '💪',
                tier: 'advanced',
                category: 'activity',
                earnedAt: new Date().toISOString()
            });
        }

        if (totalMatches >= 500) {
            achievements.push({
                id: 'activity_marathon',
                title: '🦾 Marathon Runner',
                description: `Played ${totalMatches} matches`,
                icon: '🦾',
                tier: 'elite',
                category: 'activity',
                earnedAt: new Date().toISOString()
            });
        }

        // ========================================
        // CATEGORY 4: Finals Performance
        // ========================================
        if (finalsWinRate >= 70 && finalsMatches.length >= 5) {
            achievements.push({
                id: 'finals_specialist',
                title: '👑 Finals Specialist',
                description: `${finalsWinRate.toFixed(0)}% win rate in ${finalsMatches.length} finals`,
                icon: '👑',
                tier: 'advanced',
                category: 'finals',
                earnedAt: new Date().toISOString()
            });
        }

        if (finalsWinRate >= 80 && finalsMatches.length >= 8) {
            achievements.push({
                id: 'finals_clutch',
                title: '💎 Clutch Player',
                description: `${finalsWinRate.toFixed(0)}% win rate in ${finalsMatches.length} finals`,
                icon: '💎',
                tier: 'elite',
                category: 'finals',
                earnedAt: new Date().toISOString()
            });
        }

        if (finalsMatches.length >= 20) {
            achievements.push({
                id: 'finals_machine',
                title: '🎖️ Finals Machine',
                description: `Reached ${finalsMatches.length} finals`,
                icon: '🎖️',
                tier: 'elite',
                category: 'finals',
                earnedAt: new Date().toISOString()
            });
        }

        // ========================================
        // CATEGORY 5: Streaks (Dynamic)
        // ========================================
        if (currentStreak && currentStreak.type === 'W') {
            if (currentStreak.count >= 10) {
                achievements.push({
                    id: 'streak_tsunami',
                    title: '🌊 Tsunami',
                    description: `${currentStreak.count} win streak`,
                    icon: '🌊',
                    tier: 'elite',
                    category: 'streak',
                    earnedAt: new Date().toISOString(),
                    isDynamic: true
                });
            } else if (currentStreak.count >= 5) {
                achievements.push({
                    id: 'streak_on_fire',
                    title: '🔥 On Fire',
                    description: `${currentStreak.count} win streak`,
                    icon: '🔥',
                    tier: 'intermediate',
                    category: 'streak',
                    earnedAt: new Date().toISOString(),
                    isDynamic: true
                });
            }
        }

        if (currentStreak && currentStreak.type === 'L' && currentStreak.count >= 5) {
            achievements.push({
                id: 'streak_ice_cold',
                title: '❄️ Ice Cold',
                description: `${currentStreak.count} loss streak`,
                icon: '❄️',
                tier: 'beginner',
                category: 'streak',
                earnedAt: new Date().toISOString(),
                isDynamic: true
            });
        }

        // ========================================
        // CATEGORY 6: Milestones
        // ========================================
        if (matchesWon >= 100) {
            achievements.push({
                id: 'milestone_century',
                title: '💯 Century',
                description: `Won ${matchesWon} matches`,
                icon: '💯',
                tier: 'intermediate',
                category: 'milestone',
                earnedAt: new Date().toISOString()
            });
        }

        if (matchesWon >= 200) {
            achievements.push({
                id: 'milestone_double_century',
                title: '🎊 Double Century',
                description: `Won ${matchesWon} matches`,
                icon: '🎊',
                tier: 'advanced',
                category: 'milestone',
                earnedAt: new Date().toISOString()
            });
        }

        if (matchesWon >= 500) {
            achievements.push({
                id: 'milestone_half_millennium',
                title: '🏅 Half Millennium',
                description: `Won ${matchesWon} matches`,
                icon: '🏅',
                tier: 'elite',
                category: 'milestone',
                earnedAt: new Date().toISOString()
            });
        }

        // ========================================
        // CALCULATE RECORDS
        // ========================================

        // 1. Back-to-Back Titles (consecutive tournament wins)
        let backToBackTitles = 0;
        let currentBackToBack = 0;

        // Sort tournaments by completion date
        const sortedTournaments = tournamentHistory.sort((a, b) =>
            new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );

        for (const tournament of sortedTournaments) {
            if (tournament.placement === 1) {
                currentBackToBack++;
                backToBackTitles = Math.max(backToBackTitles, currentBackToBack);
            } else {
                currentBackToBack = 0;
            }
        }

        // 2. Longest Win Streak (all-time best)
        let longestWinStreak = 0;
        let currentWinStreak = 0;

        // Use ALL matches sorted by date (not just recent 50)
        const allMatchesSorted = [...filteredMatches].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (const match of allMatchesSorted) {
            const playerTeamId = teamIds.includes(match.team1_id) ? match.team1_id : match.team2_id;
            const won = match.winner_id === playerTeamId;

            if (won) {
                currentWinStreak++;
                longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
            } else {
                currentWinStreak = 0;
            }
        }

        // 3. Finals Streak (consecutive finals appearances)
        let finalsStreak = 0;
        let currentFinalsStreak = 0;

        for (const tournament of sortedTournaments) {
            // Check if player reached finals (placement 1 or 2)
            if (tournament.placement === 1 || tournament.placement === 2) {
                currentFinalsStreak++;
                finalsStreak = Math.max(finalsStreak, currentFinalsStreak);
            } else {
                currentFinalsStreak = 0;
            }
        }

        // 4. Perfect Tournaments (won without losing a match)
        let perfectTournaments = 0;

        // Group matches by tournament
        const matchesByTournament = new Map<string, any[]>();
        for (const match of allMatchesSorted) {
            const tournamentId = match.tournament_id;
            if (!matchesByTournament.has(tournamentId)) {
                matchesByTournament.set(tournamentId, []);
            }
            matchesByTournament.get(tournamentId)!.push(match);
        }

        // Check each tournament where player won
        for (const tournament of tournamentHistory) {
            if (tournament.placement === 1) {
                const tournamentMatches = matchesByTournament.get(tournament.tournamentId) || [];
                const allWins = tournamentMatches.every(match => {
                    const playerTeamId = teamIds.includes(match.team1_id) ? match.team1_id : match.team2_id;
                    return match.winner_id === playerTeamId;
                });

                if (allWins && tournamentMatches.length > 0) {
                    perfectTournaments++;
                }
            }
        }

        setStats({
            totalTournaments: tournaments.size,
            tournamentsWon,
            totalMatches,
            matchesWon,
            totalPoints,
            winRate,
            finalsMatches: finalsMatches.length,
            finalsWins,
            finalsWinRate,
            recentForm,
            currentStreak,
            achievements,
            records: {
                backToBackTitles,
                longestWinStreak,
                finalsStreak,
                perfectTournaments
            },
            recentTournaments: tournamentHistory.sort((a, b) =>
                new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            ).slice(0, 10),
            recentMatches
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
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                    <UserDropdown displayName={loggedInDisplayName} />
                </div>

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

                {/* Finals Performance Section */}
                {stats.finalsMatches > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 mb-8 border border-yellow-200">
                        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-600" />
                            Finals Performance
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-yellow-700">{stats.finalsMatches}</p>
                                <p className="text-sm text-gray-600">Finals Played</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">{stats.finalsWins}</p>
                                <p className="text-sm text-gray-600">Finals Won</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-indigo-600">{stats.finalsWinRate.toFixed(0)}%</p>
                                <p className="text-sm text-gray-600">Finals Win Rate</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Form Section */}
                {stats.recentForm && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-indigo-600" />
                            Recent Form
                        </h2>
                        <div className="flex flex-col gap-4">
                            {/* Form String */}
                            <div>
                                <p className="text-sm text-gray-600 mb-2">
                                    Last {stats.recentMatches.length} Matches
                                    <span className="ml-2 text-xs text-yellow-600">● = Finals</span>
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {stats.recentMatches.map((match) => (
                                        <div key={match.matchId} className="relative">
                                            <div
                                                className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white relative ${match.result === 'W' ? 'bg-green-500' : 'bg-red-500'
                                                    } ${match.round === 'final' ? 'ring-4 ring-yellow-400' : ''
                                                    }`}
                                                title={`${match.result === 'W' ? 'Won' : 'Lost'} vs ${match.opponent}\n${match.round.toUpperCase()} - ${match.tournamentName}\n${new Date(match.playedAt).toLocaleDateString()}`}
                                            >
                                                {match.result}
                                                {/* Finals indicator dot */}
                                                {match.round === 'final' && (
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Current Streak */}
                            {stats.currentStreak && (
                                <div className={`p-4 rounded-lg ${stats.currentStreak.type === 'W'
                                    ? 'bg-green-100 border border-green-300'
                                    : 'bg-red-100 border border-red-300'
                                    }`}>
                                    <p className="font-semibold">
                                        Current Streak: {stats.currentStreak.count} {stats.currentStreak.type === 'W' ? 'Wins' : 'Losses'} 🔥
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Personal Records */}
                {(stats.records.backToBackTitles > 0 || stats.records.longestWinStreak > 0 ||
                    stats.records.finalsStreak > 0 || stats.records.perfectTournaments > 0) && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg p-6 mb-8 border border-amber-200">
                            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-amber-600" />
                                📊 Personal Records
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stats.records.backToBackTitles > 0 && (
                                    <div className="bg-white rounded-lg p-4 border-l-4 border-amber-500">
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">🏆</div>
                                            <div>
                                                <p className="text-sm text-gray-600">Back-to-Back Titles</p>
                                                <p className="text-2xl font-bold text-amber-700">{stats.records.backToBackTitles}</p>
                                                <p className="text-xs text-gray-500">Consecutive tournament wins</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stats.records.longestWinStreak > 0 && (
                                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">🔥</div>
                                            <div>
                                                <p className="text-sm text-gray-600">Longest Win Streak</p>
                                                <p className="text-2xl font-bold text-green-700">{stats.records.longestWinStreak}</p>
                                                <p className="text-xs text-gray-500">All-time best</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stats.records.finalsStreak > 0 && (
                                    <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">👑</div>
                                            <div>
                                                <p className="text-sm text-gray-600">Finals Streak</p>
                                                <p className="text-2xl font-bold text-purple-700">{stats.records.finalsStreak}</p>
                                                <p className="text-xs text-gray-500">Consecutive finals appearances</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stats.records.perfectTournaments > 0 && (
                                    <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">💎</div>
                                            <div>
                                                <p className="text-sm text-gray-600">Perfect Tournaments</p>
                                                <p className="text-2xl font-bold text-blue-700">{stats.records.perfectTournaments}</p>
                                                <p className="text-xs text-gray-500">Won without losing</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
