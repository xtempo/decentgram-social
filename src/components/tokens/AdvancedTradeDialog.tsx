import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, TrendingDown, ShieldAlert, Target, Zap, BarChart3 } from "lucide-react";

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
}

interface AdvancedTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crypto: CryptoData | null;
  tradeType: "buy" | "sell";
  gramBalance: number;
  gramToUsdRate: number;
  processing: boolean;
  onExecuteTrade: (params: TradeParams) => void;
}

export interface TradeParams {
  orderType: "market" | "limit" | "stop_loss" | "take_profit";
  amount: number;
  targetPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingStop?: boolean;
  trailingStopPercent?: number;
}

export const AdvancedTradeDialog = ({
  open,
  onOpenChange,
  crypto,
  tradeType,
  gramBalance,
  gramToUsdRate,
  processing,
  onExecuteTrade,
}: AdvancedTradeDialogProps) => {
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop_loss" | "take_profit">("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [enableStopLoss, setEnableStopLoss] = useState(false);
  const [enableTakeProfit, setEnableTakeProfit] = useState(false);
  const [trailingStop, setTrailingStop] = useState(false);
  const [trailingPercent, setTrailingPercent] = useState("5");

  if (!crypto) return null;

  const currentPrice = crypto.current_price;
  const parsedAmount = parseFloat(amount) || 0;
  const effectivePrice = orderType === "limit" ? (parseFloat(limitPrice) || currentPrice) : currentPrice;
  const totalUsd = parsedAmount * effectivePrice;
  const gramCost = Math.ceil(totalUsd / gramToUsdRate);

  const formatPrice = (price: number) => {
    if (price >= 1) return price.toLocaleString("en-US", { style: "currency", currency: "USD" });
    return "$" + price.toFixed(6);
  };

  const setQuickAmount = (percent: number) => {
    if (tradeType === "buy") {
      const maxUsd = gramBalance * gramToUsdRate;
      const maxAmount = maxUsd / effectivePrice;
      setAmount((maxAmount * percent / 100).toFixed(6));
    }
  };

  const handleSubmit = () => {
    if (parsedAmount <= 0) return;

    const params: TradeParams = {
      orderType,
      amount: parsedAmount,
    };

    if (orderType === "limit") {
      params.targetPrice = parseFloat(limitPrice) || currentPrice;
    }
    if (orderType === "stop_loss") {
      params.stopLossPrice = parseFloat(stopLossPrice) || currentPrice * 0.95;
    }
    if (orderType === "take_profit") {
      params.takeProfitPrice = parseFloat(takeProfitPrice) || currentPrice * 1.1;
    }

    // Attach SL/TP for market orders if enabled
    if (orderType === "market") {
      if (enableStopLoss && stopLossPrice) params.stopLossPrice = parseFloat(stopLossPrice);
      if (enableTakeProfit && takeProfitPrice) params.takeProfitPrice = parseFloat(takeProfitPrice);
    }

    if (trailingStop) {
      params.trailingStop = true;
      params.trailingStopPercent = parseFloat(trailingPercent) || 5;
    }

    onExecuteTrade(params);
  };

  const isValid = parsedAmount > 0 && (tradeType !== "buy" || gramCost <= gramBalance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={crypto.image} alt={crypto.name} className="w-6 h-6 rounded-full" />
            {tradeType === "buy" ? "Buy" : "Sell"} {crypto.name}
            <Badge variant="outline" className="ml-auto font-mono">
              {formatPrice(currentPrice)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as typeof orderType)} className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="market" className="text-xs gap-1">
              <Zap className="h-3 w-3" />
              Market
            </TabsTrigger>
            <TabsTrigger value="limit" className="text-xs gap-1">
              <Target className="h-3 w-3" />
              Limit
            </TabsTrigger>
            <TabsTrigger value="stop_loss" className="text-xs gap-1">
              <ShieldAlert className="h-3 w-3" />
              Stop Loss
            </TabsTrigger>
            <TabsTrigger value="take_profit" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              Take Profit
            </TabsTrigger>
          </TabsList>

          {/* Market Order */}
          <TabsContent value="market" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Execute immediately at the current market price.
            </p>
            <AmountInput
              amount={amount}
              setAmount={setAmount}
              symbol={crypto.symbol}
              onQuickAmount={tradeType === "buy" ? setQuickAmount : undefined}
            />

            {/* Optional SL/TP for market orders */}
            <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Management</p>
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  Stop Loss
                </Label>
                <Switch checked={enableStopLoss} onCheckedChange={setEnableStopLoss} />
              </div>
              {enableStopLoss && (
                <Input
                  type="number"
                  placeholder={`e.g. ${(currentPrice * 0.95).toFixed(2)}`}
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  className="h-9"
                />
              )}

              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  Take Profit
                </Label>
                <Switch checked={enableTakeProfit} onCheckedChange={setEnableTakeProfit} />
              </div>
              {enableTakeProfit && (
                <Input
                  type="number"
                  placeholder={`e.g. ${(currentPrice * 1.1).toFixed(2)}`}
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(e.target.value)}
                  className="h-9"
                />
              )}
            </div>
          </TabsContent>

          {/* Limit Order */}
          <TabsContent value="limit" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              {tradeType === "buy"
                ? "Buy when price drops to your target."
                : "Sell when price rises to your target."}
            </p>
            <div>
              <Label className="text-sm">Target Price (USD)</Label>
              <Input
                type="number"
                placeholder={currentPrice.toFixed(2)}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="mt-1"
              />
              {limitPrice && (
                <p className="text-xs mt-1 text-muted-foreground">
                  {((parseFloat(limitPrice) / currentPrice - 1) * 100).toFixed(2)}% from current
                </p>
              )}
            </div>
            <AmountInput
              amount={amount}
              setAmount={setAmount}
              symbol={crypto.symbol}
              onQuickAmount={tradeType === "buy" ? setQuickAmount : undefined}
            />
          </TabsContent>

          {/* Stop Loss */}
          <TabsContent value="stop_loss" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Automatically sell when price drops below your stop price to limit losses.
            </p>
            <div>
              <Label className="text-sm">Stop Price (USD)</Label>
              <Input
                type="number"
                placeholder={(currentPrice * 0.95).toFixed(2)}
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                className="mt-1"
              />
              {stopLossPrice && (
                <p className="text-xs mt-1 text-destructive">
                  Triggers at {((parseFloat(stopLossPrice) / currentPrice - 1) * 100).toFixed(2)}% from current
                </p>
              )}
            </div>
            <AmountInput
              amount={amount}
              setAmount={setAmount}
              symbol={crypto.symbol}
            />
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
              <Label className="text-sm flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                Trailing Stop
              </Label>
              <Switch checked={trailingStop} onCheckedChange={setTrailingStop} />
            </div>
            {trailingStop && (
              <div>
                <Label className="text-sm">Trail Percentage (%)</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={trailingPercent}
                  onChange={(e) => setTrailingPercent(e.target.value)}
                  min="0.5"
                  max="50"
                  step="0.5"
                  className="mt-1"
                />
              </div>
            )}
          </TabsContent>

          {/* Take Profit */}
          <TabsContent value="take_profit" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Automatically sell when price rises above your target to lock in gains.
            </p>
            <div>
              <Label className="text-sm">Target Price (USD)</Label>
              <Input
                type="number"
                placeholder={(currentPrice * 1.1).toFixed(2)}
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                className="mt-1"
              />
              {takeProfitPrice && (
                <p className="text-xs mt-1 text-accent">
                  +{((parseFloat(takeProfitPrice) / currentPrice - 1) * 100).toFixed(2)}% from current
                </p>
              )}
            </div>
            <AmountInput
              amount={amount}
              setAmount={setAmount}
              symbol={crypto.symbol}
            />
          </TabsContent>
        </Tabs>

        {/* Order Summary */}
        {parsedAmount > 0 && (
          <div className="p-4 rounded-lg bg-secondary/50 space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Type</span>
              <Badge variant="outline" className="capitalize">{orderType.replace("_", " ")}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span>{parsedAmount} {crypto.symbol.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per unit</span>
              <span>{formatPrice(effectivePrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">USD Value</span>
              <span>{formatPrice(totalUsd)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-border">
              <span>{tradeType === "buy" ? "Cost" : "You'll Receive"}</span>
              <span className={tradeType === "buy" ? "text-destructive" : "text-accent"}>
                {gramCost.toLocaleString()} $GRAM
              </span>
            </div>
            {tradeType === "buy" && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Your Balance</span>
                <span className={gramBalance < gramCost ? "text-destructive" : ""}>
                  {gramBalance.toLocaleString()} $GRAM
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processing || !isValid}
            className={tradeType === "buy" ? "bg-accent hover:bg-accent/80" : ""}
          >
            {processing
              ? "Processing..."
              : orderType === "market"
              ? `${tradeType === "buy" ? "Buy" : "Sell"} Now`
              : `Place ${orderType.replace("_", " ")} Order`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Reusable amount input with quick-select buttons
function AmountInput({
  amount,
  setAmount,
  symbol,
  onQuickAmount,
}: {
  amount: string;
  setAmount: (v: string) => void;
  symbol: string;
  onQuickAmount?: (percent: number) => void;
}) {
  return (
    <div>
      <Label className="text-sm">Amount ({symbol.toUpperCase()})</Label>
      <Input
        type="number"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min="0"
        step="0.000001"
        className="mt-1"
      />
      {onQuickAmount && (
        <div className="flex gap-2 mt-2">
          {[25, 50, 75, 100].map((pct) => (
            <Button
              key={pct}
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => onQuickAmount(pct)}
            >
              {pct}%
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
