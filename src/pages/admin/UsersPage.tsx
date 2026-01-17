import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Search, Save, X, Mail, Calendar } from 'lucide-react';

interface User {
    id: string;
    full_name: string | null;
    created_at: string;
    last_sign_in_at: string | null;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        // Filter users based on search query
        if (searchQuery.trim() === '') {
            setFilteredUsers(users);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = users.filter(
                (user) =>
                    user.full_name?.toLowerCase().includes(query) ||
                    user.id.toLowerCase().includes(query)
            );
            setFilteredUsers(filtered);
        }
    }, [searchQuery, users]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, created_at, last_sign_in_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (user: User) => {
        setEditingUserId(user.id);
        setEditedName(user.full_name || '');
    };

    const cancelEditing = () => {
        setEditingUserId(null);
        setEditedName('');
    };

    const saveUser = async (userId: string) => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('users')
                .update({ full_name: editedName.trim() || null })
                .eq('id', userId);

            if (error) throw error;

            // Update local state
            setUsers((prev) =>
                prev.map((user) =>
                    user.id === userId ? { ...user, full_name: editedName.trim() || null } : user
                )
            );

            setEditingUserId(null);
            setEditedName('');
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Failed to save user. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
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
                    <Users className="h-8 w-8 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                        <p className="text-sm text-gray-500">
                            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                            {searchQuery && ` (filtered from ${users.length})`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name or ID..."
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

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Sign In
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        {searchQuery ? 'No users found matching your search.' : 'No users yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {editingUserId === user.id ? (
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                    placeholder="Enter full name"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.full_name || (
                                                            <span className="text-gray-400 italic">No name set</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs text-gray-500 font-mono">{user.id}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-500">
                                                {formatDate(user.last_sign_in_at)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {editingUserId === user.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => saveUser(user.id)}
                                                        disabled={saving}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                        {saving ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        disabled={saving}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <X className="h-4 w-4" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(user)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Edit Name
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">User Management</h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <ul className="list-disc list-inside space-y-1">
                                <li>Click "Edit Name" to update a user's display name</li>
                                <li>Use the search bar to filter users by name or ID</li>
                                <li>User data is synced from Supabase authentication</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
