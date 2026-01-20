-- Create table for virtual crypto holdings
CREATE TABLE public.virtual_crypto_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crypto_id TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  crypto_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, crypto_id)
);

-- Create table for virtual crypto transactions
CREATE TABLE public.virtual_crypto_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crypto_id TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  crypto_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.virtual_crypto_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_crypto_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for holdings
CREATE POLICY "Users can view their own crypto holdings"
  ON public.virtual_crypto_holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crypto holdings"
  ON public.virtual_crypto_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crypto holdings"
  ON public.virtual_crypto_holdings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crypto holdings"
  ON public.virtual_crypto_holdings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for transactions
CREATE POLICY "Users can view their own crypto transactions"
  ON public.virtual_crypto_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crypto transactions"
  ON public.virtual_crypto_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_virtual_crypto_holdings_updated_at
  BEFORE UPDATE ON public.virtual_crypto_holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();