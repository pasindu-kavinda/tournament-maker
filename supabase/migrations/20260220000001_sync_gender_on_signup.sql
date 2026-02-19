/*
  # Sync gender from auth metadata to public.users

  Update the handle_new_user trigger function to also capture gender
  from raw_user_meta_data when a new user signs up.
*/

-- Update the function that creates a public user profile on signup
-- to also capture gender from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, gender)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'gender'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      email     = EXCLUDED.email,
      gender    = EXCLUDED.gender;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
