import { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

interface Badge {
    icon: LucideIcon;
    label: string;
    color: 'primary' | 'secondary';
}

interface StatsCategoryCardProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    description: string;
    badges: Badge[];
    buttonText: string;
    gradientFrom: string;
    gradientTo: string;
    onClick: () => void;
    colSpan?: 'single' | 'double';
}

function StatsCategoryCard({
    icon: Icon,
    title,
    subtitle,
    description,
    badges,
    buttonText,
    gradientFrom,
    gradientTo,
    onClick,
    colSpan = 'single'
}: StatsCategoryCardProps) {
    return (
        <button
            onClick={onClick}
            className={`group bg-white rounded-2xl shadow-lg p-4 xs:p-6 sm:p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left ${colSpan === 'double' ? 'md:col-span-2' : ''}`}
        >
            <div className="flex items-center gap-3 xs:gap-4 mb-4">
                <div className={`w-12 h-12 xs:w-16 xs:h-16 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 xs:w-8 xs:h-8 text-white" />
                </div>
                <div>
                    <h2 className="text-xl xs:text-2xl font-bold text-gray-800 group-hover:text-indigo-600 transition">
                        {title}
                    </h2>
                    <p className="text-xs xs:text-sm text-gray-500">{subtitle}</p>
                </div>
            </div>

            <p className="text-sm xs:text-base text-gray-600 mb-4">
                {description}
            </p>

            <div className="flex flex-wrap items-center gap-3 xs:gap-4 text-xs xs:text-sm">
                {badges.map((badge, index) => {
                    const BadgeIcon = badge.icon;
                    return (
                        <div
                            key={index}
                            className={`flex items-center gap-1 ${badge.color === 'primary' ? 'text-indigo-600' : 'text-gray-500'}`}
                        >
                            <BadgeIcon className="w-4 h-4" />
                            <span className={badge.color === 'primary' ? 'font-medium' : ''}>{badge.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 xs:mt-6 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
                <span className="text-sm xs:text-base">{buttonText}</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
        </button>
    );
}

export default StatsCategoryCard;
