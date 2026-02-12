-- Migration: Fix Admin and Profile Permissions

-- 1. Add is_admin column to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);

-- 2. Enable RLS on all tables (should be already, but ensuring)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 3. Users Table Policies
-- Allow anyone to read user profiles (id, full_name, avatar_url if exists)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.users FOR SELECT
USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- 4. Admin Access Policies
-- Tournaments: Admins can view/edit/delete ALL
CREATE POLICY "Admins can view all tournaments"
ON public.tournaments FOR SELECT
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can update all tournaments"
ON public.tournaments FOR UPDATE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can delete all tournaments"
ON public.tournaments FOR DELETE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Teams: Admins can view/edit/delete ALL
CREATE POLICY "Admins can view all teams"
ON public.teams FOR SELECT
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can update all teams"
ON public.teams FOR UPDATE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can delete all teams"
ON public.teams FOR DELETE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Matches: Admins can view/edit/delete ALL
CREATE POLICY "Admins can view all matches"
ON public.matches FOR SELECT
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can update all matches"
ON public.matches FOR UPDATE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can delete all matches"
ON public.matches FOR DELETE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- 5. Existing Policies Backup (ensure compatibility)
-- If existing policies conflict, they might need adjustment.
-- But since policies are OR-ed in Postgres RLS for permissive policies, adding admin policies should work alongside existing ones.
