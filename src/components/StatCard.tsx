import { ReactNode } from 'react';

interface Stat {
    label: string;
    value: string | number;
    color?: string;
}

interface StatCardProps {
    rank: number;
    title: string | ReactNode;
    subtitle?: string;
    stats: Stat[];
    onClick?: () => void;
}

function StatCard({ rank, title, subtitle, stats, onClick }: StatCardProps) {
    const getRankStyles = () => {
        if (rank === 1) {
            return {
                card: 'bg-yellow-50 border-yellow-400',
                badge: 'bg-yellow-400 text-yellow-900'
            };
        } else if (rank === 2) {
            return {
                card: 'bg-gray-50 border-gray-400',
                badge: 'bg-gray-400 text-gray-900'
            };
        } else if (rank === 3) {
            return {
                card: 'bg-orange-50 border-orange-400',
                badge: 'bg-orange-400 text-orange-900'
            };
        }
        return {
            card: 'bg-white border-gray-200',
            badge: 'bg-indigo-100 text-indigo-600'
        };
    };

    const styles = getRankStyles();

    return (
        <div
            className={`p-3 xs:p-4 rounded-lg border-2 ${styles.card} ${onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}
            onClick={onClick}
        >
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4">
                <div className="flex items-center gap-2 xs:gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${styles.badge}`}>
                        {rank}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-800">
                            {title}
                        </div>
                        {subtitle && (
                            <div className="text-sm text-gray-500">
                                {subtitle}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 xs:gap-6 text-center justify-around xs:justify-start">
                    {stats.map((stat, index) => (
                        <div key={index}>
                            <div className={`text-2xl font-bold ${stat.color || 'text-gray-700'}`}>
                                {stat.value}
                            </div>
                            <div className="text-xs text-gray-500">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default StatCard;
