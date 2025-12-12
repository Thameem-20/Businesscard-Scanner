-- Add is_active column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Set all existing users as active
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;


