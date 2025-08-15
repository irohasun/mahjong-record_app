-- Add photo_path column to games for storing storage path to game photo
ALTER TABLE games ADD COLUMN IF NOT EXISTS photo_path text;

-- Optional: index if querying by photo presence later
-- CREATE INDEX IF NOT EXISTS idx_games_photo_path ON games(photo_path);

