-- Add token_balance to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS token_balance integer DEFAULT 1000 NOT NULL;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, token_balance)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substring(NEW.id::text, 1, 8)), 1000);
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();