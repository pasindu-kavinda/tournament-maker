-- Migration: Fix Critical Security Issues
-- 
-- This migration fixes critical security vulnerabilities where:
-- 1. Anyone could delete tournaments they didn't create
-- 2. Missing proper DELETE policies for teams and matches
-- 3. Need to ensure collaborative scoring (anyone can add scores)
--
-- After this migration:
-- - Any authenticated user CAN update match scores (collaborative scoring)
-- - Any authenticated user CAN generate final matches  
-- - Only tournament creators OR admins can INSERT/DELETE tournaments/teams/matches
-- - All authenticated users can still read (SELECT) all data for stats pages
-- - RLS is properly enforced on all tables

-- ============================================================================
-- MATCHES - Enable Collaborative Scoring
-- ============================================================================

-- Ensure SELECT policy exists (should already exist from previous migrations)
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Anyone can view matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

-- DROP the old policy first
DROP POLICY IF EXISTS "Anyone can update match scores" ON public.matches;

-- CREATE INSERT policy - only tournament creators can create matches
DROP POLICY IF EXISTS "Tournament creators can create matches" ON public.matches;
CREATE POLICY "Tournament creators can create matches"
  ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- CREATE UPDATE policy - ANYONE can update match scores (collaborative scoring)
-- This allows any logged-in user to add scores to pending/in-progress tournaments
DROP POLICY IF EXISTS "Tournament creators can update matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can update matches" ON public.matches;
CREATE POLICY "Anyone can update matches"
  ON public.matches
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CREATE DELETE policy - ONLY tournament creators can delete matches
DROP POLICY IF EXISTS "Tournament creators can delete matches" ON public.matches;
CREATE POLICY "Tournament creators can delete matches"
  ON public.matches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- ============================================================================
-- TOURNAMENTS - Verify and fix policies
-- ============================================================================

-- Ensure SELECT policy exists (should already exist from previous migrations)
DROP POLICY IF EXISTS "view_all_tournaments" ON public.tournaments;
CREATE POLICY "view_all_tournaments"
  ON public.tournaments
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure INSERT policy is correct (should already exist from previous migrations)
DROP POLICY IF EXISTS "create_own_tournaments" ON public.tournaments;
CREATE POLICY "create_own_tournaments"
  ON public.tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Ensure UPDATE policy is correct
DROP POLICY IF EXISTS "update_own_tournaments" ON public.tournaments;
CREATE POLICY "update_own_tournaments"
  ON public.tournaments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Ensure DELETE policy is correct
DROP POLICY IF EXISTS "delete_own_tournaments" ON public.tournaments;
CREATE POLICY "delete_own_tournaments"
  ON public.tournaments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================================
-- TEAMS - Verify and fix policies
-- ============================================================================

-- Ensure SELECT policy exists (should already exist from previous migrations)
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy - tournament creators only
DROP POLICY IF EXISTS "Tournament creators can create teams" ON public.teams;
CREATE POLICY "Tournament creators can create teams"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- UPDATE policy - tournament creators only
DROP POLICY IF EXISTS "Tournament creators can update teams" ON public.teams;
CREATE POLICY "Tournament creators can update teams"
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_id
      AND tournaments.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- DELETE policy - tournament creators only
DROP POLICY IF EXISTS "Tournament creators can delete teams" ON public.teams;
CREATE POLICY "Tournament creators can delete teams"
  ON public.teams
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );

-- ============================================================================
-- USERS - Ensure no unauthorized deletions
-- ============================================================================

-- Verify there are NO DELETE policies on users table (users should never be deleted via SQL)
-- Only listing for documentation - these should not exist
DROP POLICY IF EXISTS "Users can delete themselves" ON public.users;
DROP POLICY IF EXISTS "Anyone can delete users" ON public.users;

-- Ensure users can only update their OWN profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After this migration:
-- 
-- TOURNAMENTS:
--   - SELECT: All authenticated users (for stats)
--   - INSERT: Users can create with themselves as creator
--   - UPDATE: Only creators OR admins
--   - DELETE: Only creators OR admins
-- 
-- TEAMS:
--   - SELECT: All authenticated users (for stats)
--   - INSERT: Only tournament creators OR admins
--   - UPDATE: Only tournament creators OR admins
--   - DELETE: Only tournament creators OR admins
-- 
-- MATCHES:
--   - SELECT: All authenticated users (for stats)
--   - INSERT: Only tournament creators OR admins
--   - UPDATE: ALL authenticated users (collaborative scoring!)
--   - DELETE: Only tournament creators OR admins
-- 
-- USERS:
--   - SELECT: All authenticated users
--   - UPDATE: Only own profile
--   - DELETE: NO ONE (security)
--   - INSERT: Only via auth trigger
-- 
-- Admin policies (from 20260212143500_fix_admin_profile.sql) still apply
-- and OR with these policies, giving admins full access to all resources.
--
-- IMPORTANT: This allows collaborative scoring where any authenticated user
-- can add scores to matches, but only creators/admins can delete data.

