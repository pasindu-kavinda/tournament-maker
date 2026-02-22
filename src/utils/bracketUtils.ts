import { Team, Match, TournamentStructure } from '../types';

export function generateMatches(teams: Team[], structure: TournamentStructure = 'round-robin'): Match[] {
  if (structure === 'groups') {
    return generateGroupMatches(teams);
  } else if (structure === 'knockout') {
    return generateKnockoutMatches(teams);
  } else {
    return generateRoundRobinMatches(teams); // Default and fallback
  }
}

function generateGroupMatches(teams: Team[]): Match[] {
  // Use the user-assigned groupId to split teams — never split by position
  const groupA = teams.filter(t => t.groupId === 'A');
  const groupB = teams.filter(t => t.groupId === 'B');

  // Each group gets its own independent 1-based match numbering.
  // No unique constraint on match_number in the DB, so duplicates across groups are safe.
  const generateForGroup = (groupTeams: Team[], groupId: string) => {
    return generateRoundRobinMatches(groupTeams).map(m => ({ ...m, groupId }));
    // matchNumber from generateRoundRobinMatches is already 1-based per group
  };

  const matchesA = generateForGroup(groupA, 'A');
  const matchesB = generateForGroup(groupB, 'B');

  return [...matchesA, ...matchesB];
}

function generateKnockoutMatches(teams: Team[]): Match[] {
  // Placeholder for now, will implement in next step
  return generateRoundRobinMatches(teams);
}

export function generateRoundRobinMatches(teams: Team[]): Match[] {
  const matches: Match[] = [];
  let matchCounter = 1;

  // Match generation for team sizes 5 and 6
  if (teams.length === 5) {
    const staticOrder = [
      [0, 1], [2, 3], [0, 4], [1, 3], [4, 2],
      [0, 3], [1, 4], [2, 0], [3, 4], [1, 2]
    ];

    staticOrder.forEach(([teamAIndex, teamBIndex]) => {
      matches.push({
        id: crypto.randomUUID(),
        teams: [teams[teamAIndex], teams[teamBIndex]],
        scores: [null, null],
        isCompleted: false,
        round: 'regular',
        matchNumber: matchCounter++
      });
    });
  } else if (teams.length === 6) {
    const staticOrder = [
      [0, 5], [1, 2], [3, 4], [0, 2], [1, 5],
      [3, 0], [2, 4], [1, 3], [5, 4], [0, 1],
      [2, 5], [4, 1], [3, 2], [0, 4], [5, 3]
    ];

    staticOrder.forEach(([teamAIndex, teamBIndex]) => {
      matches.push({
        id: crypto.randomUUID(),
        teams: [teams[teamAIndex], teams[teamBIndex]],
        scores: [null, null],
        isCompleted: false,
        round: 'regular',
        matchNumber: matchCounter++
      });
    });
  } else {
    // Default round-robin logic for other team sizes
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: crypto.randomUUID(),
          teams: [teams[i], teams[j]],
          scores: [null, null],
          isCompleted: false,
          round: 'regular',
          matchNumber: matchCounter++
        });
      }
    }
  }

  return matches;
}

export function calculateTeamStats(matches: Match[], allTeams?: Team[]): Team[] {
  const teamStats = new Map<string, Team>();

  // Initialize from all teams if provided
  if (allTeams) {
    allTeams.forEach(team => {
      teamStats.set(team.id, {
        ...team,
        points: 0,
        wins: 0,
        matchesPlayed: 0,
        leadPoints: 0
      });
    });
  }

  // Initialize or update from matches
  matches.forEach(match => {
    match.teams.forEach(team => {
      if (team) {
        if (!teamStats.has(team.id)) {
          // Fallback initialization if team not in allTeams
          teamStats.set(team.id, {
            ...team,
            points: 0,
            wins: 0,
            matchesPlayed: 0,
            leadPoints: 0
          });
        }
      }
    });
  });

  // Calculate stats from completed matches
  matches.filter(m => m.isCompleted && m.round === 'regular').forEach(match => {
    const [teamA, teamB] = match.teams;
    const [scoreA, scoreB] = match.scores;

    if (teamA && teamB && scoreA !== null && scoreB !== null) {
      const statsA = teamStats.get(teamA.id)!;
      const statsB = teamStats.get(teamB.id)!;

      statsA.matchesPlayed++;
      statsB.matchesPlayed++;

      statsA.points += scoreA;
      statsB.points += scoreB;

      // Calculate point difference and update wins/leadPoints
      const pointDifference = Math.abs(scoreA - scoreB);
      if (scoreA > scoreB) {
        statsA.wins++;
        statsA.leadPoints += pointDifference;
        match.pointDifference = pointDifference;
        match.winner = teamA.id;
      } else if (scoreB > scoreA) {
        statsB.wins++;
        statsB.leadPoints += pointDifference;
        match.pointDifference = pointDifference;
        match.winner = teamB.id;
      }

      teamStats.set(teamA.id, statsA);
      teamStats.set(teamB.id, statsB);
    }
  });

  return Array.from(teamStats.values());
}

export function getTopTeams(teams: Team[], count: number = 2): Team[] {
  return [...teams].sort((a, b) => {
    // Sort primarily by wins
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    // If wins are equal, sort by lead points
    if (b.leadPoints !== a.leadPoints) {
      return b.leadPoints - a.leadPoints;
    }
    // If lead points are equal, sort by total points
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // If everything is equal, sort by matches played (fewer is better)
    return a.matchesPlayed - b.matchesPlayed;
  }).slice(0, count);
}

export function generateFinalMatch(topTeams: Team[]): Match {
  return {
    id: crypto.randomUUID(),
    teams: [topTeams[0] || null, topTeams[1] || null],
    scores: [null, null],
    isCompleted: false,
    round: 'final',
    matchNumber: 1
  };
}

export function sortTeamsByStats(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    // Sort primarily by wins
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    // If wins are equal, sort by lead points
    if (b.leadPoints !== a.leadPoints) {
      return b.leadPoints - a.leadPoints;
    }
    // If lead points are equal, sort by total points
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // If everything is equal, sort by matches played (fewer is better)
    return a.matchesPlayed - b.matchesPlayed;
  });
}

export function generateCrossedSemiFinals(groupATeams: Team[], groupBTeams: Team[], startMatchNum: number): Match[] {
  // Assumes teams are already sorted by rank (index 0 is 1st place)
  const a1 = groupATeams[0];
  const a2 = groupATeams[1];
  const b1 = groupBTeams[0];
  const b2 = groupBTeams[1];

  if (!a1 || !a2 || !b1 || !b2) return [];

  const match1: Match = {
    id: crypto.randomUUID(),
    teams: [a1, b2],
    scores: [null, null],
    isCompleted: false,
    round: 'semi-final',
    matchNumber: startMatchNum,
    groupId: undefined
  };

  const match2: Match = {
    id: crypto.randomUUID(),
    teams: [b1, a2],
    scores: [null, null],
    isCompleted: false,
    round: 'semi-final',
    matchNumber: startMatchNum + 1,
    groupId: undefined
  };

  return [match1, match2];
}

/**
 * Generates extra matches for smaller groups so every group has the same
 * number of regular matches. Each extra match is a rematch of an existing
 * pairing (teams swapped) so the second encounter is clearly distinct.
 *
 * Returns only the NEW matches that need to be inserted; existing matches
 * are not modified.
 */
export function generateBalancedGroupMatches(
  existingMatches: Match[],
  _startMatchNum: number  // kept for API compat, unused — we compute per-group instead
): Match[] {
  // Collect group IDs from regular matches only
  const regularMatches = existingMatches.filter(m => m.round === 'regular');

  // Build a map of groupId → matches
  const groupMatchMap = new Map<string, Match[]>();
  regularMatches.forEach(m => {
    const gid = m.groupId ?? '__none__';
    if (!groupMatchMap.has(gid)) groupMatchMap.set(gid, []);
    groupMatchMap.get(gid)!.push(m);
  });

  // Find the maximum match count across all groups
  let maxCount = 0;
  groupMatchMap.forEach(gMatches => {
    if (gMatches.length > maxCount) maxCount = gMatches.length;
  });

  const newMatches: Match[] = [];

  groupMatchMap.forEach((gMatches, groupId) => {
    if (gMatches.length < maxCount) {
      const needed = maxCount - gMatches.length;
      // Continue match numbering within this group (independent per-group numbering)
      const groupMaxNum = Math.max(...gMatches.map(m => m.matchNumber ?? 0));
      let localNum = groupMaxNum + 1;

      for (let i = 0; i < needed; i++) {
        const source = gMatches[i % gMatches.length];
        const [t1, t2] = source.teams;
        newMatches.push({
          id: crypto.randomUUID(),
          teams: [t2, t1], // reversed for rematch flavour
          scores: [null, null],
          isCompleted: false,
          round: 'regular',
          matchNumber: localNum++,
          groupId: groupId === '__none__' ? undefined : groupId,
        });
      }
    }
  });

  return newMatches;
}

/**
 * Returns true when at least two groups have different regular-match counts.
 */
export function groupsAreImbalanced(matches: Match[]): boolean {
  const regularMatches = matches.filter(m => m.round === 'regular');
  const countMap = new Map<string, number>();
  regularMatches.forEach(m => {
    const gid = m.groupId ?? '__none__';
    countMap.set(gid, (countMap.get(gid) ?? 0) + 1);
  });
  if (countMap.size < 2) return false;
  const counts = Array.from(countMap.values());
  return counts.some(c => c !== counts[0]);
}