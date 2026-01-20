-- Create limit orders table for virtual crypto trading
CREATE TABLE public.virtual_limit_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crypto_id TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  crypto_name TEXT NOT NULL,
  order_type TEXT NOT NULL, -- 'buy' or 'sell'
  amount NUMERIC NOT NULL,
  target_price NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'executed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_order_type CHECK (order_type IN ('buy', 'sell')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'executed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.virtual_limit_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own limit orders"
ON public.virtual_limit_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own limit orders"
ON public.virtual_limit_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limit orders"
ON public.virtual_limit_orders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own limit orders"
ON public.virtual_limit_orders
FOR DELETE
USING (auth.uid() = user_id);