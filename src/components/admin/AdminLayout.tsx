import { Navigate, Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Shield, Users, Trophy, Home, ArrowLeft } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';

function AdminLayout() {
    const { isAdmin, isLoading } = useAdmin();
    const navigate = useNavigate();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Back to Home
                            </button>
                            <div className="flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-lg">
                                <Shield className="w-5 h-5 text-indigo-600" />
                                <span className="font-semibold text-indigo-600">Admin Mode</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-10 h-10 text-indigo-600" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
                                <p className="text-gray-600">Manage users, tournaments, and matches</p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <nav className="flex gap-2 mt-4 border-t pt-4">
                            <Link
                                to="/admin"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${isActive('/admin')
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Home className="w-4 h-4" />
                                Dashboard
                            </Link>
                            <Link
                                to="/admin/users"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${isActive('/admin/users')
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Users
                            </Link>
                            <Link
                                to="/admin/tournaments"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${isActive('/admin/tournaments')
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Trophy className="w-4 h-4" />
                                Tournaments
                            </Link>
                        </nav>
                    </div>
                </header>

                {/* Content */}
                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
