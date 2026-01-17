import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalTournaments: 0,
        activeTournaments: 0,
        totalMatches: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);

        // Load all stats in parallel
        const [usersResult, tournamentsResult, matchesResult] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('tournaments').select('id, status', { count: 'exact' }),
            supabase.from('matches').select('id', { count: 'exact', head: true }),
        ]);

        const activeTournaments = tournamentsResult.data?.filter(
            (t) => t.status === 'in_progress' || t.status === 'pending'
        ).length || 0;

        setStats({
            totalUsers: usersResult.count || 0,
            totalTournaments: tournamentsResult.count || 0,
            activeTournaments,
            totalMatches: matchesResult.count || 0,
        });

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-10 h-10 text-indigo-600" />
                        <span className="text-3xl font-bold text-gray-800">{stats.totalUsers}</span>
                    </div>
                    <p className="text-gray-600 font-medium">Total Users</p>
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Manage Users →
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Trophy className="w-10 h-10 text-yellow-600" />
                        <span className="text-3xl font-bold text-gray-800">{stats.totalTournaments}</span>
                    </div>
                    <p className="text-gray-600 font-medium">Total Tournaments</p>
                    <button
                        onClick={() => navigate('/admin/tournaments')}
                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Manage Tournaments →
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="w-10 h-10 text-green-600" />
                        <span className="text-3xl font-bold text-gray-800">{stats.activeTournaments}</span>
                    </div>
                    <p className="text-gray-600 font-medium">Active Tournaments</p>
                    <p className="mt-3 text-sm text-gray-500">In progress or pending</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Target className="w-10 h-10 text-purple-600" />
                        <span className="text-3xl font-bold text-gray-800">{stats.totalMatches}</span>
                    </div>
                    <p className="text-gray-600 font-medium">Total Matches</p>
                    <p className="mt-3 text-sm text-gray-500">Across all tournaments</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition text-left"
                    >
                        <Users className="w-6 h-6 text-indigo-600" />
                        <div>
                            <p className="font-medium text-gray-800">Manage Users</p>
                            <p className="text-sm text-gray-600">Edit names and view users</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/tournaments')}
                        className="flex items-center gap-3 p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition text-left"
                    >
                        <Trophy className="w-6 h-6 text-yellow-600" />
                        <div>
                            <p className="font-medium text-gray-800">View Tournaments</p>
                            <p className="text-sm text-gray-600">Browse and manage all tournaments</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-left"
                    >
                        <TrendingUp className="w-6 h-6 text-gray-600" />
                        <div>
                            <p className="font-medium text-gray-800">View Statistics</p>
                            <p className="text-sm text-gray-600">Tournament and player stats</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <p className="text-sm text-yellow-800">
                    <strong>Admin Mode:</strong> You have full access to manage all users, tournaments, teams, and matches.
                    Be careful when making changes as they affect all users.
                </p>
            </div>
        </div>
    );
}

export default AdminDashboard;
