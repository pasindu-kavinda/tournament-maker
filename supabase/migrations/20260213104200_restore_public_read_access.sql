-- Migration: Restore Public Read Access for Stats Pages
-- 
-- Problem: The admin-only SELECT policies from 20260212143500_fix_admin_profile.sql
-- are blocking non-admin users from viewing tournaments, teams, and matches.
-- 
-- Solution: Drop the admin-only SELECT policies and restore public read access
-- while keeping admin write privileges intact.

-- ============================================================================
-- TOURNAMENTS
-- ============================================================================

-- Drop admin-only SELECT policy
DROP POLICY IF EXISTS "Admins can view all tournaments" ON public.tournaments;

-- Restore public read access (this policy already existed before admin migration)
DROP POLICY IF EXISTS "view_all_tournaments" ON public.tournaments;
CREATE POLICY "view_all_tournaments"
  ON public.tournaments
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep admin UPDATE and DELETE policies
-- (These are already created by 20260212143500_fix_admin_profile.sql)

-- ============================================================================
-- TEAMS
-- ============================================================================

-- Drop admin-only SELECT policy
DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;

-- Restore public read access
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep admin UPDATE and DELETE policies

-- ============================================================================
-- MATCHES
-- ============================================================================

-- Drop admin-only SELECT policy
DROP POLICY IF EXISTS "Admins can view all matches" ON public.matches;

-- Restore public read access
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Anyone can view matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep admin UPDATE and DELETE policies

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After this migration:
-- - All authenticated users can SELECT from tournaments, teams, and matches
-- - Only tournament creators can INSERT/UPDATE/DELETE their own data
-- - Admins can UPDATE/DELETE all data (via existing admin policies)
-- - Stats pages will work for all users
