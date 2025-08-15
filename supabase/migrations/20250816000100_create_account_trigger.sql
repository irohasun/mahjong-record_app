-- Create trigger to automatically create account record when user signs up
-- This ensures that every authenticated user has a corresponding account record

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.accounts (id, username, email, email_verified)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'プレイヤー'),
    new.email,
    new.email_confirmed_at IS NOT NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create account for existing users if they don't have one
INSERT INTO public.accounts (id, username, email, email_verified)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'プレイヤー'),
  au.email,
  au.email_confirmed_at IS NOT NULL
FROM auth.users au
LEFT JOIN public.accounts a ON au.id = a.id
WHERE a.id IS NULL;
