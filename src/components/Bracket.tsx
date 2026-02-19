import { Match } from '../types';
import MatchCard from './MatchCard';

interface BracketProps {
  matches: Match[];
  finalMatch: Match | null;
  onSubmitScores: (matchId: string, scores: [number, number]) => void;
  canEdit?: boolean;
  title?: string;
}

function Bracket({ matches, finalMatch, onSubmitScores, canEdit = false, title }: BracketProps) {
  const displayMatches = matches
    .filter(m => m.round !== 'final') // Filter out finals as they are handled separately
    .sort((a, b) => a.matchNumber - b.matchNumber);

  return (
    <div className="space-y-8">
      {finalMatch && (
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg xs:text-xl font-semibold mb-2 xs:mb-4">Final Match</h2>
          <MatchCard
            match={finalMatch}
            onSubmitScores={onSubmitScores}
            tournamentStatus={finalMatch.tournamentStatus}
            canEdit={canEdit}
          />
        </div>
      )}

      {displayMatches.length > 0 && (
        <div>
          {title && <h2 className="text-lg xs:text-xl font-semibold mb-4 xs:mb-6 text-center">{title}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 xs:gap-6">
            {displayMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onSubmitScores={onSubmitScores}
                tournamentStatus={match.tournamentStatus}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Bracket;