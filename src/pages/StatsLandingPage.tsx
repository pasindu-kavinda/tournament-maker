import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, ArrowLeft, Target, Award } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import UserDropdown from '@/components/UserDropdown';
import StatsCategoryCard from '@/components/StatsCategoryCard';
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
                        <div className="flex items-center justify-center gap-2 xs:gap-3 mb-2">
                            <TrendingUp className="w-8 h-8 xs:w-10 xs:h-10 text-indigo-600" />
                            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-800">Tournament Statistics</h1>
                        </div>
                        <p className="text-sm xs:text-base text-gray-600">Choose a statistics category to explore</p>
                    </div>
                </header>

                {/* Stats Category Cards */}
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4 xs:gap-6">
                    <StatsCategoryCard
                        icon={Trophy}
                        title="Finals Stats"
                        subtitle="Championship Performance"
                        description="View player, duo, and team performance in tournament finals. See who dominates when it matters most."
                        badges={[
                            { icon: Award, label: 'Finals Only', color: 'primary' },
                            { icon: Target, label: 'Championship Matches', color: 'secondary' }
                        ]}
                        buttonText="View Finals Stats"
                        gradientFrom="from-yellow-400"
                        gradientTo="to-orange-500"
                        onClick={() => navigate('/stats/finals')}
                    />

                    <StatsCategoryCard
                        icon={TrendingUp}
                        title="Overview Stats"
                        subtitle="Complete Performance"
                        description="Comprehensive statistics across all matches and tournaments. Track overall performance and rankings."
                        badges={[
                            { icon: Award, label: 'All Matches', color: 'primary' },
                            { icon: Target, label: 'Complete History', color: 'secondary' }
                        ]}
                        buttonText="View Overview Stats"
                        gradientFrom="from-indigo-500"
                        gradientTo="to-purple-600"
                        onClick={() => navigate('/stats/overview')}
                    />

                    <StatsCategoryCard
                        icon={Award}
                        title="Achievements & Records"
                        subtitle="Player Milestones & Leaderboards"
                        description="View achievement leaderboards and personal records. See who has the most achievements, longest win streaks, and perfect tournaments."
                        badges={[
                            { icon: Trophy, label: '23 Achievements', color: 'primary' },
                            { icon: Target, label: '4 Record Categories', color: 'secondary' }
                        ]}
                        buttonText="View Achievements & Records"
                        gradientFrom="from-purple-500"
                        gradientTo="to-pink-600"
                        onClick={() => navigate('/stats/achievements')}
                        colSpan="double"
                    />
                </div>

                {/* Info Section */}
                <div className="max-w-5xl mx-auto mt-6 xs:mt-8 bg-white/50 backdrop-blur rounded-xl p-4 xs:p-6">
                    <div className="grid md:grid-cols-2 gap-4 xs:gap-6 text-xs xs:text-sm text-gray-600">
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
