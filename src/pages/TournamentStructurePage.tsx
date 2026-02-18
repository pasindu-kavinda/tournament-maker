import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy } from 'lucide-react';

export default function TournamentStructurePage() {
    const navigate = useNavigate();
    const [selectedTeamCount, setSelectedTeamCount] = useState<4 | 5 | 6>(4);
    const [hoveredTeam, setHoveredTeam] = useState<number | null>(null);

    const structures: Record<4 | 5 | 6, number[][]> = {
        4: [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]],
        5: [
            [0, 1], [2, 3], [0, 4], [1, 3], [4, 2],
            [0, 3], [1, 4], [2, 0], [3, 4], [1, 2]
        ],
        6: [
            [0, 5], [1, 2], [3, 4], [0, 2], [1, 5],
            [3, 0], [2, 4], [1, 3], [5, 4], [0, 1],
            [2, 5], [4, 1], [3, 2], [0, 4], [5, 3]
        ]
    };

    const getTeamLabel = (index: number) => `Team ${index + 1}`;
    const getTeamColor = (index: number) => {
        const colors = [
            'bg-red-100 text-red-700 border-red-200',
            'bg-blue-100 text-blue-700 border-blue-200',
            'bg-green-100 text-green-700 border-green-200',
            'bg-yellow-100 text-yellow-700 border-yellow-200',
            'bg-purple-100 text-purple-700 border-purple-200',
            'bg-pink-100 text-pink-700 border-pink-200',
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-indigo-600" />
                        Tournament Structures
                    </h1>
                </header>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-6 bg-indigo-600 text-white">
                        <h2 className="text-xl font-semibold mb-4">Select Team Count</h2>
                        <div className="flex flex-wrap gap-2">
                            {[4, 5, 6].map((count) => (
                                <button
                                    key={count}
                                    onClick={() => setSelectedTeamCount(count as 4 | 5 | 6)}
                                    className={`px-6 py-2 rounded-full font-medium transition-all ${selectedTeamCount === count
                                            ? 'bg-white text-indigo-600 shadow-lg scale-105'
                                            : 'bg-indigo-500/50 hover:bg-indigo-500 text-indigo-100'
                                        }`}
                                >
                                    {count} Teams
                                </button>
                            ))}
                        </div>
                        <p className="mt-4 text-indigo-200 text-sm">
                            Visualizing how matches are distributed to ensure fair breaks between games.
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Match Schedule
                                </h3>
                                <div className="space-y-3">
                                    {structures[selectedTeamCount].map((match, idx) => {
                                        const [t1, t2] = match;
                                        const isHighlighted = hoveredTeam === t1 || hoveredTeam === t2;

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isHighlighted
                                                        ? 'bg-indigo-50 border-indigo-300 shadow-md scale-[1.02]'
                                                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                                    }`}
                                            >
                                                <span className="text-xs font-bold text-gray-400 w-8">#{idx + 1}</span>
                                                <div className="flex items-center gap-3 flex-1 justify-center">
                                                    <span
                                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-opacity ${getTeamColor(t1)} ${hoveredTeam !== null && hoveredTeam !== t1 ? 'opacity-40' : ''}`}
                                                        onMouseEnter={() => setHoveredTeam(t1)}
                                                        onMouseLeave={() => setHoveredTeam(null)}
                                                    >
                                                        {getTeamLabel(t1)}
                                                    </span>
                                                    <span className="text-gray-400 font-bold text-xs">VS</span>
                                                    <span
                                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-opacity ${getTeamColor(t2)} ${hoveredTeam !== null && hoveredTeam !== t2 ? 'opacity-40' : ''}`}
                                                        onMouseEnter={() => setHoveredTeam(t2)}
                                                        onMouseLeave={() => setHoveredTeam(null)}
                                                    >
                                                        {getTeamLabel(t2)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Team Legend</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Array.from({ length: selectedTeamCount }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-xl border-2 cursor-default transition-all ${hoveredTeam === idx
                                                    ? 'bg-indigo-50 border-indigo-400 shadow-md'
                                                    : 'bg-white border-transparent shadow-sm hover:shadow-md'
                                                }`}
                                            onMouseEnter={() => setHoveredTeam(idx)}
                                            onMouseLeave={() => setHoveredTeam(null)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getTeamColor(idx)}`}>
                                                    T{idx + 1}
                                                </div>
                                                <span className="font-medium text-gray-700">Team {idx + 1}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <h4 className="font-semibold text-indigo-900 mb-2 text-sm">Structure Logic</h4>
                                    <ul className="text-sm text-indigo-800 space-y-1 list-disc list-inside">
                                        <li>Total Matches: {structures[selectedTeamCount].length}</li>
                                        <li>Matches per Team: {selectedTeamCount - 1}</li>
                                        <li>
                                            {selectedTeamCount === 4
                                                ? "Optimized for equal rest periods."
                                                : "Standard Round Robin sequence."}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
