export interface Team {
  id: string;
  name: string;
  members: string[];
  points: number;
  wins: number;
  matchesPlayed: number;
  leadPoints: number;
  groupId?: string;
}

export type TournamentType =
  | 'men-single'
  | 'women-single'
  | 'men-double'
  | 'women-double'
  | 'mixed-double'
  | 'mixed-single';

export type TournamentStructure = 'round-robin' | 'knockout' | 'groups';

export interface Match {
  id: string;
  teams: [Team | null, Team | null];
  scores: [number | null, number | null];
  isCompleted: boolean;
  round: 'regular' | 'final' | 'quarter-final' | 'semi-final';
  matchNumber: number;
  pointDifference?: number;
  winner?: string;
  tournamentStatus?: string;
  groupId?: string;
  nextMatchId?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  created_at: string;
  gender?: 'male' | 'female' | null;
}