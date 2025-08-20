-- Profiles feature migration
-- Ensure accounts has avatar_url and username, and add indexes and policies if missing

-- Add avatar_url if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.accounts ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add index for username lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'accounts' AND indexname = 'idx_accounts_username'
  ) THEN
    CREATE INDEX idx_accounts_username ON public.accounts(username);
  END IF;
END $$;

-- Storage bucket for profile photos (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for profile photos (idempotent)
DO $$ BEGIN
  -- Create policy only if current_user is the storage schema owner
  IF (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE relname = 'objects' AND relnamespace = 'storage'::regnamespace) = current_user THEN
    CREATE POLICY "Public read profile photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-photos');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE relname = 'objects' AND relnamespace = 'storage'::regnamespace) = current_user THEN
    CREATE POLICY "Users can upsert their own profile photos"
    ON storage.objects FOR ALL TO authenticated
    USING (
      bucket_id = 'profile-photos'
      AND (split_part(name, '/', 1) = 'avatars')
      AND (split_part(name, '/', 2) = auth.uid()::text)
    )
    WITH CHECK (
      bucket_id = 'profile-photos'
      AND (split_part(name, '/', 1) = 'avatars')
      AND (split_part(name, '/', 2) = auth.uid()::text)
    );
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS on accounts (idempotent updates)
-- Ensure users can read and update only their own account
DO $$ BEGIN
  CREATE POLICY "Users can read own account data"
  ON public.accounts FOR SELECT TO authenticated
  USING (id::text = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own account data"
  ON public.accounts FOR UPDATE TO authenticated
  USING (id::text = auth.uid()::text)
  WITH CHECK (id::text = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
