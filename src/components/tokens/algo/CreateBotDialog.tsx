import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Grid3X3, Clock, Activity, Users, Bot, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
}

interface CreateBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  cryptos: CryptoOption[];
  onBotCreated: () => void;
}

const STRATEGIES = [
  {
    id: "grid",
    name: "Grid Trading",
    icon: Grid3X3,
    description: "Auto buy/sell at preset price intervals to profit from range-bound markets",
    color: "text-blue-500",
    fields: ["upperPrice", "lowerPrice", "gridCount", "investmentAmount"],
  },
  {
    id: "dca",
    name: "DCA",
    icon: Clock,
    description: "Dollar Cost Averaging - buy fixed amounts at regular intervals",
    color: "text-green-500",
    fields: ["investmentPerOrder", "intervalHours", "totalOrders"],
  },
  {
    id: "rsi",
    name: "RSI Signal",
    icon: Activity,
    description: "Trade based on RSI overbought/oversold signals",
    color: "text-purple-500",
    fields: ["rsiBuyThreshold", "rsiSellThreshold", "tradeAmount", "rsiPeriod"],
  },
  {
    id: "copy",
    name: "Copy Trading",
    icon: Users,
    description: "Follow and automatically copy trades from top performers",
    color: "text-orange-500",
    fields: ["maxTradeSize", "copyRatio"],
  },
];

export const CreateBotDialog = ({
  open,
  onOpenChange,
  userId,
  cryptos,
  onBotCreated,
}: CreateBotDialogProps) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const strategy = STRATEGIES.find((s) => s.id === selectedStrategy);
  const crypto = cryptos.find((c) => c.id === selectedCrypto);

  const updateConfig = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!strategy || !crypto) return;

    setCreating(true);
    try {
      const configObj: Record<string, number | string> = {};
      for (const [key, val] of Object.entries(config)) {
        configObj[key] = parseFloat(val) || val;
      }

      const { error } = await supabase.from("algo_trading_bots").insert({
        user_id: userId,
        strategy_type: strategy.id,
        crypto_id: crypto.id,
        crypto_name: crypto.name,
        crypto_symbol: crypto.symbol,
        config: configObj,
        status: "active",
      });

      if (error) throw error;

      toast.success(`${strategy.name} bot created for ${crypto.name}!`);
      onBotCreated();
      onOpenChange(false);
      setSelectedStrategy("");
      setSelectedCrypto("");
      setConfig({});
    } catch (err: any) {
      toast.error(err.message || "Failed to create bot");
    } finally {
      setCreating(false);
    }
  };

  const fieldLabels: Record<string, { label: string; placeholder: string; hint?: string }> = {
    upperPrice: { label: "Upper Price (USD)", placeholder: "e.g. 70000", hint: "Highest grid price" },
    lowerPrice: { label: "Lower Price (USD)", placeholder: "e.g. 60000", hint: "Lowest grid price" },
    gridCount: { label: "Number of Grids", placeholder: "e.g. 10", hint: "More grids = more trades" },
    investmentAmount: { label: "Total Investment ($GRAM)", placeholder: "e.g. 500" },
    investmentPerOrder: { label: "Amount per Order ($GRAM)", placeholder: "e.g. 50" },
    intervalHours: { label: "Interval (hours)", placeholder: "e.g. 24", hint: "Time between buys" },
    totalOrders: { label: "Total Orders", placeholder: "e.g. 30", hint: "Number of buy orders" },
    rsiBuyThreshold: { label: "RSI Buy Threshold", placeholder: "30", hint: "Buy when RSI drops below" },
    rsiSellThreshold: { label: "RSI Sell Threshold", placeholder: "70", hint: "Sell when RSI rises above" },
    tradeAmount: { label: "Trade Amount ($GRAM)", placeholder: "e.g. 100" },
    rsiPeriod: { label: "RSI Period", placeholder: "14", hint: "Candle periods for calculation" },
    maxTradeSize: { label: "Max Trade Size ($GRAM)", placeholder: "e.g. 200" },
    copyRatio: { label: "Copy Ratio (%)", placeholder: "100", hint: "% of original trade to copy" },
  };

  const isValid = selectedStrategy && selectedCrypto && strategy?.fields.every((f) => config[f]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Create Trading Bot
          </DialogTitle>
        </DialogHeader>

        {/* Strategy Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Strategy</Label>
          <div className="grid grid-cols-2 gap-3">
            {STRATEGIES.map((s) => {
              const Icon = s.icon;
              return (
                <Card
                  key={s.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedStrategy === s.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : ""
                  }`}
                  onClick={() => setSelectedStrategy(s.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${s.color}`} />
                      <span className="font-medium text-sm">{s.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Crypto Selection */}
        {selectedStrategy && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Cryptocurrency</Label>
            <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a crypto..." />
              </SelectTrigger>
              <SelectContent>
                {cryptos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <img src={c.image} alt={c.name} className="w-4 h-4 rounded-full" />
                      {c.name} ({c.symbol.toUpperCase()}) - ${c.current_price.toLocaleString()}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Strategy Configuration */}
        {strategy && selectedCrypto && (
          <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Configure {strategy.name}</span>
            </div>
            {strategy.fields.map((field) => {
              const meta = fieldLabels[field];
              return (
                <div key={field}>
                  <Label className="text-sm">{meta?.label || field}</Label>
                  <Input
                    type="number"
                    placeholder={meta?.placeholder}
                    value={config[field] || ""}
                    onChange={(e) => updateConfig(field, e.target.value)}
                    className="mt-1"
                  />
                  {meta?.hint && (
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.hint}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid || creating}>
            {creating ? "Creating..." : "Launch Bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
