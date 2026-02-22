import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, MapPin, Users, Trash2, ArrowLeft, TrendingUp, Target, FileText } from 'lucide-react';
import TeamInput from '../components/TeamInput';
import Bracket from '../components/Bracket';

import TeamStats from '../components/TeamStats';
import { Team, Match, UserProfile } from '../types';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import UserDropdown from '@/components/UserDropdown';
import { showPushNotification } from '@/lib/notifications';
import { useAdmin } from '@/contexts/AdminContext';
import {
  generateMatches,
  calculateTeamStats,
  getTopTeams,
  generateFinalMatch,
  sortTeamsByStats,
  generateCrossedSemiFinals,
  generateBalancedGroupMatches,
  groupsAreImbalanced,
} from '../utils/bracketUtils';
import FinalMatchCard from '../components/FinalMatchCard';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface TournamentPageProps {
  user: User;
}

function TournamentPage({ user }: TournamentPageProps) {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [finalMatch, setFinalMatch] = useState<Match | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalTeam, setFinalTeam] = useState<Team | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ [key: string]: UserProfile[] }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [displayName, setDisplayName] = useState('User');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBalancing, setIsBalancing] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
    loadUserName();
  }, [tournamentId]);

  useEffect(() => {
    if (teams.length > 0) {
      loadTeamMembers();
    }
  }, [teams]);



  const loadTeamMembers = async () => {
    const members: { [key: string]: UserProfile[] } = {};

    for (const team of teams) {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('id', team.members);

      if (users) {
        members[team.id] = users;
      }
    }

    setTeamMembers(members);
  };

  const loadUserName = async () => {
    const { data } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (data) setDisplayName(data.full_name || 'User');
  };

  const loadTournament = async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);
      setLoadError(null);

      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) {
        console.error('Error loading tournament:', tournamentError);
        setLoadError(`Failed to load tournament: ${tournamentError.message}`);
        setLoading(false);
        return;
      }

      if (tournamentData) {
        setTournament(tournamentData);
        setIsCreator(tournamentData.created_by === user.id);

        // Load teams
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('created_at', { ascending: true });

        if (teamsData) {
          // Transform database column names to camelCase
          const transformedTeams = teamsData.map(team => ({
            ...team,
            leadPoints: team.lead_points ?? 0,
            matchesPlayed: team.matches_played ?? 0,
            groupId: team.group_id
          }));
          setTeams(transformedTeams);
        }

        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*)
        `)
          .eq('tournament_id', tournamentId)
          .order('match_number', { ascending: true });

        if (matchesData) {
          const formattedMatches = matchesData.map(match => ({
            ...match,
            teams: [match.team1, match.team2],
            scores: [match.team1_score, match.team2_score],
            isCompleted: match.is_completed,
            winner: match.winner_id,
            pointDifference: match.point_difference,
            matchNumber: match.match_number,
            round: match.round,
            groupId: match.group_id
          }));

          const regularAndSemiMatches = formattedMatches.filter(m => m.round === 'regular' || m.round === 'semi-final');
          const finalMatchData = formattedMatches.find(m => m.round === 'final');

          setMatches(regularAndSemiMatches);
          if (finalMatchData) {
            setFinalMatch(finalMatchData);
            if (finalMatchData.winner_id) {
              const winningTeam = finalMatchData.teams.find((t: any) => t?.id === finalMatchData.winner_id);
              if (winningTeam) setFinalTeam(winningTeam);
            }
          }
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setLoadError('An unexpected error occurred while loading the tournament.');
      setLoading(false);
    }
  };

  const handleAddTeam = async (team: Team) => {
    if (!tournamentId || (!isCreator && !isAdmin)) return;

    const { data: newTeam } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentId,
        name: team.name,
        members: team.members,
        points: 0,
        wins: 0,
        matches_played: 0,
        lead_points: 0,
        group_id: team.groupId
      })
      .select()
      .single();

    if (newTeam) {
      // Transform database column names to camelCase
      const transformedTeam = {
        ...newTeam,
        leadPoints: newTeam.lead_points ?? 0,
        matchesPlayed: newTeam.matches_played ?? 0,
        groupId: newTeam.group_id
      };
      setTeams([...teams, transformedTeam]);

      // Send push notification to all tournament members
      showPushNotification(
        'Team Added! 👥',
        `${team.name} joined ${tournament?.name}`,
        tournamentId
      );
    }
  };

  const handleRemoveTeam = async (id: string) => {
    if (!isCreator && !isAdmin) return;
    await supabase.from('teams').delete().eq('id', id);
    setTeams(teams.filter(team => team.id !== id));
    setMatches([]);
    setFinalMatch(null);
  };

  const handleUpdateTeamGroup = async (teamId: string, groupId: string) => {
    if (!isCreator && !isAdmin) return;

    // Optimistic update
    setTeams(teams.map(t => t.id === teamId ? { ...t, groupId } : t));

    const { error } = await supabase
      .from('teams')
      .update({ group_id: groupId })
      .eq('id', teamId);

    if (error) {
      console.error('Error updating team group:', error);
      // Revert on error
      loadTournament();
    }
  };

  const handleGenerateMatches = async () => {
    if (!tournamentId || (!isCreator && !isAdmin)) return;

    // For groups structure, make sure every team has been assigned to A or B
    if (tournament.structure === 'groups') {
      const unassigned = teams.filter(t => !t.groupId || (t.groupId !== 'A' && t.groupId !== 'B'));
      if (unassigned.length > 0) {
        alert(`Please assign all teams to Group A or B before generating matches.\nUnassigned: ${unassigned.map(t => t.name).join(', ')}`);
        return;
      }
    }

    setIsProcessing(true);
    const generatedMatches = generateMatches(teams, tournament.structure as any || 'round-robin');

    const { data: newMatches } = await supabase
      .from('matches')
      .insert(
        generatedMatches.map((match) => ({
          tournament_id: tournamentId,
          team1_id: match.teams[0]?.id,
          team2_id: match.teams[1]?.id,
          match_number: match.matchNumber, // use the generator's numbering, not array index
          round: match.round,
          group_id: match.groupId ?? null
        }))
      )
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*)
      `);

    if (newMatches) {
      const formattedMatches = newMatches.map(match => ({
        ...match,
        teams: [match.team1, match.team2],
        scores: [match.team1_score, match.team2_score],
        isCompleted: match.is_completed,
        winner: match.winner_id,
        pointDifference: match.point_difference,
        matchNumber: match.match_number,
        round: match.round,
        groupId: match.group_id
      }));
      setMatches(formattedMatches);

      // Update tournament status to in_progress
      await supabase
        .from('tournaments')
        .update({ status: 'in_progress' })
        .eq('id', tournamentId);

      // Send push notification to all tournament members
      showPushNotification(
        'Tournament Started! 🎾',
        `${tournament?.name} has started! ${generatedMatches.length} matches have been generated. Good luck!`,
        tournamentId
      );
    }

    setIsProcessing(false);
  };


  const updateTeamStats = async (updatedMatches: Match[]) => {
    // Pass current 'teams' state to ensure all teams are included in calculation
    const stats = calculateTeamStats(updatedMatches, teams);

    // Using UPSERT might be better if supported, but for now sequential update is fine 
    // as long as we catch errors and don't block UI too much.
    // Ideally we should use a single batch update if Supabase supports it well for different rows, 
    // but iteration is acceptable for small team counts.
    const updates = stats.map(team =>
      supabase
        .from('teams')
        .update({
          points: team.points,
          wins: team.wins,
          matches_played: team.matchesPlayed,
          lead_points: team.leadPoints
        })
        .eq('id', team.id)
    );

    await Promise.all(updates);


    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (teamsData) {
      // Transform database column names to camelCase
      const transformedTeams = teamsData.map(team => ({
        ...team,
        leadPoints: team.lead_points ?? 0,
        matchesPlayed: team.matches_played ?? 0,
        groupId: team.group_id // Ensure groupId is mapped
      }));
      setTeams(transformedTeams);
    }
  };

  const handleSubmitScores = async (matchId: string, scores: [number, number]) => {
    if (!tournamentId) return;

    // Allow any logged-in user to submit scores (collaborative scoring)
    const match = matches.find(m => m.id === matchId) || finalMatch;
    if (!match) return;

    const [score1, score2] = scores;
    const winner = score1 > score2 ? match.teams[0] : match.teams[1];
    const pointDifference = Math.abs(score1 - score2);

    await supabase
      .from('matches')
      .update({
        team1_score: score1,
        team2_score: score2,
        winner_id: winner?.id,
        is_completed: true,
        point_difference: pointDifference
      })
      .eq('id', matchId);

    // Send notifications to players in both teams
    const team1 = match.teams[0];
    const team2 = match.teams[1];
    if (team1 && team2) {
      const winnerTeam = score1 > score2 ? team1 : team2;
      const loserTeam = score1 > score2 ? team2 : team1;
      const winnerScore = Math.max(score1, score2);
      const loserScore = Math.min(score1, score2);

      // Send push notification to all tournament members
      showPushNotification(
        'Match Completed! 🏸',
        `${winnerTeam.name} defeated ${loserTeam.name} (${winnerScore}-${loserScore})`,
        tournamentId
      );
    }

    if (match.round === 'final') {
      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);

      // Send push notification to all tournament members
      const winnerTeam = score1 > score2 ? team1 : team2;
      if (winnerTeam) {
        showPushNotification(
          'Tournament Completed! 🏆',
          `${winnerTeam.name} is the champion!`,
          tournamentId
        );
      }
    }

    if (match.round === 'regular' || match.round === 'semi-final') {
      const updatedMatches = matches.map(m =>
        m.id === matchId
          ? {
            ...m,
            scores: scores,
            isCompleted: true,
            winner: winner?.id,
            pointDifference
          }
          : m
      );
      setMatches(updatedMatches);

      await updateTeamStats(updatedMatches);

      const allRegularMatchesCompleted = updatedMatches.every(m => m.isCompleted);

      // Only auto-generate final for non-group structures
      // Groups structure requires manual generation of semi-finals first
      if (allRegularMatchesCompleted && !finalMatch && tournament.structure !== 'groups') {
        const { data: freshTeamsData } = await supabase
          .from('teams')
          .select('*')
          .eq('tournament_id', tournamentId);

        if (freshTeamsData) {
          // Transform database column names to camelCase
          const transformedTeams = freshTeamsData.map(team => ({
            ...team,
            leadPoints: team.lead_points ?? 0,
            matchesPlayed: team.matches_played ?? 0
          }));

          const topTeams = getTopTeams(transformedTeams, 2);
          const newFinalMatch = generateFinalMatch(topTeams);

          const { data: createdFinalMatch } = await supabase
            .from('matches')
            .insert({
              tournament_id: tournamentId,
              team1_id: newFinalMatch.teams[0]?.id,
              team2_id: newFinalMatch.teams[1]?.id,
              match_number: 1,
              round: 'final',
              is_completed: false
            })
            .select(`
            *,
            team1:teams!matches_team1_id_fkey(*),
            team2:teams!matches_team2_id_fkey(*)
          `)
            .single();

          if (createdFinalMatch) {
            const formattedFinalMatch = {
              ...createdFinalMatch,
              teams: [createdFinalMatch.team1, createdFinalMatch.team2],
              scores: [createdFinalMatch.team1_score, createdFinalMatch.team2_score],
              isCompleted: createdFinalMatch.is_completed,
              winner: createdFinalMatch.winner_id,
              pointDifference: createdFinalMatch.point_difference,
              matchNumber: createdFinalMatch.match_number,
              round: createdFinalMatch.round
            };
            setFinalMatch(formattedFinalMatch);

            // Send push notification to all tournament members
            const team1Name = createdFinalMatch.team1?.name || 'Team 1';
            const team2Name = createdFinalMatch.team2?.name || 'Team 2';

            showPushNotification(
              'Finals Ready! 🏆',
              `${team1Name} vs ${team2Name} - The championship match is here!`,
              tournamentId
            );
          }
        }
      }
    } else if (match.round === 'final') {
      setFinalTeam(winner || null);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournamentId || (!isCreator && !isAdmin)) return;

    try {
      await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      navigate('/');
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  };



  const handleBalanceMatches = async () => {
    if (!tournamentId || (!isCreator && !isAdmin)) return;

    try {
      setIsBalancing(true);

      // Get the current highest match number to continue numbering
      const lastMatchNum = matches.reduce((max, m) => Math.max(max, m.matchNumber ?? 0), 0);

      const extraMatches = generateBalancedGroupMatches(matches, lastMatchNum + 1);

      if (extraMatches.length === 0) return;

      const { data: newMatches } = await supabase
        .from('matches')
        .insert(
          extraMatches.map(m => ({
            tournament_id: tournamentId,
            team1_id: m.teams[0]?.id,
            team2_id: m.teams[1]?.id,
            match_number: m.matchNumber,
            round: 'regular',
            group_id: m.groupId ?? null,
          }))
        )
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*)
        `);

      if (newMatches) {
        const formatted = newMatches.map(match => ({
          ...match,
          teams: [match.team1, match.team2],
          scores: [match.team1_score, match.team2_score],
          isCompleted: match.is_completed,
          winner: match.winner_id,
          pointDifference: match.point_difference,
          matchNumber: match.match_number,
          round: match.round,
          groupId: match.group_id,
        }));
        setMatches(prev => [...prev, ...formatted]);
      }
    } catch (error) {
      console.error('Error balancing matches:', error);
      alert(`Failed to balance matches: ${(error as Error).message}`);
    } finally {
      setIsBalancing(false);
    }
  };

  const handleGenerateFinalMatch = async () => {
    if (!tournamentId || (!isCreator && !isAdmin)) return;

    try {
      setIsProcessing(true);

      // Fetch fresh match data to check progress
      const { data: currentMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId);

      // Fetch fresh team data with transformed columns
      const { data: freshTeamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (freshTeamsData && freshTeamsData.length >= 2) {
        // Transform database column names to camelCase
        const transformedTeams = freshTeamsData.map(team => ({
          ...team,
          leadPoints: team.lead_points ?? 0,
          matchesPlayed: team.matches_played ?? 0,
          groupId: team.group_id
        }));

        if (tournament.structure === 'groups') {
          // Check if semi-finals exist
          const semiFinals = currentMatches?.filter(m => m.round === 'semi-final') || [];

          if (semiFinals.length === 0) {
            // Generate Semi-Finals
            const groupA = sortTeamsByStats(transformedTeams.filter(t => t.groupId === 'A'));
            const groupB = sortTeamsByStats(transformedTeams.filter(t => t.groupId === 'B'));

            console.log('Group A Teams:', groupA.length, groupA);
            console.log('Group B Teams:', groupB.length, groupB);

            if (groupA.length < 2 || groupB.length < 2) {
              alert('Need at least 2 teams in each group to generate semi-finals.');
              return;
            }

            // Get last match number to continue numbering
            const lastMatchNum = Math.max(...(currentMatches?.map(m => m.match_number) || [0]));
            const newSemiFinals = generateCrossedSemiFinals(groupA, groupB, lastMatchNum + 1);

            const { error } = await supabase
              .from('matches')
              .insert(newSemiFinals.map(m => ({
                tournament_id: tournamentId,
                team1_id: m.teams[0]?.id,
                team2_id: m.teams[1]?.id,
                match_number: m.matchNumber,
                round: 'semi-final',
                is_completed: false,
                group_id: null
              })));

            if (error) throw error;

            showPushNotification('Semi-Finals Created! ⚔️', 'Knockout stage begins!', tournamentId);
            loadTournament(); // Reload to show new matches

          } else {
            // Check if semi-finals are completed
            const allSemisCompleted = semiFinals.every(m => m.is_completed && m.winner_id);
            if (!allSemisCompleted) {
              alert('Please complete all semi-final matches first.');
              return;
            }

            // Generate Final from Semi-Final winners
            const winners = semiFinals
              .sort((a, b) => a.match_number - b.match_number)
              .map(m => transformedTeams.find(t => t.id === m.winner_id))
              .filter(t => t !== undefined) as Team[];

            if (winners.length !== 2) {
              alert('Error determining semi-final winners.');
              return;
            }

            generateAndSaveFinal(winners, Math.max(...(currentMatches?.map(m => m.match_number) || [0])) + 1);
          }
        } else {
          // Default Round Robin / Knockout Final generation (Top 2 teams)
          const topTeams = getTopTeams(transformedTeams, 2);
          generateAndSaveFinal(topTeams, 1); // 1 is placeholder if no previous matches, but usually round robin has matches
        }
      }
    } catch (error) {
      console.error('Error generating next stage:', error);
      alert(`Failed to generate next stage: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAndSaveFinal = async (finalists: Team[], matchNum: number) => {
    const newFinalMatch = generateFinalMatch(finalists);
    // @ts-ignore
    newFinalMatch.matchNumber = matchNum;

    const { data: createdFinalMatch, error } = await supabase
      .from('matches')
      .insert({
        tournament_id: tournamentId,
        team1_id: newFinalMatch.teams[0]?.id,
        team2_id: newFinalMatch.teams[1]?.id,
        match_number: matchNum,
        round: 'final',
        is_completed: false
      })
      .select(`
      *,
      team1:teams!matches_team1_id_fkey(*),
      team2:teams!matches_team2_id_fkey(*)
    `)
      .single();

    if (createdFinalMatch) {
      const formattedFinalMatch = {
        ...createdFinalMatch,
        teams: [createdFinalMatch.team1, createdFinalMatch.team2],
        scores: [createdFinalMatch.team1_score, createdFinalMatch.team2_score],
        isCompleted: createdFinalMatch.is_completed,
        winner: createdFinalMatch.winner_id,
        pointDifference: createdFinalMatch.point_difference,
        matchNumber: createdFinalMatch.match_number,
        round: createdFinalMatch.round,
        groupId: createdFinalMatch.group_id,
        nextMatchId: createdFinalMatch.next_match_id
      };

      setFinalMatch(formattedFinalMatch);

      showPushNotification(
        'Final Match Created! 🏆',
        `${finalists[0]?.name} vs ${finalists[1]?.name}`,
        tournamentId
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="text-center max-w-md bg-white rounded-xl shadow-lg p-8">
          <Trophy className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Tournament</h2>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoadError(null);
              loadTournament();
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  const isCompleted = tournament.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back to Tournaments
              </button>
              <button
                onClick={() => navigate('/stats')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition shadow-sm text-sm"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Stats</span>
              </button>
            </div>
            <div className="flex flex-col items-center justify-center flex-1">
              <Trophy className="w-12 h-12 text-indigo-600 mb-1" />
              {/* @ts-ignore */}
              {tournament.type && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {/* @ts-ignore */}
                  {tournament.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-right">
              <UserDropdown displayName={displayName} />
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/stats')}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition"
                  title="View Stats"
                >
                  <TrendingUp className="w-6 h-6" />
                </button>
                {/* @ts-ignore */}
                {tournament.type && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {/* @ts-ignore */}
                    {tournament.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                )}
                <UserDropdown displayName={displayName} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-800 mb-3">{tournament.name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 xs:gap-4 text-sm xs:text-base text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 xs:w-5 xs:h-5" />
              <span>{tournament.venue}</span>
            </div>
            <span className="hidden xs:inline">•</span>
            <span className="font-medium">Status: {tournament.status}</span>
            {(isCreator || isAdmin) && (
              <>
                <span className="hidden xs:inline">•</span>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-1 xs:gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 xs:w-5 xs:h-5" />
                  <span className="text-sm xs:text-base">Delete</span>
                </button>
              </>
            )}
          </div>
        </header>

        {isCompleted && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowSummary(s => !s)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-sm shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {showSummary ? 'Hide Summary' : 'Show Summary'}
            </button>
          </div>
        )}

        {isCompleted && showSummary && (
          <FinalMatchCard
            finalMatch={finalMatch}
            finalTeam={finalTeam}
            matches={matches}
            teams={teams}
            tournament={tournament}
            teamMembers={teamMembers}
          />
        )}

        <div>
          <div className="grid lg:grid-cols-[350px,1fr] gap-4 xs:gap-6 lg:gap-8">
            <div className="space-y-4 xs:space-y-6">
              {matches.length === 0 && (isCreator || isAdmin) && (
                <div className="bg-white rounded-xl shadow-lg p-4 xs:p-6">
                  <div className="flex items-center gap-2 mb-4 xs:mb-6">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg xs:text-xl font-semibold">Teams</h2>
                  </div>

                  <TeamInput
                    onAddTeam={handleAddTeam}
                    // @ts-ignore
                    maxMembers={tournament.type?.includes('single') ? 1 : tournament.type?.includes('double') ? 2 : undefined}
                    structure={tournament.structure}
                    usedPlayerIds={Object.values(teamMembers).flat().map(u => u.id)}
                    genderFilter={
                      // @ts-ignore
                      tournament.type?.startsWith('men-') ? 'male'
                        // @ts-ignore
                        : tournament.type?.startsWith('women-') ? 'female'
                          : null
                    }
                  />

                  <div className="mt-4 xs:mt-6 space-y-2 xs:space-y-3">
                    {teams.map(team => (
                      <div key={team.id} className="flex items-center justify-between p-2.5 xs:p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="min-w-0 flex-1 pr-2">
                          <h3 className="font-medium text-gray-800 text-sm xs:text-base truncate">{team.name}</h3>
                          <p className="text-xs xs:text-sm text-gray-500 truncate">
                            {teamMembers[team.id]?.map(user => user.full_name).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* @ts-ignore */}
                          {tournament.structure === 'groups' && (
                            <div className="flex bg-gray-200 rounded-lg p-1">
                              <button
                                onClick={() => handleUpdateTeamGroup(team.id, 'A')}
                                className={`px-2 py-1 text-xs font-bold rounded ${team.groupId === 'A'
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-300'
                                  }`}
                              >
                                A
                              </button>
                              <button
                                onClick={() => handleUpdateTeamGroup(team.id, 'B')}
                                className={`px-2 py-1 text-xs font-bold rounded ${team.groupId === 'B'
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-300'
                                  }`}
                              >
                                B
                              </button>
                            </div>
                          )}
                          <button onClick={() => handleRemoveTeam(team.id)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0">
                            <Target className="w-4 h-4 xs:w-5 xs:h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerateMatches}
                    disabled={teams.length < 2 || isProcessing || matches.length > 0}
                    className={`mt-4 xs:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition text-sm xs:text-base ${teams.length < 2 || matches.length > 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      'Generate Matches'
                    )}
                  </button>
                </div>
              )}

              {matches.length > 0 && (
                tournament.structure === 'groups' ? (
                  <>
                    <TeamStats
                      teams={teams.filter(t => t.groupId === 'A')}
                      tournamentStatus={tournament.status}
                      tournamentId={tournament.id}
                      title="Group A Standings"
                    />
                    <TeamStats
                      teams={teams.filter(t => t.groupId === 'B')}
                      tournamentStatus={tournament.status}
                      tournamentId={tournament.id}
                      title="Group B Standings"
                    />
                  </>
                ) : (
                  <TeamStats
                    teams={teams}
                    tournamentStatus={tournament.status}
                    tournamentId={tournament.id}
                  />
                )
              )}
            </div>

            <div className="space-y-4 xs:space-y-6 lg:space-y-8">
              {/* Balance Matches button — shown when groups are imbalanced and no semi-finals yet */}
              {matches.length > 0
                && tournament.structure === 'groups'
                && !matches.some(m => m.round === 'semi-final')
                && !finalMatch
                && groupsAreImbalanced(matches)
                && !matches.some(m => m.isCompleted)  // only before any match is played
                && (isCreator || isAdmin) && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-lg p-4 xs:p-6 mb-4">
                    <div className="flex items-center gap-2 xs:gap-3 mb-3">
                      <span className="text-2xl">⚖️</span>
                      <div>
                        <h3 className="text-base xs:text-lg font-bold text-blue-900">Groups are Unbalanced</h3>
                        <p className="text-blue-700 text-xs xs:text-sm">One group has fewer matches. Click to double that group's matches so both groups have equal play time.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleBalanceMatches}
                      disabled={isBalancing}
                      className="w-full flex items-center justify-center gap-2 px-4 xs:px-6 py-2.5 xs:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm xs:text-base"
                    >
                      {isBalancing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                          <span>Balancing...</span>
                        </>
                      ) : (
                        <>
                          <span>⚖️</span>
                          <span>Balance Group Matches</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

              {matches.length > 0 && !finalMatch && matches.every(m => m.isCompleted) && (isCreator || isAdmin) && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl shadow-lg p-4 xs:p-6">
                  <div className="flex items-center gap-2 xs:gap-3 mb-4">
                    <Trophy className="w-6 h-6 xs:w-8 xs:h-8 text-amber-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg xs:text-xl font-bold text-amber-900">All Matches Complete!</h3>
                      <p className="text-amber-700 text-xs xs:text-sm">Ready to generate the final match</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateFinalMatch}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-4 xs:px-6 py-2.5 xs:py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm xs:text-base"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="w-5 h-5" />
                        <span>
                          {tournament.structure === 'groups' && !matches.some(m => m.round === 'semi-final')
                            ? 'Generate Semi-Finals'
                            : 'Generate Final Match'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {tournament.structure === 'groups' ? (
                <>
                  {/* Show Final Match if exists, first */}
                  {finalMatch && (
                    <div className="mb-8 border-b pb-8">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 px-2 border-l-4 border-yellow-500">
                        Championship
                      </h3>
                      <Bracket
                        matches={[]}
                        finalMatch={{
                          ...finalMatch,
                          tournamentStatus: tournament.status
                        }}
                        onSubmitScores={handleSubmitScores}
                        canEdit={true}
                      />
                    </div>
                  )}

                  {/* Show Semi-Finals if they exist, second */}
                  {matches.some(m => m.round === 'semi-final') && (
                    <div className="mb-8 border-b pb-8">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 px-2 border-l-4 border-purple-500">
                        Semi-Finals
                      </h3>
                      <Bracket
                        matches={matches
                          .filter(m => m.round === 'semi-final')
                          .map(match => ({
                            ...match,
                            tournamentStatus: tournament.status
                          }))}
                        finalMatch={null}
                        onSubmitScores={handleSubmitScores}
                        canEdit={true}
                        title=""
                      />
                    </div>
                  )}

                  {['A', 'B'].map(group => (
                    <div key={group} className="mb-8">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 px-2 border-l-4 border-indigo-500">
                        Group {group} Matches
                      </h3>
                      <Bracket
                        matches={matches
                          .filter(m => m.groupId === group)
                          .map(match => ({
                            ...match,
                            tournamentStatus: tournament.status
                          }))}
                        finalMatch={null}
                        onSubmitScores={handleSubmitScores}
                        canEdit={true}
                        title=""
                      />
                    </div>
                  ))}
                </>
              ) : (
                <Bracket
                  matches={matches.map(match => ({
                    ...match,
                    tournamentStatus: tournament.status
                  }))}
                  finalMatch={finalMatch ? {
                    ...finalMatch,
                    tournamentStatus: tournament.status
                  } : null}
                  onSubmitScores={handleSubmitScores}
                  canEdit={true}
                />
              )}
            </div>
          </div>
        </div>

        <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
          <DialogTitle>Delete Tournament</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this tournament? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteDialog(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDeleteTournament} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}

export default TournamentPage;