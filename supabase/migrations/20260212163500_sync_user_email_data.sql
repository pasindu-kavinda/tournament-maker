-- Add email and last_sign_in_at columns to public.users table
-- This allows us to query user data without needing RPC functions

-- Add columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email VARCHAR,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Create a trigger function to sync data from auth.users to public.users
CREATE OR REPLACE FUNCTION sync_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email and last_sign_in_at from auth.users
  UPDATE public.users
  SET 
    email = NEW.email,
    last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to sync data
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_data();

-- Sync existing data from auth.users to public.users
UPDATE public.users u
SET 
  email = au.email,
  last_sign_in_at = au.last_sign_in_at
FROM auth.users au
WHERE u.id = au.id;
