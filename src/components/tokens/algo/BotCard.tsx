import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Clock, Activity, Users, Pause, Play, Trash2, TrendingUp, TrendingDown } from "lucide-react";

interface Bot {
  id: string;
  strategy_type: string;
  crypto_id: string;
  crypto_name: string;
  crypto_symbol: string;
  status: string;
  config: Record<string, any>;
  total_trades: number;
  total_profit_loss: number;
  created_at: string;
  last_executed_at: string | null;
}

interface BotCardProps {
  bot: Bot;
  currentPrice?: number;
  onToggle: (id: string, newStatus: string) => void;
  onDelete: (id: string) => void;
  onSimulate: (bot: Bot) => void;
}

const strategyMeta: Record<string, { icon: typeof Grid3X3; label: string; color: string }> = {
  grid: { icon: Grid3X3, label: "Grid Trading", color: "text-blue-500" },
  dca: { icon: Clock, label: "DCA", color: "text-green-500" },
  rsi: { icon: Activity, label: "RSI Signal", color: "text-purple-500" },
  copy: { icon: Users, label: "Copy Trading", color: "text-orange-500" },
};

export const BotCard = ({ bot, currentPrice, onToggle, onDelete, onSimulate }: BotCardProps) => {
  const meta = strategyMeta[bot.strategy_type] || strategyMeta.grid;
  const Icon = meta.icon;
  const isActive = bot.status === "active";
  const pnl = bot.total_profit_loss;

  const configSummary = () => {
    const c = bot.config;
    switch (bot.strategy_type) {
      case "grid":
        return `$${c.lowerPrice} – $${c.upperPrice} | ${c.gridCount} grids`;
      case "dca":
        return `${c.investmentPerOrder} $GRAM every ${c.intervalHours}h | ${c.totalOrders} orders`;
      case "rsi":
        return `Buy <${c.rsiBuyThreshold} | Sell >${c.rsiSellThreshold} | Period: ${c.rsiPeriod}`;
      case "copy":
        return `Max ${c.maxTradeSize} $GRAM | ${c.copyRatio}% ratio`;
      default:
        return "";
    }
  };

  return (
    <Card className={`transition-all ${isActive ? "border-primary/30" : "opacity-70 border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${meta.color}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{meta.label}</span>
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                  {isActive ? "Active" : "Paused"}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {bot.crypto_name} ({bot.crypto_symbol.toUpperCase()})
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-bold text-sm flex items-center gap-1 ${pnl >= 0 ? "text-accent" : "text-destructive"}`}>
              {pnl >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)} $GRAM
            </div>
            <span className="text-xs text-muted-foreground">{bot.total_trades} trades</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1.5 mb-3 font-mono">
          {configSummary()}
        </p>

        {currentPrice && (
          <p className="text-xs text-muted-foreground mb-3">
            Current price: ${currentPrice.toLocaleString()}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => onSimulate(bot)}
          >
            <Play className="h-3 w-3 mr-1" />
            Run Simulation
          </Button>
          <Button
            size="sm"
            variant={isActive ? "secondary" : "default"}
            className="h-8 text-xs"
            onClick={() => onToggle(bot.id, isActive ? "paused" : "active")}
          >
            {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(bot.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
