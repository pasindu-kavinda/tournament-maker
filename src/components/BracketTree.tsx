import { Match, Team } from '../types';
import { Trophy, ArrowRight } from 'lucide-react';

interface BracketTreeProps {
    matches: Match[];
    finalMatch: Match | null;
    teams: Team[];
}

function BracketTree({ matches, finalMatch, teams }: BracketTreeProps) {
    // Group matches by teams to show progression
    const getTeamMatches = (teamId: string) => {
        return matches.filter(m =>
            m.teams.some(t => t?.id === teamId) && m.isCompleted
        );
    };

    const getTeamWins = (teamId: string) => {
        return matches.filter(m =>
            m.winner === teamId && m.isCompleted && m.round === 'regular'
        ).length;
    };

    // Sort teams by performance
    const sortedTeams = [...teams].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.leadPoints !== a.leadPoints) return b.leadPoints - a.leadPoints;
        return b.points - a.points;
    });

    const topTeams = sortedTeams.slice(0, 2);


    const getTeamColor = (team: Team) => {
        if (finalMatch?.winner === team.id) {
            return 'border-yellow-500 bg-yellow-50';
        }
        if (topTeams.some(t => t.id === team.id)) {
            return 'border-indigo-500 bg-indigo-50';
        }
        return 'border-gray-300 bg-white';
    };

    const getTeamRank = (team: Team) => {
        const index = sortedTeams.findIndex(t => t.id === team.id);
        return index + 1;
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-8 text-center">Tournament Bracket Visualization</h2>

            <div className="space-y-8">
                {/* Final Match Winner */}
                {finalMatch && finalMatch.isCompleted && finalMatch.winner && (
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Trophy className="w-8 h-8 text-yellow-500" />
                            <h3 className="text-xl font-bold text-gray-800">Champion</h3>
                        </div>
                        <div className="border-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 shadow-lg max-w-md w-full">
                            <div className="text-center">
                                <div className="text-3xl mb-2">🏆</div>
                                <h4 className="text-2xl font-bold text-gray-800 mb-2">
                                    {finalMatch.teams.find(t => t?.id === finalMatch.winner)?.name}
                                </h4>
                                <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                                    <span>🎯 {getTeamWins(finalMatch.winner)} Wins</span>
                                    <span>•</span>
                                    <span>📊 {teams.find(t => t.id === finalMatch.winner)?.points || 0} Points</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Final Match */}
                {finalMatch && (
                    <div className="flex flex-col items-center mb-8">
                        <h3 className="text-lg font-semibold mb-4 text-indigo-600">Finals</h3>
                        <div className="relative max-w-4xl w-full">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                                {/* Finalist 1 */}
                                <div className={`border-2 rounded-lg p-4 ${getTeamColor(finalMatch.teams[0]!)}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-gray-800">{finalMatch.teams[0]?.name}</div>
                                            <div className="text-sm text-gray-600">#{getTeamRank(finalMatch.teams[0]!)} seed</div>
                                        </div>
                                        {finalMatch.isCompleted && (
                                            <div className="text-2xl font-bold text-gray-800">
                                                {finalMatch.scores[0]}
                                            </div>
                                        )}
                                    </div>
                                    {finalMatch.winner === finalMatch.teams[0]?.id && (
                                        <div className="mt-2 text-xs font-medium text-yellow-600 flex items-center gap-1">
                                            <Trophy className="w-3 h-3" />
                                            Winner
                                        </div>
                                    )}
                                </div>

                                {/* VS */}
                                <div className="flex items-center justify-center">
                                    <div className="bg-gray-100 rounded-full p-3 text-gray-600 font-bold">VS</div>
                                </div>

                                {/* Finalist 2 */}
                                <div className={`border-2 rounded-lg p-4 ${getTeamColor(finalMatch.teams[1]!)}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-gray-800">{finalMatch.teams[1]?.name}</div>
                                            <div className="text-sm text-gray-600">#{getTeamRank(finalMatch.teams[1]!)} seed</div>
                                        </div>
                                        {finalMatch.isCompleted && (
                                            <div className="text-2xl font-bold text-gray-800">
                                                {finalMatch.scores[1]}
                                            </div>
                                        )}
                                    </div>
                                    {finalMatch.winner === finalMatch.teams[1]?.id && (
                                        <div className="mt-2 text-xs font-medium text-yellow-600 flex items-center gap-1">
                                            <Trophy className="w-3 h-3" />
                                            Winner
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Regular Season Rankings */}
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-center">Regular Season Standings</h3>
                    <div className="max-w-3xl mx-auto space-y-3">
                        {sortedTeams.map((team, index) => {
                            const teamMatches = getTeamMatches(team.id);
                            const wins = getTeamWins(team.id);
                            const losses = teamMatches.length - wins;
                            const isFinalist = topTeams.some(t => t.id === team.id);

                            return (
                                <div
                                    key={team.id}
                                    className={`border-2 rounded-lg p-4 transition-all ${getTeamColor(team)}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${index === 0 ? 'bg-yellow-500 text-white' :
                                                    index === 1 ? 'bg-gray-300 text-gray-800' :
                                                        index === 2 ? 'bg-orange-400 text-white' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-800 flex items-center gap-2">
                                                    {team.name}
                                                    {isFinalist && (
                                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                                                            Finalist
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {wins}W - {losses}L • {team.points} pts • +{team.leadPoints} lead
                                                </div>
                                            </div>
                                        </div>
                                        {isFinalist && (
                                            <ArrowRight className="w-5 h-5 text-indigo-500" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tournament Flow Visualization */}
                <div className="border-t pt-8">
                    <h3 className="text-lg font-semibold mb-6 text-center">Tournament Flow</h3>
                    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 w-full text-center">
                            <div className="font-medium text-gray-700">Regular Season</div>
                            <div className="text-sm text-gray-600 mt-1">
                                {matches.filter(m => m.round === 'regular').length} matches
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                {matches.filter(m => m.isCompleted && m.round === 'regular').length} completed
                            </div>
                        </div>

                        <div className="w-0.5 h-8 bg-gray-300"></div>

                        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-4 w-full text-center">
                            <div className="font-medium text-indigo-700">Top 2 Teams Qualify</div>
                            <div className="text-sm text-gray-600 mt-1">
                                Based on Wins, Lead Points, Total Points
                            </div>
                        </div>

                        <div className="w-0.5 h-8 bg-gray-300"></div>

                        <div className={`border-2 rounded-lg p-4 w-full text-center ${finalMatch ? 'bg-yellow-50 border-yellow-500' : 'bg-gray-50 border-gray-300'
                            }`}>
                            <div className={`font-medium ${finalMatch ? 'text-yellow-700' : 'text-gray-700'}`}>
                                Finals
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                {finalMatch ? (
                                    finalMatch.isCompleted ? (
                                        <>Champion Decided 🏆</>
                                    ) : (
                                        <>In Progress</>
                                    )
                                ) : (
                                    <>Awaiting Qualification</>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BracketTree;
