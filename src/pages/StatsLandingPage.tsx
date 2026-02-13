import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, ArrowLeft, Target, Award } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import UserDropdown from '@/components/UserDropdown';
interface StatsLandingPageProps {
    user: User;
}

function StatsLandingPage({ user }: StatsLandingPageProps) {
    const navigate = useNavigate();
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

                        <UserDropdown displayName={displayName} />
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <TrendingUp className="w-10 h-10 text-indigo-600" />
                            <h1 className="text-4xl font-bold text-gray-800">Tournament Statistics</h1>
                        </div>
                        <p className="text-gray-600">Choose a statistics category to explore</p>
                    </div>
                </header>

                {/* Stats Category Cards */}
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
                    {/* Finals Stats Card */}
                    <button
                        onClick={() => navigate('/stats/finals')}
                        className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Trophy className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-indigo-600 transition">
                                    Finals Stats
                                </h2>
                                <p className="text-sm text-gray-500">Championship Performance</p>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-4">
                            View player, duo, and team performance in tournament finals. See who dominates when it matters most.
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-indigo-600">
                                <Award className="w-4 h-4" />
                                <span className="font-medium">Finals Only</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Target className="w-4 h-4" />
                                <span>Championship Matches</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
                            <span>View Finals Stats</span>
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </div>
                    </button>

                    {/* Overview Stats Card */}
                    <button
                        onClick={() => navigate('/stats/overview')}
                        className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-indigo-600 transition">
                                    Overview Stats
                                </h2>
                                <p className="text-sm text-gray-500">Complete Performance</p>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Comprehensive statistics across all matches and tournaments. Track overall performance and rankings.
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-indigo-600">
                                <Award className="w-4 h-4" />
                                <span className="font-medium">All Matches</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Target className="w-4 h-4" />
                                <span>Complete History</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
                            <span>View Overview Stats</span>
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </div>
                    </button>

                    {/* Achievements & Records Card */}
                    <button
                        onClick={() => navigate('/stats/achievements')}
                        className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left md:col-span-2"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Award className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-indigo-600 transition">
                                    Achievements & Records
                                </h2>
                                <p className="text-sm text-gray-500">Player Milestones & Leaderboards</p>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-4">
                            View achievement leaderboards and personal records. See who has the most achievements, longest win streaks, and perfect tournaments.
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-indigo-600">
                                <Trophy className="w-4 h-4" />
                                <span className="font-medium">23 Achievements</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Target className="w-4 h-4" />
                                <span>4 Record Categories</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
                            <span>View Achievements & Records</span>
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </div>
                    </button>
                </div>

                {/* Info Section */}
                <div className="max-w-5xl mx-auto mt-8 bg-white/50 backdrop-blur rounded-xl p-6">
                    <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                Finals Stats
                            </h3>
                            <ul className="space-y-1 ml-6 list-disc">
                                <li>Championship match performance only</li>
                                <li>Win rates in decisive moments</li>
                                <li>Best partnerships in finals</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                                Overview Stats
                            </h3>
                            <ul className="space-y-1 ml-6 list-disc">
                                <li>All matches across all tournaments</li>
                                <li>Complete win/loss records</li>
                                <li>Overall player rankings</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatsLandingPage;
