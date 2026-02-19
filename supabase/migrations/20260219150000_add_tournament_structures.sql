-- Add structure column to tournaments table
ALTER TABLE tournaments 
ADD COLUMN structure text NOT NULL DEFAULT 'round-robin';

-- Add group_id to teams table (for group stage assignments)
ALTER TABLE teams 
ADD COLUMN group_id text;

-- Add group_id and next_match_id to matches table
ALTER TABLE matches 
ADD COLUMN group_id text,
ADD COLUMN next_match_id uuid REFERENCES matches(id);

-- Create index for performance
CREATE INDEX idx_teams_group_id ON teams(group_id);
CREATE INDEX idx_matches_group_id ON matches(group_id);
CREATE INDEX idx_matches_next_match_id ON matches(next_match_id);
