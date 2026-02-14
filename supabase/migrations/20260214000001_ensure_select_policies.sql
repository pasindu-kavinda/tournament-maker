-- Migration: Ensure SELECT policies exist for all authenticated users
-- 
-- This ensures all authenticated users can view tournaments, teams, and matches
-- even if previous migrations had conflicting policies

-- ============================================================================
-- TOURNAMENTS - Ensure SELECT policy
-- ============================================================================
DROP POLICY IF EXISTS "view_all_tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can view all tournaments" ON public.tournaments;

CREATE POLICY "view_all_tournaments"
  ON public.tournaments
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- TEAMS - Ensure SELECT policy
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;

CREATE POLICY "Anyone can view teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- MATCHES - Ensure SELECT policy
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can view all matches" ON public.matches;

CREATE POLICY "Anyone can view matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- USERS - Ensure SELECT policy
-- ============================================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users
  FOR SELECT
  USING (true);
