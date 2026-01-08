-- Create tokens table for custom tokens
CREATE TABLE public.tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  total_supply BIGINT NOT NULL DEFAULT 1000000,
  circulating_supply BIGINT NOT NULL DEFAULT 0,
  price_per_token NUMERIC(18, 8) NOT NULL DEFAULT 0.001,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_tokens table for tracking holdings
CREATE TABLE public.user_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token_id)
);

-- Create token_transactions table for buy/sell history
CREATE TABLE public.token_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'create', 'transfer')),
  amount BIGINT NOT NULL,
  price_per_token NUMERIC(18, 8) NOT NULL,
  total_cost NUMERIC(18, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Tokens policies
CREATE POLICY "Tokens are viewable by everyone"
  ON public.tokens FOR SELECT
  USING (true);

CREATE POLICY "Users can create tokens"
  ON public.tokens FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their tokens"
  ON public.tokens FOR UPDATE
  USING (auth.uid() = creator_id);

-- User tokens policies
CREATE POLICY "Users can view their own token holdings"
  ON public.user_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their token holdings"
  ON public.user_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their token holdings"
  ON public.user_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Token transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.token_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
  ON public.token_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_tokens_updated_at
  BEFORE UPDATE ON public.tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert the native GRAM token
INSERT INTO public.tokens (id, creator_id, name, symbol, description, total_supply, circulating_supply, price_per_token)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'DecentGram',
  'GRAM',
  'The native token of DecentGram platform. Earn by creating content and engaging with the community.',
  1000000000,
  100000000,
  0.01
);