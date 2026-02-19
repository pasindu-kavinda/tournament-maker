/*
  # Add type column to tournaments table

  1. Changes
    - Add `type` column to `tournaments` table
*/

ALTER TABLE "public"."tournaments" ADD COLUMN "type" text;

COMMENT ON COLUMN "public"."tournaments"."type" IS 'Type of the tournament (e.g., men-single, women-double)';
