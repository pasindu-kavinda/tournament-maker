import generatePDF, { Options } from "react-to-pdf";
import { PDF } from "./PDF";
import { Trophy, Download, MapPin, Calendar, Users, Medal, User } from "lucide-react";

const FinalMatchCard = ({ finalMatch, finalTeam, matches, teams, tournament, teamMembers = {} }: any) => {
    const isGroups = tournament?.structure === 'groups';

    const formatDate = (d: Date) =>
        new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const formatFilename = (d: Date) =>
        new Date(d).toLocaleDateString().replace(/\//g, '_');
    const formatType = (type: string) =>
        type?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) ?? '';

    const options: Options = {
        filename: `Tournament_Summary_${formatFilename(new Date())}.pdf`,
        page: { margin: 20 }
    };
    const getTargetElement = () => document.getElementById("pdf-print-area");
    const downloadPdf = () => generatePDF(getTargetElement, options);

    // ---- data ----
    const finalScore = finalMatch
        ? `${finalMatch.scores?.[0] ?? '—'} – ${finalMatch.scores?.[1] ?? '—'}`
        : null;

    const groupMatches = (groupId: string) =>
        matches.filter((m: any) => m.groupId === groupId && m.round === 'regular');
    const semiMatches = matches.filter((m: any) => m.round === 'semi-final');
    const groupStandings = (groupId: string) =>
        [...teams.filter((t: any) => t.groupId === groupId)].sort((a: any, b: any) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.leadPoints !== a.leadPoints) return b.leadPoints - a.leadPoints;
            if (b.points !== a.points) return b.points - a.points;
            return (a.matchesPlayed ?? 0) - (b.matchesPlayed ?? 0);
        });
    const standingsSorted = !isGroups
        ? [...teams].sort((a: any, b: any) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.leadPoints !== a.leadPoints) return b.leadPoints - a.leadPoints;
            if (b.points !== a.points) return b.points - a.points;
            return (a.matchesPlayed ?? 0) - (b.matchesPlayed ?? 0);
        })
        : [];
    const regularMatches = isGroups
        ? matches.filter((m: any) => m.round === 'regular')
        : matches.filter((m: any) => m.round === 'regular');

    // ---- player helper ----
    const players = (teamId: string): string[] =>
        (teamMembers[teamId] ?? []).map((p: any) => p.full_name);

    // ---- sub-components ----

    /** Compact player name list displayed under a team name */
    const PlayerNames = ({ teamId, className = '' }: { teamId: string; className?: string }) => {
        const ps = players(teamId);
        if (!ps.length) return null;
        return (
            <div className={`flex flex-wrap gap-x-2 ${className}`}>
                {ps.map((name, i) => (
                    <span key={i} className="flex items-center gap-0.5 text-xs text-gray-400 leading-tight">
                        <User className="w-2.5 h-2.5 flex-shrink-0" />
                        {name}
                    </span>
                ))}
            </div>
        );
    };

    /** Single match result row — shows team names + scores + player names below each team */
    const MatchRow = ({ match, i }: { match: any; i: number }) => {
        const winner = match.teams?.find((t: any) => t.id === match.winner);
        const t0 = match.teams?.[0];
        const t1 = match.teams?.[1];
        const isT0Win = winner?.id === t0?.id;
        const isT1Win = winner?.id === t1?.id;
        return (
            <div className="flex items-stretch gap-2 py-2 px-3 bg-gray-50 rounded-xl text-sm">
                {/* match number */}
                <span className="text-gray-400 font-mono text-xs w-6 flex-shrink-0 pt-0.5">
                    {match.matchNumber ?? i + 1}
                </span>

                {/* team 1 */}
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate leading-tight ${isT0Win ? 'text-green-700' : 'text-gray-600'}`}>
                        {t0?.name}
                    </p>
                    <PlayerNames teamId={t0?.id} />
                </div>

                {/* score */}
                <div className="flex-shrink-0 flex items-center">
                    <span className="font-mono font-bold text-xs bg-gray-200 px-2 py-1 rounded text-gray-800">
                        {match.scores?.[0]} – {match.scores?.[1]}
                    </span>
                </div>

                {/* team 2 */}
                <div className="flex-1 min-w-0 text-right">
                    <p className={`font-semibold truncate leading-tight ${isT1Win ? 'text-green-700' : 'text-gray-600'}`}>
                        {t1?.name}
                    </p>
                    <div className="flex flex-wrap justify-end gap-x-2">
                        {players(t1?.id).map((name, i) => (
                            <span key={i} className="flex items-center gap-0.5 text-xs text-gray-400 leading-tight">
                                <User className="w-2.5 h-2.5 flex-shrink-0" />
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    /** Standings table with player names under each team name */
    const StandingsTable = ({ rows }: { rows: any[] }) => (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm min-w-[320px]">
                <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs uppercase">
                        <th className="text-left px-3 py-2 font-semibold">#</th>
                        <th className="text-left px-3 py-2 font-semibold">Team / Players</th>
                        <th className="px-3 py-2 font-semibold text-center">W</th>
                        <th className="px-3 py-2 font-semibold text-center">MP</th>
                        <th className="px-3 py-2 font-semibold text-center">Pts</th>
                        <th className="px-3 py-2 font-semibold text-center hidden sm:table-cell">+/-</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((team: any, idx: number) => (
                        <tr key={team.id} className={`align-top ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                            <td className="px-3 py-2.5">
                                {idx === 0 && <Medal className="w-4 h-4 text-amber-500" />}
                                {idx === 1 && <Medal className="w-4 h-4 text-gray-400" />}
                                {idx > 1 && <span className="text-gray-400 text-xs font-mono">{idx + 1}</span>}
                            </td>
                            <td className="px-3 py-2.5">
                                <p className="font-semibold text-gray-800 leading-tight">{team.name}</p>
                                <PlayerNames teamId={team.id} className="mt-0.5" />
                            </td>
                            <td className="px-3 py-2.5 text-center text-gray-700 font-medium">{team.wins ?? 0}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600">{team.matchesPlayed ?? team.matches_played ?? 0}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-indigo-700">{team.points ?? 0}</td>
                            <td className="px-3 py-2.5 text-center text-green-600 font-semibold hidden sm:table-cell">{team.leadPoints ?? team.lead_points ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const SectionHeader = ({ label, color = 'text-gray-400' }: { label: string; color?: string }) => (
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</h3>
    );

    return (
        <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-indigo-100">

                {/* ── Header ─────────────────────────────────── */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-4 text-white">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                                    {isGroups ? 'Group Stage' : 'Round Robin'} · Complete
                                </p>
                                {tournament?.type && (
                                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold border border-white/30">
                                        {formatType(tournament.type)}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold truncate">{tournament?.name}</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs sm:text-sm text-indigo-100">
                                {tournament?.venue && (
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tournament.venue}</span>
                                )}
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(new Date(tournament?.created_at))}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{teams?.length} teams</span>
                            </div>
                        </div>
                        <button
                            onClick={downloadPdf}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs sm:text-sm font-semibold border border-white/30 transition-colors flex-shrink-0"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">Download </span>PDF
                        </button>
                    </div>
                </div>

                {/* ── Champion ───────────────────────────────── */}
                {finalTeam && (
                    <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                        <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber-400/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Trophy className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-amber-700 text-xs font-bold uppercase tracking-wider">🏆 Champion</p>
                                <p className="text-lg sm:text-xl font-bold text-amber-900 truncate">{finalTeam.name}</p>
                                {players(finalTeam.id).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {players(finalTeam.id).map((name, i) => (
                                            <span key={i} className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                                                <User className="w-2.5 h-2.5" />{name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {finalScore && (
                                <div className="text-right flex-shrink-0">
                                    <p className="text-amber-600 text-xs font-semibold uppercase tracking-wider">Final</p>
                                    <p className="text-lg font-bold text-amber-900 font-mono">{finalScore}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Body ───────────────────────────────────── */}
                <div className="p-4 sm:p-6 space-y-6">

                    {/* ── GROUPS ─────────────────────────────── */}
                    {isGroups ? (
                        <>
                            {/* Group standings side by side on sm+, stacked on mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <SectionHeader label="Group A Standings" color="text-indigo-500" />
                                    <StandingsTable rows={groupStandings('A')} />
                                </div>
                                <div>
                                    <SectionHeader label="Group B Standings" color="text-purple-500" />
                                    <StandingsTable rows={groupStandings('B')} />
                                </div>
                            </div>

                            {groupMatches('A').length > 0 && (
                                <div>
                                    <SectionHeader label="Group A Matches" color="text-indigo-400" />
                                    <div className="space-y-1.5">
                                        {groupMatches('A').map((m: any, i: number) => <MatchRow key={m.id ?? i} match={m} i={i} />)}
                                    </div>
                                </div>
                            )}

                            {groupMatches('B').length > 0 && (
                                <div>
                                    <SectionHeader label="Group B Matches" color="text-purple-400" />
                                    <div className="space-y-1.5">
                                        {groupMatches('B').map((m: any, i: number) => <MatchRow key={m.id ?? i} match={m} i={i} />)}
                                    </div>
                                </div>
                            )}

                            {semiMatches.length > 0 && (
                                <div>
                                    <SectionHeader label="Semi-Finals" color="text-orange-500" />
                                    <div className="space-y-1.5">
                                        {semiMatches.map((m: any, i: number) => <MatchRow key={m.id ?? i} match={m} i={i} />)}
                                    </div>
                                </div>
                            )}

                            {finalMatch && (
                                <div>
                                    <SectionHeader label="Final" color="text-amber-500" />
                                    <div className="space-y-1.5"><MatchRow match={finalMatch} i={0} /></div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* ── ROUND ROBIN ─────────────────────────── */
                        <>
                            {standingsSorted.length > 0 && (
                                <div>
                                    <SectionHeader label="Final Standings" color="text-indigo-500" />
                                    <StandingsTable rows={standingsSorted} />
                                </div>
                            )}

                            {regularMatches.length > 0 && (
                                <div>
                                    <SectionHeader label="Match Results" color="text-gray-400" />
                                    <div className="space-y-1.5">
                                        {regularMatches.map((m: any, i: number) => <MatchRow key={m.id ?? i} match={m} i={i} />)}
                                    </div>
                                </div>
                            )}

                            {finalMatch && (
                                <div>
                                    <SectionHeader label="Final" color="text-amber-500" />
                                    <div className="space-y-1.5"><MatchRow match={finalMatch} i={0} /></div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Hidden PDF */}
            <div id="pdf-print-area" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <PDF
                    finalMatch={finalMatch}
                    finalTeam={finalTeam}
                    matches={matches}
                    teams={teams}
                    tournament={tournament}
                    teamMembers={teamMembers}
                />
            </div>
        </div>
    );
};

export default FinalMatchCard;