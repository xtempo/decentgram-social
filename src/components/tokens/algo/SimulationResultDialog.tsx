import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, Target, Zap } from "lucide-react";
import type { SimulationResult } from "./SimulationEngine";

interface SimulationResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SimulationResult | null;
  strategyName: string;
  cryptoName: string;
}

export const SimulationResultDialog = ({
  open,
  onOpenChange,
  result,
  strategyName,
  cryptoName,
}: SimulationResultDialogProps) => {
  if (!result) return null;

  const isProfitable = result.totalPnL >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Simulation Results
            <Badge variant="outline" className="ml-auto">{strategyName}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className={`text-lg font-bold ${isProfitable ? "text-accent" : "text-destructive"}`}>
                {isProfitable ? "+" : ""}{result.totalPnL.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">P&L ($GRAM)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{result.winRate}%</div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{result.totalTrades}</div>
              <p className="text-xs text-muted-foreground">Total Trades</p>
            </CardContent>
          </Card>
        </div>

        {/* Trade Log */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Trade Log ({cryptoName})
          </h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {result.trades.map((trade, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-md bg-secondary/30 text-xs"
              >
                <div className="flex items-center gap-2">
                  {trade.type === "buy" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className="font-medium capitalize">{trade.type}</span>
                  <span className="text-muted-foreground">{trade.reason}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono">{trade.gramCost} $GRAM</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center italic">
          ⚠️ Simulation based on historical patterns. Past performance does not guarantee future results.
        </p>
      </DialogContent>
    </Dialog>
  );
};
