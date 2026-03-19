
CREATE TABLE public.algo_trading_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strategy_type TEXT NOT NULL,
  crypto_id TEXT NOT NULL,
  crypto_name TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_trades INTEGER NOT NULL DEFAULT 0,
  total_profit_loss NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_executed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.algo_trading_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bots" ON public.algo_trading_bots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bots" ON public.algo_trading_bots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bots" ON public.algo_trading_bots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bots" ON public.algo_trading_bots FOR DELETE USING (auth.uid() = user_id);
