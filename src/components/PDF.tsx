import { UserProfile } from "@/types";

interface PDFProps {
  finalMatch?: any;
  finalTeam: any;
  matches: any;
  teams: any;
  tournament: any;
  teamMembers?: { [key: string]: UserProfile[] };
}

export const PDF = ({ finalMatch, finalTeam, matches, teams, tournament, teamMembers = {} }: PDFProps) => {
  const isGroups = tournament?.structure === 'groups';

  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const formatType = (type: string) =>
    type?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) ?? '';

  // ---- shared helpers ----
  const groupMatches = (groupId: string) =>
    matches.filter((m: any) => m.groupId === groupId && m.round === 'regular');

  const semiMatches = matches.filter((m: any) => m.round === 'semi-final');

  const groupStandings = (groupId: string) =>
    [...teams.filter((t: any) => t.groupId === groupId)].sort((a: any, b: any) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if ((b.leadPoints ?? b.lead_points ?? 0) !== (a.leadPoints ?? a.lead_points ?? 0)) return (b.leadPoints ?? b.lead_points ?? 0) - (a.leadPoints ?? a.lead_points ?? 0);
      if (b.points !== a.points) return b.points - a.points;
      return (a.matchesPlayed ?? a.matches_played ?? 0) - (b.matchesPlayed ?? b.matches_played ?? 0);
    });

  const standingsSorted = !isGroups
    ? [...teams].sort((a: any, b: any) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if ((b.leadPoints ?? b.lead_points ?? 0) !== (a.leadPoints ?? a.lead_points ?? 0)) return (b.leadPoints ?? b.lead_points ?? 0) - (a.leadPoints ?? a.lead_points ?? 0);
      if (b.points !== a.points) return b.points - a.points;
      return (a.matchesPlayed ?? a.matches_played ?? 0) - (b.matchesPlayed ?? b.matches_played ?? 0);
    })
    : [];

  const regularMatches = isGroups
    ? matches.filter((m: any) => m.round === 'regular')
    : matches.filter((m: any) => m.round === 'regular');

  // ---- sub-components ----
  const SectionTitle = ({ text }: { text: string }) => (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#4338ca', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 8, marginTop: 16 }}>
      {text}
    </h3>
  );

  const StandingsTable = ({ rows, title }: { rows: any[]; title?: string }) => (
    <div style={{ marginBottom: 12 }}>
      {title && <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>{title}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: '#374151' }}>Team</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', color: '#374151' }}>W</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', color: '#374151' }}>MP</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', color: '#374151' }}>Pts</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', color: '#374151' }}>+/-</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((team: any, idx: number) => (
            <tr key={team.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', verticalAlign: 'top' }}>
              <td style={{ padding: '6px 8px', fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? '#d97706' : '#374151' }}>
                <div>{idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : `${idx + 1}. `}{team.name}</div>
                {(teamMembers[team.id] ?? []).map((m: UserProfile) => (
                  <div key={m.id} style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>· {m.full_name}</div>
                ))}
              </td>
              <td style={{ textAlign: 'center', padding: '6px 8px' }}>{team.wins ?? 0}</td>
              <td style={{ textAlign: 'center', padding: '6px 8px' }}>{team.matchesPlayed ?? team.matches_played ?? 0}</td>
              <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, color: '#4338ca' }}>{team.points ?? 0}</td>
              <td style={{ textAlign: 'center', padding: '6px 8px', color: '#16a34a' }}>{team.leadPoints ?? team.lead_points ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const MatchRows = ({ items, label }: { items: any[]; label?: string }) => (
    <div style={{ marginBottom: 12 }}>
      {label && <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>{label}</p>}
      {items.map((match: any, idx: number) => {
        const winner = match.teams?.find((t: any) => t.id === (match.winner ?? match.winner_id));
        const t0 = match.teams?.[0];
        const t1 = match.teams?.[1];
        const t0win = winner?.id === t0?.id;
        const t1win = winner?.id === t1?.id;
        const t0players = (teamMembers[t0?.id] ?? []);
        const t1players = (teamMembers[t1?.id] ?? []);
        return (
          <div key={match.id ?? idx} style={{ display: 'flex', alignItems: 'flex-start', padding: '5px 8px', background: idx % 2 === 0 ? '#f9fafb' : '#fff', borderRadius: 4, marginBottom: 3, fontSize: 12 }}>
            <span style={{ color: '#9ca3af', width: 24, flexShrink: 0, paddingTop: 1 }}>{match.matchNumber ?? idx + 1}</span>
            {/* Team 1 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: t0win ? 700 : 400, color: t0win ? '#15803d' : '#374151' }}>{t0?.name}</div>
              {t0players.map((p: UserProfile) => (
                <div key={p.id} style={{ fontSize: 10, color: '#9ca3af' }}>· {p.full_name}</div>
              ))}
            </div>
            {/* Score */}
            <span style={{ fontWeight: 700, color: '#1f2937', padding: '1px 8px', fontFamily: 'monospace', flexShrink: 0 }}>
              {match.scores?.[0]} – {match.scores?.[1]}
            </span>
            {/* Team 2 */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              <div style={{ fontWeight: t1win ? 700 : 400, color: t1win ? '#15803d' : '#374151' }}>{t1?.name}</div>
              {t1players.map((p: UserProfile) => (
                <div key={p.id} style={{ fontSize: 10, color: '#9ca3af' }}>· {p.full_name}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ padding: 24, background: '#fff', fontFamily: 'Arial, sans-serif', maxWidth: 700 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 8, padding: 16, color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#c7d2fe', marginBottom: 4 }}>
              {isGroups ? 'Group Stage' : 'Round Robin'} · Tournament Summary
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0' }}>{tournament?.name}</h1>
            <p style={{ fontSize: 12, color: '#c7d2fe', margin: 0 }}>
              {tournament?.venue && `📍 ${tournament.venue}  ·  `}📅 {formatDate(new Date(tournament?.created_at))}  ·  👥 {teams?.length} teams
            </p>
          </div>
          {tournament?.type && (
            <span style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
              {formatType(tournament.type)}
            </span>
          )}
        </div>
      </div>

      {/* Champion */}
      {finalTeam && (
        <div style={{ background: '#fefce8', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', marginBottom: 2 }}>Champion</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#92400e' }}>{finalTeam.name}</p>
          </div>
          {finalMatch && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: '#b45309', fontWeight: 600 }}>Final Score</p>
              <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#92400e' }}>
                {finalMatch.scores?.[0]} – {finalMatch.scores?.[1]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Teams roster */}
      <SectionTitle text="Teams & Players" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {teams.map((team: any) => (
          <div key={team.id} style={{ background: '#f9fafb', borderRadius: 6, padding: '8px 10px', border: '1px solid #e5e7eb' }}>
            <p style={{ fontWeight: 700, color: '#4338ca', fontSize: 12, marginBottom: 4 }}>{team.name}</p>
            {(teamMembers[team.id] ?? []).length > 0
              ? (teamMembers[team.id] ?? []).map((m: UserProfile) => (
                <p key={m.id} style={{ fontSize: 11, color: '#6b7280', marginBottom: 1 }}>• {m.full_name}</p>
              ))
              : <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>No players</p>
            }
          </div>
        ))}
      </div>

      {/* ---- GROUPS structure ---- */}
      {isGroups ? (
        <>
          <SectionTitle text="Group Standings" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StandingsTable rows={groupStandings('A')} title="Group A" />
            <StandingsTable rows={groupStandings('B')} title="Group B" />
          </div>

          {groupMatches('A').length > 0 && (
            <><SectionTitle text="Group A Matches" /><MatchRows items={groupMatches('A')} /></>
          )}
          {groupMatches('B').length > 0 && (
            <><SectionTitle text="Group B Matches" /><MatchRows items={groupMatches('B')} /></>
          )}
          {semiMatches.length > 0 && (
            <><SectionTitle text="Semi-Finals" /><MatchRows items={semiMatches} /></>
          )}
          {finalMatch && (
            <><SectionTitle text="Final" /><MatchRows items={[finalMatch]} /></>
          )}
        </>
      ) : (
        /* ---- ROUND ROBIN structure ---- */
        <>
          {standingsSorted.length > 0 && (
            <>
              <SectionTitle text="Final Standings" />
              <StandingsTable rows={standingsSorted} />
            </>
          )}
          {regularMatches.length > 0 && (
            <>
              <SectionTitle text="Match Results" />
              <MatchRows items={regularMatches} />
            </>
          )}
          {finalMatch && (
            <><SectionTitle text="Final" /><MatchRows items={[finalMatch]} /></>
          )}
        </>
      )}

      {/* Footer */}
      <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'right', marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
        Generated on {formatDate(new Date())}
      </p>
    </div>
  );
};