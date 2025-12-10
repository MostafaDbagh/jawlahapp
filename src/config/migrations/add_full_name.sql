-- Migration: Add full_name column to users table
-- This allows users to have a full name with spaces (e.g., "mostafa dbagh")

-- Add full_name column to users table
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
    RAISE NOTICE 'Column full_name added to users table.';
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Column full_name already exists in users table.';
END $$;

-- Add a check constraint to ensure full_name only contains valid characters
-- (letters, spaces, hyphens, and apostrophes)
-- Note: In PostgreSQL regex, single quote in character class doesn't need escaping
DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT check_full_name_format 
    CHECK (full_name IS NULL OR full_name ~ '^[a-zA-Z\s''-]+$');
    RAISE NOTICE 'Check constraint added for full_name format.';
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'Check constraint already exists.';
END $$;

-- Add comment to the column
COMMENT ON COLUMN users.full_name IS 'User full name allowing spaces, hyphens, and apostrophes (e.g., "mostafa dbagh")';

