import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Team, UserProfile } from '../types';
import { Trophy, Target, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TeamStatsProps {
  teams: Team[];
  tournamentStatus?: string;
  tournamentId?: string;
}

function TeamStats({ teams, tournamentStatus = 'pending', tournamentId }: TeamStatsProps) {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<{ [key: string]: UserProfile[] }>({});
  const [loading, setLoading] = useState(true);
  const [realtimeTeams, setRealtimeTeams] = useState<Team[]>(teams);

  useEffect(() => {
    loadTeamMembers();

    if (tournamentStatus !== 'completed') {
      const teamsSubscription = supabase
        .channel('teams_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teams',
            filter: `tournament_id=eq.${tournamentId}`
          },
          async (_payload) => {
            const { data: updatedTeams } = await supabase
              .from('teams')
              .select('*')
              .eq('tournament_id', tournamentId)
              .order('created_at', { ascending: true });
            
            if (updatedTeams) {
              // Transform database column names to camelCase
              const transformedTeams = updatedTeams.map(team => ({
                ...team,
                leadPoints: team.lead_points ?? 0,
                matchesPlayed: team.matches_played ?? 0
              }));
              setRealtimeTeams(transformedTeams);
            }
          }
        )
        .subscribe();

      return () => {
        teamsSubscription.unsubscribe();
      };
    }
  }, [tournamentStatus]);

  useEffect(() => {
    setRealtimeTeams(teams);
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
    setLoading(false);
  };

  const sortedTeams = [...realtimeTeams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.leadPoints !== a.leadPoints) return b.leadPoints - a.leadPoints;
    return b.points - a.points;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 xs:p-6">
        <div className="flex items-center gap-2 mb-4 xs:mb-6">
          <Trophy className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg xs:text-xl font-semibold">Team Rankings</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 xs:p-6">
      <div className="flex items-center gap-2 mb-4 xs:mb-6">
        <Trophy className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg xs:text-xl font-semibold">Team Rankings</h2>
      </div>

      <div className="space-y-3 xs:space-y-4">
        {sortedTeams.map((team, index) => (
          <div 
            key={team.id}
            className={`p-3 xs:p-4 rounded-lg border ${
              index < 2 ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {index < 2 && <Award className="w-4 h-4 xs:w-5 xs:h-5 text-indigo-600 flex-shrink-0" />}
                <h3 className="font-medium text-gray-800 text-sm xs:text-base truncate">{team.name}</h3>
              </div>
              <div className="flex items-center gap-2 xs:gap-4 text-xs xs:text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 xs:w-4 xs:h-4 text-gray-500" />
                  <span className="font-medium text-gray-600">
                    {team.wins} wins
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 xs:w-4 xs:h-4 text-indigo-500" />
                  <span className="font-medium text-indigo-600">
                    +{team.leadPoints}
                  </span>
                </div>
                <div className="text-gray-500">
                  {team.points} pts
                </div>
              </div>
            </div>
            <div className="text-xs xs:text-sm text-gray-500 flex flex-wrap gap-1">
              <span>Players:</span>
              {teamMembers[team.id]?.map((user, idx) => (
                <React.Fragment key={user.id}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${user.id}`);
                    }}
                    className="hover:text-indigo-600 hover:underline cursor-pointer"
                  >
                    {user.full_name}
                  </button>
                  {idx < teamMembers[team.id].length - 1 && <span>,</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamStats;