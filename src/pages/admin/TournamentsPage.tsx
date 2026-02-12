import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Trophy, Search, X, Calendar, MapPin, Users as UsersIcon, Trash2, Edit, Eye } from 'lucide-react';

interface Tournament {
    id: string;
    name: string;
    venue: string;
    status: 'pending' | 'in_progress' | 'completed';
    created_at: string;
    date: string;
    user_id: string;
    creator_name?: string;
    team_count?: number;
    match_count?: number;
}

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

export default function TournamentsPage() {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadTournaments();
    }, []);

    useEffect(() => {
        filterTournaments();
    }, [searchQuery, statusFilter, tournaments]);

    const loadTournaments = async () => {
        try {
            setLoading(true);

            // Fetch tournaments with creator info and counts
            const { data: tournamentsData, error: tournamentsError } = await supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false });

            if (tournamentsError) throw tournamentsError;

            // Get user data - use created_by field
            const creatorIds = [...new Set(tournamentsData?.map(t => t.created_by).filter(id => id) || [])];
            let userMap = new Map<string, string>();
            if (creatorIds.length > 0) {
                const { data: usersData } = await supabase
                    .from('users')
                    .select('id, full_name')
                    .in('id', creatorIds);

                userMap = new Map(usersData?.map(u => [u.id, u.full_name || 'Unknown']) || []);
            }

            // Get team and match counts for each tournament
            const tournamentsWithCounts = await Promise.all(
                (tournamentsData || []).map(async (tournament) => {
                    const [{ count: teamCount }, { count: matchCount }] = await Promise.all([
                        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('tournament_id', tournament.id),
                        supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', tournament.id),
                    ]);

                    return {
                        ...tournament,
                        creator_name: userMap.get(tournament.created_by),
                        team_count: teamCount || 0,
                        match_count: matchCount || 0,
                    };
                })
            );

            setTournaments(tournamentsWithCounts);
            setFilteredTournaments(tournamentsWithCounts);
        } catch (error) {
            console.error('Error loading tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterTournaments = () => {
        let filtered = tournaments;

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                t =>
                    t.name.toLowerCase().includes(query) ||
                    t.venue.toLowerCase().includes(query) ||
                    t.creator_name?.toLowerCase().includes(query) ||
                    t.id.toLowerCase().includes(query)
            );
        }

        setFilteredTournaments(filtered);
    };

    const deleteTournament = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis will also delete:\n- All teams\n- All matches\n- All statistics\n\nThis action cannot be undone!`)) {
            return;
        }

        try {
            setDeletingId(id);

            // Delete in order: matches, teams, tournament
            const { error: matchesError } = await supabase
                .from('matches')
                .delete()
                .eq('tournament_id', id);

            if (matchesError) throw matchesError;

            const { error: teamsError } = await supabase
                .from('teams')
                .delete()
                .eq('tournament_id', id);

            if (teamsError) throw teamsError;

            const { error: tournamentError } = await supabase
                .from('tournaments')
                .delete()
                .eq('id', id);

            if (tournamentError) throw tournamentError;

            // Update local state
            setTournaments(prev => prev.filter(t => t.id !== id));

            // Show success message
            alert(`Tournament "${name}" deleted successfully!`);
        } catch (error) {
            console.error('Error deleting tournament:', error);
            alert('Failed to delete tournament. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
        };
        const labels = {
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tournament Management</h1>
                        <p className="text-sm text-gray-500">
                            {filteredTournaments.length} {filteredTournaments.length === 1 ? 'tournament' : 'tournaments'}
                            {(searchQuery || statusFilter !== 'all') && ` (filtered from ${tournaments.length})`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
                {/* Status Filter */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${statusFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All ({tournaments.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${statusFilter === 'pending'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Pending ({tournaments.filter(t => t.status === 'pending').length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('in_progress')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${statusFilter === 'in_progress'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        In Progress ({tournaments.filter(t => t.status === 'in_progress').length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${statusFilter === 'completed'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Completed ({tournaments.filter(t => t.status === 'completed').length})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, venue, creator, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tournaments List */}
            <div className="space-y-4">
                {filteredTournaments.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                            {searchQuery || statusFilter !== 'all'
                                ? 'No tournaments found matching your filters.'
                                : 'No tournaments yet.'}
                        </p>
                    </div>
                ) : (
                    filteredTournaments.map((tournament) => (
                        <div
                            key={tournament.id}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                                        {getStatusBadge(tournament.status)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            <span>{tournament.venue}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span>Created: {formatDate(tournament.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UsersIcon className="h-4 w-4 text-gray-400" />
                                            <span>{tournament.team_count} teams, {tournament.match_count} matches</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Created by:</span>
                                            <span className="font-medium">{tournament.creator_name || 'Unknown'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-400">
                                        ID: {tournament.id.slice(0, 8)}...
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => navigate(`/tournament/${tournament.id}/view`)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View
                                    </button>
                                    <button
                                        onClick={() => navigate(`/tournament/${tournament.id}`)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => navigate(`/admin/tournament/${tournament.id}`)}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Admin Edit
                                    </button>
                                    <button
                                        onClick={() => deleteTournament(tournament.id, tournament.name)}
                                        disabled={deletingId === tournament.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {deletingId === tournament.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <Trophy className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">Tournament Management</h3>
                        <div className="mt-2 text-sm text-amber-700">
                            <ul className="list-disc list-inside space-y-1">
                                <li>Use filters to quickly find tournaments by status</li>
                                <li>Search across names, venues, and creator emails</li>
                                <li>View tournament details in spectator mode</li>
                                <li>Edit tournaments using the standard tournament page</li>
                                <li>Delete tournaments permanently (cannot be undone!)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
