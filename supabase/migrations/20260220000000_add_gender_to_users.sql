/*
  # Add gender column to users table

  1. Changes
    - Add `gender` column to `users` table (nullable, 'male' or 'female')
*/

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "gender" text CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN "public"."users"."gender" IS 'Player gender: male or female. NULL means unset.';
