import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BotCard } from "./algo/BotCard";
import { CreateBotDialog } from "./algo/CreateBotDialog";
import { SimulationResultDialog } from "./algo/SimulationResultDialog";
import { runSimulation, type SimulationResult } from "./algo/SimulationEngine";

interface AlgoTradingProps {
  userId: string;
  gramBalance: number;
  onBalanceChange?: (newBalance: number) => void;
}

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
}

const strategyNames: Record<string, string> = {
  grid: "Grid Trading",
  dca: "DCA",
  rsi: "RSI Signal",
  copy: "Copy Trading",
};

export const AlgoTrading = ({ userId, gramBalance, onBalanceChange }: AlgoTradingProps) => {
  const [bots, setBots] = useState<any[]>([]);
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simMeta, setSimMeta] = useState({ strategy: "", crypto: "" });

  const fetchBots = async () => {
    const { data } = await supabase
      .from("algo_trading_bots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBots(data || []);
  };

  const fetchCryptos = async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1"
      );
      if (res.ok) {
        const data = await res.json();
        setCryptos(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    Promise.all([fetchBots(), fetchCryptos()]).then(() => setLoading(false));
  }, [userId]);

  const handleToggle = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("algo_trading_bots")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update bot");
    } else {
      toast.success(`Bot ${newStatus === "active" ? "activated" : "paused"}`);
      fetchBots();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("algo_trading_bots").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete bot");
    } else {
      toast.success("Bot deleted");
      fetchBots();
    }
  };

  const handleSimulate = (bot: any) => {
    const crypto = cryptos.find((c) => c.id === bot.crypto_id);
    const price = crypto?.current_price || 50000;
    const result = runSimulation(bot.strategy_type, price, bot.config);

    // Update bot stats in DB
    supabase
      .from("algo_trading_bots")
      .update({
        total_trades: (bot.total_trades || 0) + result.totalTrades,
        total_profit_loss: (bot.total_profit_loss || 0) + result.totalPnL,
        last_executed_at: new Date().toISOString(),
      })
      .eq("id", bot.id)
      .then(() => fetchBots());

    // Update balance
    if (onBalanceChange && result.totalPnL !== 0) {
      const newBalance = gramBalance + result.totalPnL;
      supabase
        .from("profiles")
        .update({ token_balance: newBalance })
        .eq("user_id", userId)
        .then(() => onBalanceChange(newBalance));
    }

    setSimMeta({
      strategy: strategyNames[bot.strategy_type] || bot.strategy_type,
      crypto: bot.crypto_name,
    });
    setSimResult(result);
  };

  const activeBots = bots.filter((b) => b.status === "active").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold">Algo Trading Bots</h2>
            <p className="text-sm text-muted-foreground">
              {bots.length} bot{bots.length !== 1 ? "s" : ""} · {activeBots} active
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { fetchBots(); fetchCryptos(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Bot
          </Button>
        </div>
      </div>

      {/* Strategy Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["grid", "dca", "rsi", "copy"].map((type) => {
          const count = bots.filter((b) => b.strategy_type === type).length;
          const pnl = bots
            .filter((b) => b.strategy_type === type)
            .reduce((sum, b) => sum + (b.total_profit_loss || 0), 0);
          return (
            <Card key={type}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {strategyNames[type]}
                </p>
                <p className="text-sm font-bold">{count} bot{count !== 1 ? "s" : ""}</p>
                <p className={`text-xs font-medium ${pnl >= 0 ? "text-accent" : "text-destructive"}`}>
                  {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)} $GRAM
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bot List */}
      {bots.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No Trading Bots Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first algorithmic trading bot to automate your strategy
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Bot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bots.map((bot) => {
            const crypto = cryptos.find((c) => c.id === bot.crypto_id);
            return (
              <BotCard
                key={bot.id}
                bot={bot}
                currentPrice={crypto?.current_price}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onSimulate={handleSimulate}
              />
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateBotDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        userId={userId}
        cryptos={cryptos}
        onBotCreated={fetchBots}
      />

      <SimulationResultDialog
        open={!!simResult}
        onOpenChange={() => setSimResult(null)}
        result={simResult}
        strategyName={simMeta.strategy}
        cryptoName={simMeta.crypto}
      />
    </div>
  );
};
