-- Update matches round check constraint to include semi-final
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_round_check;
ALTER TABLE matches ADD CONSTRAINT matches_round_check CHECK (round IN ('regular', 'semi-final', 'final'));
