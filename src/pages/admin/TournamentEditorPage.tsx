import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, Trophy, Users, Sword, Award, Calendar, MapPin, Tag } from 'lucide-react';

interface Tournament {
    id: string;
    name: string;
    venue: string;
    status: 'pending' | 'in_progress' | 'completed';
    date: string;
    user_id: string;
    creator_name?: string;
    type?: string;
}

interface Team {
    id: string;
    name: string;
    members: string[]; // Array of user IDs
    tournament_id: string;
}

interface UserProfile {
    id: string;
    full_name: string;
}

interface Match {
    id: string;
    tournament_id: string;
    team1_id: string;
    team2_id: string;
    team1_score: number;
    team2_score: number;
    match_number: number;
    status: 'pending' | 'in_progress' | 'completed';
    teams?: {
        team1: Team;
        team2: Team;
    };
}

type TabType = 'overview' | 'teams' | 'matches' | 'final';

export default function TournamentEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Tournament data
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [teamMembers, setTeamMembers] = useState<{ [key: string]: UserProfile[] }>({});

    // Edit states
    const [editedName, setEditedName] = useState('');
    const [editedVenue, setEditedVenue] = useState('');
    const [editedStatus, setEditedStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
    const [editedDate, setEditedDate] = useState('');
    const [editedType, setEditedType] = useState('');

    useEffect(() => {
        if (id) {
            loadTournamentData();
        }
    }, [id]);

    const loadTournamentData = async () => {
        try {
            setLoading(true);

            // Load tournament
            const { data: tournamentData, error: tournamentError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', id)
                .single();

            if (tournamentError) throw tournamentError;

            // Load creator name
            const { data: creatorData } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', tournamentData.created_by)
                .single();

            const enrichedTournament = {
                ...tournamentData,
                creator_name: creatorData?.full_name || 'Unknown'
            };

            setTournament(enrichedTournament);
            setEditedName(enrichedTournament.name);
            setEditedVenue(enrichedTournament.venue);
            setEditedStatus(enrichedTournament.status);
            setEditedType(enrichedTournament.type || 'men-single');
            // Use created_at if date is not set, format it properly for date input
            const dateValue = enrichedTournament.date || enrichedTournament.created_at.split('T')[0];
            setEditedDate(dateValue);

            // Load teams
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*')
                .eq('tournament_id', id)
                .order('created_at', { ascending: true });

            if (teamsError) throw teamsError;
            setTeams(teamsData || []);

            // Load team members
            if (teamsData && teamsData.length > 0) {
                const allMemberIds = new Set<string>();
                teamsData.forEach(team => {
                    team.members.forEach((memberId: string) => allMemberIds.add(memberId));
                });

                if (allMemberIds.size > 0) {
                    const { data: usersData } = await supabase
                        .from('users')
                        .select('id, full_name')
                        .in('id', Array.from(allMemberIds));

                    if (usersData) {
                        const userMap = new Map(usersData.map(u => [u.id, u]));
                        const membersMap: { [key: string]: UserProfile[] } = {};

                        teamsData.forEach(team => {
                            membersMap[team.id] = team.members
                                .map((memberId: string) => userMap.get(memberId))
                                .filter((user: UserProfile | undefined): user is UserProfile => user !== undefined);
                        });

                        setTeamMembers(membersMap);
                    }
                }
            }

            // Load matches with team details
            const { data: matchesData, error: matchesError } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', id)
                .order('match_number', { ascending: true });

            if (matchesError) throw matchesError;

            // Enrich matches with team data
            const enrichedMatches = (matchesData || []).map(match => {
                const team1 = teamsData?.find(t => t.id === match.team1_id);
                const team2 = teamsData?.find(t => t.id === match.team2_id);
                return {
                    ...match,
                    teams: {
                        team1: team1!,
                        team2: team2!,
                    },
                };
            });

            setMatches(enrichedMatches);
        } catch (error) {
            console.error('Error loading tournament:', error);
            alert('Failed to load tournament data.');
        } finally {
            setLoading(false);
        }
    };

    const saveTournamentOverview = async () => {
        try {
            setSaving(true);

            const { error } = await supabase
                .from('tournaments')
                .update({
                    name: editedName,
                    venue: editedVenue,
                    status: editedStatus,
                    date: editedDate,
                    type: editedType,
                })
                .eq('id', id);

            if (error) throw error;

            setTournament(prev => prev ? { ...prev, name: editedName, venue: editedVenue, status: editedStatus, date: editedDate, type: editedType } : null);
            alert('Tournament updated successfully!');
        } catch (error) {
            console.error('Error saving tournament:', error);
            alert('Failed to save tournament. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const saveMatch = async (match: Match) => {
        try {
            const { error } = await supabase
                .from('matches')
                .update({
                    team1_score: match.team1_score,
                    team2_score: match.team2_score,
                    status: match.status,
                })
                .eq('id', match.id);

            if (error) throw error;

            setMatches(prev => prev.map(m => m.id === match.id ? match : m));
            alert('Match updated successfully!');
        } catch (error) {
            console.error('Error saving match:', error);
            alert('Failed to save match. Please try again.');
        }
    };

    const reorderMatches = async (newOrder: Match[]) => {
        try {
            setSaving(true);

            // Update match numbers
            const updates = newOrder.map((match, index) => ({
                id: match.id,
                match_number: index + 1,
            }));

            for (const update of updates) {
                const { error } = await supabase
                    .from('matches')
                    .update({ match_number: update.match_number })
                    .eq('id', update.id);

                if (error) throw error;
            }

            await loadTournamentData();
            alert('Match order updated successfully!');
        } catch (error) {
            console.error('Error reordering matches:', error);
            alert('Failed to reorder matches. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Tournament not found.</p>
                <button
                    onClick={() => navigate('/admin/tournaments')}
                    className="mt-4 text-indigo-600 hover:text-indigo-700"
                >
                    Back to Tournaments
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <button
                    onClick={() => navigate('/admin/tournaments')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Tournaments
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <Trophy className="w-10 h-10 text-indigo-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{tournament.name}</h1>
                        <p className="text-gray-600">Tournament Editor</p>
                    </div>
                </div>

                {/* Tabs */}
                <nav className="flex gap-2 border-t pt-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${activeTab === 'overview'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Trophy className="w-4 h-4" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${activeTab === 'teams'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Teams ({teams.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${activeTab === 'matches'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Sword className="w-4 h-4" />
                        Matches ({matches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('final')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${activeTab === 'final'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Award className="w-4 h-4" />
                        Final Match
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <OverviewTab
                    tournament={tournament}
                    name={editedName}
                    venue={editedVenue}
                    status={editedStatus}
                    date={editedDate}
                    onNameChange={setEditedName}
                    onVenueChange={setEditedVenue}
                    onStatusChange={setEditedStatus}
                    onDateChange={setEditedDate}
                    onTypeChange={setEditedType}
                    onSave={saveTournamentOverview}
                    saving={saving}
                />
            )}

            {activeTab === 'teams' && (
                <TeamsTab teams={teams} teamMembers={teamMembers} onReload={loadTournamentData} />
            )}

            {activeTab === 'matches' && (
                <MatchesTab matches={matches} onSave={saveMatch} onReorder={reorderMatches} saving={saving} />
            )}

            {activeTab === 'final' && (
                <FinalMatchTab tournament={tournament} teams={teams} teamMembers={teamMembers} onReload={loadTournamentData} />
            )}
        </div>
    );
}

// Overview Tab Component
interface OverviewTabProps {
    tournament: Tournament;
    name: string;
    venue: string;
    status: 'pending' | 'in_progress' | 'completed';
    date: string;
    onNameChange: (value: string) => void;
    onVenueChange: (value: string) => void;
    onStatusChange: (value: 'pending' | 'in_progress' | 'completed') => void;
    onDateChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onSave: () => void;
    saving: boolean;
}

const TOURNAMENT_TYPES = [
    { value: 'men-single', label: "Men's Single" },
    { value: 'women-single', label: "Women's Single" },
    { value: 'men-double', label: "Men's Double" },
    { value: 'women-double', label: "Women's Double" },
    { value: 'mixed-double', label: "Mixed Double" },
    { value: 'mixed-single', label: "Mixed Single" }
];

function OverviewTab({ tournament, name, venue, status, date, onNameChange, onVenueChange, onStatusChange, onDateChange, onTypeChange, onSave, saving }: OverviewTabProps) {
    return (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-indigo-600" />
                Tournament Details
            </h2>

            {/* Creator Info - Read-Only */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Created by</p>
                <p className="text-lg font-semibold text-gray-800">{tournament.creator_name || 'Unknown'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Tag className="w-4 h-4 inline mr-1" />
                        Tournament Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter tournament name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Venue
                    </label>
                    <input
                        type="text"
                        value={venue}
                        onChange={(e) => onVenueChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter venue"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => onStatusChange(e.target.value as 'pending' | 'in_progress' | 'completed')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tournament Type
                    </label>
                    <select
                        value={tournament.type || 'men-single'}
                        onChange={(e) => onTypeChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        {TOURNAMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
}

// Teams Tab Component
interface TeamsTabProps {
    teams: Team[];
    teamMembers: { [key: string]: UserProfile[] };
    onReload: () => void;
}

function TeamsTab({ teams, teamMembers, onReload }: TeamsTabProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    const [saving, setSaving] = useState(false);

    const startEditing = (team: Team) => {
        setEditingId(team.id);
        setEditedName(team.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditedName('');
    };

    const saveTeam = async (teamId: string) => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('teams')
                .update({ name: editedName })
                .eq('id', teamId);

            if (error) throw error;

            await onReload();
            setEditingId(null);
            setEditedName('');
            alert('Team updated successfully!');
        } catch (error) {
            console.error('Error updating team:', error);
            alert('Failed to update team. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                Teams Management
            </h2>

            <div className="space-y-4">
                {teams.map((team) => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                        {editingId === team.id ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter team name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        {teamMembers[team.id] && teamMembers[team.id].length > 0 ? (
                                            <ul className="space-y-1">
                                                {teamMembers[team.id].map(member => (
                                                    <li key={member.id} className="text-gray-700">
                                                        • {member.full_name}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500 text-sm">No members</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Note: Team members cannot be edited in admin panel. They must be managed by the tournament creator.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => saveTeam(team.id)}
                                        disabled={saving}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4 inline mr-1" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        disabled={saving}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-800 mb-2">{team.name}</h3>
                                    <div className="text-sm text-gray-600">
                                        <p className="font-medium mb-1">Members:</p>
                                        {teamMembers[team.id] && teamMembers[team.id].length > 0 ? (
                                            <ul className="space-y-1 pl-4">
                                                {teamMembers[team.id].map(member => (
                                                    <li key={member.id}>• {member.full_name}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-400 pl-4">No members</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => startEditing(team)}
                                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                                >
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Matches Tab Component
interface MatchesTabProps {
    matches: Match[];
    onSave: (match: Match) => void;
    onReorder: (matches: Match[]) => void;
    saving: boolean;
}

function MatchesTab({ matches, onSave, onReorder, saving }: MatchesTabProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedMatch, setEditedMatch] = useState<Match | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [localMatches, setLocalMatches] = useState(matches);

    useEffect(() => {
        setLocalMatches(matches);
    }, [matches]);

    const startEditing = (match: Match) => {
        setEditingId(match.id);
        setEditedMatch({ ...match });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditedMatch(null);
    };

    const saveMatch = () => {
        if (editedMatch) {
            onSave(editedMatch);
            setEditingId(null);
            setEditedMatch(null);
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newMatches = [...localMatches];
        const draggedItem = newMatches[draggedIndex];
        newMatches.splice(draggedIndex, 1);
        newMatches.splice(index, 0, draggedItem);

        setLocalMatches(newMatches);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        if (JSON.stringify(localMatches) !== JSON.stringify(matches)) {
            onReorder(localMatches);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Sword className="w-6 h-6 text-indigo-600" />
                    Matches Management
                </h2>
                <p className="text-sm text-gray-500">Drag to reorder matches</p>
            </div>

            <div className="space-y-3">
                {localMatches.map((match, index) => (
                    <div
                        key={match.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`border border-gray-200 rounded-lg p-4 cursor-move hover:bg-gray-50 transition ${draggedIndex === index ? 'opacity-50' : ''
                            }`}
                    >
                        {editingId === match.id && editedMatch ? (
                            <div className="space-y-4">
                                <div className="text-sm font-medium text-gray-500">Match #{match.match_number}</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {match.teams?.team1?.name} Score
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editedMatch.team1_score}
                                            onChange={(e) => setEditedMatch({ ...editedMatch, team1_score: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {match.teams?.team2?.name} Score
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editedMatch.team2_score}
                                            onChange={(e) => setEditedMatch({ ...editedMatch, team2_score: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <select
                                        value={editedMatch.status}
                                        onChange={(e) => setEditedMatch({ ...editedMatch, status: e.target.value as 'pending' | 'in_progress' | 'completed' })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveMatch}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        <Save className="w-4 h-4 inline mr-1" />
                                        Save
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-500 mb-2">Match #{match.match_number}</div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 text-right">
                                            <div className="font-bold text-gray-800">{match.teams?.team1?.name}</div>
                                            <div className="text-2xl font-bold text-indigo-600">{match.team1_score}</div>
                                        </div>
                                        <div className="text-gray-400 font-bold">VS</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800">{match.teams?.team2?.name}</div>
                                            <div className="text-2xl font-bold text-purple-600">{match.team2_score}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${match.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            match.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {match.status === 'completed' ? 'Completed' :
                                                match.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => startEditing(match)}
                                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                                >
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Final Match Tab Component
interface FinalMatchTabProps {
    tournament: Tournament;
    teams: Team[];
    teamMembers: { [key: string]: UserProfile[] };
    onReload: () => void;
}

function FinalMatchTab({ tournament, teams, teamMembers, onReload }: FinalMatchTabProps) {
    const [selectedTeam1, setSelectedTeam1] = useState('');
    const [selectedTeam2, setSelectedTeam2] = useState('');
    const [score1, setScore1] = useState(0);
    const [score2, setScore2] = useState(0);
    const [saving, setSaving] = useState(false);

    const createFinalMatch = async () => {
        if (!selectedTeam1 || !selectedTeam2) {
            alert('Please select both teams for the final match.');
            return;
        }

        if (selectedTeam1 === selectedTeam2) {
            alert('Please select different teams.');
            return;
        }

        if (!confirm('Create or update the final match with these teams?')) {
            return;
        }

        try {
            setSaving(true);

            // Check if final match exists
            const { data: existingMatch } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournament.id)
                .eq('match_number', 999)
                .single();

            if (existingMatch) {
                // Update existing final match
                const { error } = await supabase
                    .from('matches')
                    .update({
                        team1_id: selectedTeam1,
                        team2_id: selectedTeam2,
                        team1_score: score1,
                        team2_score: score2,
                        status: 'pending',
                    })
                    .eq('id', existingMatch.id);

                if (error) throw error;
            } else {
                // Create new final match
                const { error } = await supabase
                    .from('matches')
                    .insert({
                        tournament_id: tournament.id,
                        team1_id: selectedTeam1,
                        team2_id: selectedTeam2,
                        team1_score: score1,
                        team2_score: score2,
                        match_number: 999,
                        status: 'pending',
                    });

                if (error) throw error;
            }

            alert('Final match created/updated successfully!');
            onReload();
        } catch (error) {
            console.error('Error creating final match:', error);
            alert('Failed to create final match. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Award className="w-6 h-6 text-indigo-600" />
                Final Match Setup
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Use this to manually create or fix the final match. This is useful when the automatic bracket
                    generation has errors or when you need to manually determine the final match participants.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team 1</label>
                    <select
                        value={selectedTeam1}
                        onChange={(e) => setSelectedTeam1(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Team 1</option>
                        {teams.map((team) => {
                            const members = teamMembers[team.id] || [];
                            const memberNames = members.map(m => m.full_name).join(' & ');
                            return (
                                <option key={team.id} value={team.id}>
                                    {team.name} ({memberNames || 'No members'})
                                </option>
                            );
                        })}
                    </select>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Team 1 Score</label>
                        <input
                            type="number"
                            min="0"
                            value={score1}
                            onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team 2</label>
                    <select
                        value={selectedTeam2}
                        onChange={(e) => setSelectedTeam2(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Team 2</option>
                        {teams.map((team) => {
                            const members = teamMembers[team.id] || [];
                            const memberNames = members.map(m => m.full_name).join(' & ');
                            return (
                                <option key={team.id} value={team.id}>
                                    {team.name} ({memberNames || 'No members'})
                                </option>
                            );
                        })}
                    </select>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Team 2 Score</label>
                        <input
                            type="number"
                            min="0"
                            value={score2}
                            onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={createFinalMatch}
                disabled={saving || !selectedTeam1 || !selectedTeam2}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Create/Update Final Match'}
            </button>
        </div>
    );
}
