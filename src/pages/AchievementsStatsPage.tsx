import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Award, Medal, ArrowLeft, User as UserIcon, Download, Filter, Crown, Flame, Target } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AchievementsStatsPageProps {
    user: User;
}

interface PlayerAchievementStats {
    userId: string;
    userName: string;
    totalAchievements: number;
    beginnerCount: number;
    intermediateCount: number;
    advancedCount: number;
    eliteCount: number;
}

interface PlayerRecordStats {
    userId: string;
    userName: string;
    backToBackTitles: number;
    longestWinStreak: number;
    finalsStreak: number;
    perfectTournaments: number;
}

function AchievementsStatsPage({ user }: AchievementsStatsPageProps) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'achievements' | 'records'>('achievements');
    const [loadingTab, setLoadingTab] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<'all' | 'thisYear' | 'lastYear' | 'thisMonth' | 'lastMonth'>('all');

    const [achievementStats, setAchievementStats] = useState<PlayerAchievementStats[]>([]);
    const [recordStats, setRecordStats] = useState<PlayerRecordStats[]>([]);

    const [achievementStatsLoaded, setAchievementStatsLoaded] = useState(false);
    const [recordStatsLoaded, setRecordStatsLoaded] = useState(false);

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

    const exportAchievementStats = () => {
        const data = achievementStats.map(p => ({
            userName: p.userName,
            totalAchievements: p.totalAchievements,
            beginnerCount: p.beginnerCount,
            intermediateCount: p.intermediateCount,
            advancedCount: p.advancedCount,
            eliteCount: p.eliteCount
        }));
        exportToCSV(data, 'achievement-stats.csv', ['userName', 'totalAchievements', 'beginnerCount', 'intermediateCount', 'advancedCount', 'eliteCount']);
    };

    const exportRecordStats = () => {
        const data = recordStats.map(p => ({
            userName: p.userName,
            backToBackTitles: p.backToBackTitles,
            longestWinStreak: p.longestWinStreak,
            finalsStreak: p.finalsStreak,
            perfectTournaments: p.perfectTournaments
        }));
        exportToCSV(data, 'record-stats.csv', ['userName', 'backToBackTitles', 'longestWinStreak', 'finalsStreak', 'perfectTournaments']);
    };

    // Calculate date range for filtering
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
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        }

        return { startDate, endDate };
    };

    // Load Achievement Stats
    const loadAchievementStats = async () => {
        if (achievementStatsLoaded && dateFilter === 'all') return;

        setLoadingTab('achievements');

        // For now, set empty data - full implementation will come next
        setAchievementStats([]);
        setAchievementStatsLoaded(true);
        setLoadingTab(null);
    };

    // Load Record Stats  
    const loadRecordStats = async () => {
        if (recordStatsLoaded && dateFilter === 'all') return;

        setLoadingTab('records');

        // For now, set empty data - full implementation will come next
        setRecordStats([]);
        setRecordStatsLoaded(true);
        setLoadingTab(null);
    };

    useEffect(() => {
        if (activeTab === 'achievements') {
            loadAchievementStats();
        } else if (activeTab === 'records') {
            loadRecordStats();
        }
    }, [activeTab, dateFilter]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/stats')}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Stats
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                                <Trophy className="w-10 h-10 text-indigo-600" />
                                Achievements & Records
                            </h1>
                            <p className="text-gray-600 mt-2">Player achievements and personal records leaderboard</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-600" />
                            <span className="font-semibold text-gray-700">Filter:</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 'thisYear', 'lastYear', 'thisMonth', 'lastMonth'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setDateFilter(filter)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilter === filter
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {filter === 'all' ? 'All Time' :
                                        filter === 'thisYear' ? 'This Year' :
                                            filter === 'lastYear' ? 'Last Year' :
                                                filter === 'thisMonth' ? 'This Month' : 'Last Month'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-lg mb-8">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('achievements')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'achievements'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            <Award className="w-5 h-5" />
                            Achievements Leaderboard
                        </button>
                        <button
                            onClick={() => setActiveTab('records')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'records'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            <Medal className="w-5 h-5" />
                            Records Leaderboard
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loadingTab ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading stats...</p>
                    </div>
                ) : (
                    <>
                        {/* Achievements Tab */}
                        {activeTab === 'achievements' && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-semibold text-gray-800">Achievement Leaders</h2>
                                    <button
                                        onClick={exportAchievementStats}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                        disabled={achievementStats.length === 0}
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                </div>

                                {achievementStats.length === 0 ? (
                                    <p className="text-gray-600 text-center py-8">No achievement data available</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Player</th>
                                                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Total</th>
                                                    <th className="text-center py-3 px-4 font-semibold text-gray-700">🥉 Beginner</th>
                                                    <th className="text-center py-3 px-4 font-semibold text-gray-700">🥈 Intermediate</th>
                                                    <th className="text-center py-3 px-4 font-semibold text-gray-700">🥇 Advanced</th>
                                                    <th className="text-center py-3 px-4 font-semibold text-gray-700">💎 Elite</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {achievementStats.map((player, index) => (
                                                    <tr
                                                        key={player.userId}
                                                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${player.userId === user.id ? 'bg-indigo-50' : ''
                                                            }`}
                                                        onClick={() => navigate(`/profile/${player.userId}`)}
                                                    >
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {index === 0 && <span className="text-2xl">🥇</span>}
                                                                {index === 1 && <span className="text-2xl">🥈</span>}
                                                                {index === 2 && <span className="text-2xl">🥉</span>}
                                                                <span className="font-semibold">{index + 1}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <UserIcon className="w-4 h-4 text-gray-400" />
                                                                <span className="font-medium">{player.userName}</span>
                                                                {player.userId === user.id && (
                                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">You</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className="font-bold text-indigo-600">{player.totalAchievements}</span>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">{player.beginnerCount}</td>
                                                        <td className="py-3 px-4 text-center">{player.intermediateCount}</td>
                                                        <td className="py-3 px-4 text-center">{player.advancedCount}</td>
                                                        <td className="py-3 px-4 text-center">{player.eliteCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Records Tab */}
                        {activeTab === 'records' && (
                            <div className="space-y-6">
                                {/* Export Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={exportRecordStats}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                                        disabled={recordStats.length === 0}
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                </div>

                                {/* Record Leaderboards */}
                                {recordStats.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                                        <p className="text-gray-600">No record data available</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Back-to-Back Titles */}
                                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg p-6 border border-amber-200">
                                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                                <Trophy className="w-6 h-6 text-amber-600" />
                                                🏆 Back-to-Back Titles
                                            </h3>
                                            <div className="space-y-2">
                                                {recordStats
                                                    .filter(p => p.backToBackTitles > 0)
                                                    .sort((a, b) => b.backToBackTitles - a.backToBackTitles)
                                                    .slice(0, 10)
                                                    .map((player, index) => (
                                                        <div
                                                            key={player.userId}
                                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${player.userId === user.id
                                                                ? 'bg-amber-200 border-2 border-amber-400'
                                                                : 'bg-white hover:bg-amber-100'
                                                                }`}
                                                            onClick={() => navigate(`/profile/${player.userId}`)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-amber-700 w-6">{index + 1}</span>
                                                                <span className="font-medium">{player.userName}</span>
                                                                {player.userId === user.id && (
                                                                    <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded">You</span>
                                                                )}
                                                            </div>
                                                            <span className="text-2xl font-bold text-amber-700">{player.backToBackTitles}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Longest Win Streak */}
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border border-green-200">
                                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                                <Flame className="w-6 h-6 text-green-600" />
                                                🔥 Longest Win Streak
                                            </h3>
                                            <div className="space-y-2">
                                                {recordStats
                                                    .filter(p => p.longestWinStreak > 0)
                                                    .sort((a, b) => b.longestWinStreak - a.longestWinStreak)
                                                    .slice(0, 10)
                                                    .map((player, index) => (
                                                        <div
                                                            key={player.userId}
                                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${player.userId === user.id
                                                                ? 'bg-green-200 border-2 border-green-400'
                                                                : 'bg-white hover:bg-green-100'
                                                                }`}
                                                            onClick={() => navigate(`/profile/${player.userId}`)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-green-700 w-6">{index + 1}</span>
                                                                <span className="font-medium">{player.userName}</span>
                                                                {player.userId === user.id && (
                                                                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">You</span>
                                                                )}
                                                            </div>
                                                            <span className="text-2xl font-bold text-green-700">{player.longestWinStreak}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Finals Streak */}
                                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border border-purple-200">
                                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                                <Crown className="w-6 h-6 text-purple-600" />
                                                👑 Finals Streak
                                            </h3>
                                            <div className="space-y-2">
                                                {recordStats
                                                    .filter(p => p.finalsStreak > 0)
                                                    .sort((a, b) => b.finalsStreak - a.finalsStreak)
                                                    .slice(0, 10)
                                                    .map((player, index) => (
                                                        <div
                                                            key={player.userId}
                                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${player.userId === user.id
                                                                ? 'bg-purple-200 border-2 border-purple-400'
                                                                : 'bg-white hover:bg-purple-100'
                                                                }`}
                                                            onClick={() => navigate(`/profile/${player.userId}`)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-purple-700 w-6">{index + 1}</span>
                                                                <span className="font-medium">{player.userName}</span>
                                                                {player.userId === user.id && (
                                                                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">You</span>
                                                                )}
                                                            </div>
                                                            <span className="text-2xl font-bold text-purple-700">{player.finalsStreak}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Perfect Tournaments */}
                                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-6 border border-blue-200">
                                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                                <Target className="w-6 h-6 text-blue-600" />
                                                💎 Perfect Tournaments
                                            </h3>
                                            <div className="space-y-2">
                                                {recordStats
                                                    .filter(p => p.perfectTournaments > 0)
                                                    .sort((a, b) => b.perfectTournaments - a.perfectTournaments)
                                                    .slice(0, 10)
                                                    .map((player, index) => (
                                                        <div
                                                            key={player.userId}
                                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${player.userId === user.id
                                                                ? 'bg-blue-200 border-2 border-blue-400'
                                                                : 'bg-white hover:bg-blue-100'
                                                                }`}
                                                            onClick={() => navigate(`/profile/${player.userId}`)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-blue-700 w-6">{index + 1}</span>
                                                                <span className="font-medium">{player.userName}</span>
                                                                {player.userId === user.id && (
                                                                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">You</span>
                                                                )}
                                                            </div>
                                                            <span className="text-2xl font-bold text-blue-700">{player.perfectTournaments}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AchievementsStatsPage;
