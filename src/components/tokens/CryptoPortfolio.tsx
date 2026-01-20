import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CryptoHolding {
  id: string;
  crypto_id: string;
  crypto_symbol: string;
  crypto_name: string;
  amount: number;
  avg_buy_price: number;
}

interface CryptoTransaction {
  id: string;
  crypto_id: string;
  crypto_symbol: string;
  crypto_name: string;
  transaction_type: string;
  amount: number;
  price_per_unit: number;
  total_cost: number;
  created_at: string;
}

interface CryptoPrice {
  id: string;
  current_price: number;
  image: string;
}

interface CryptoPortfolioProps {
  userId: string;
  cryptoPrices: CryptoPrice[];
  onRefresh: () => void;
}

export const CryptoPortfolio = ({ userId, cryptoPrices, onRefresh }: CryptoPortfolioProps) => {
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [holdingsRes, transactionsRes] = await Promise.all([
        supabase
          .from("virtual_crypto_holdings")
          .select("*")
          .eq("user_id", userId)
          .gt("amount", 0),
        supabase
          .from("virtual_crypto_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)
      ]);

      if (holdingsRes.data) {
        setHoldings(holdingsRes.data.map(h => ({
          ...h,
          amount: Number(h.amount),
          avg_buy_price: Number(h.avg_buy_price)
        })));
      }
      if (transactionsRes.data) {
        setTransactions(transactionsRes.data.map(t => ({
          ...t,
          amount: Number(t.amount),
          price_per_unit: Number(t.price_per_unit),
          total_cost: Number(t.total_cost)
        })));
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const getPrice = (cryptoId: string) => {
    return cryptoPrices.find(c => c.id === cryptoId)?.current_price || 0;
  };

  const getImage = (cryptoId: string) => {
    return cryptoPrices.find(c => c.id === cryptoId)?.image || "";
  };

  const calculateTotalValue = () => {
    return holdings.reduce((sum, h) => sum + (h.amount * getPrice(h.crypto_id)), 0);
  };

  const calculateTotalCost = () => {
    return holdings.reduce((sum, h) => sum + (h.amount * h.avg_buy_price), 0);
  };

  const calculatePnL = () => {
    return calculateTotalValue() - calculateTotalCost();
  };

  const calculatePnLPercentage = () => {
    const cost = calculateTotalCost();
    if (cost === 0) return 0;
    return ((calculateTotalValue() - cost) / cost) * 100;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const totalValue = calculateTotalValue();
  const pnl = calculatePnL();
  const pnlPercentage = calculatePnLPercentage();

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card className="bg-gradient-to-br from-primary/20 to-accent/10 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Virtual Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${pnl >= 0 ? "text-accent" : "text-destructive"}`}>
                  {formatCurrency(pnl)}
                </p>
                <Badge 
                  variant={pnl >= 0 ? "default" : "destructive"}
                  className={pnl >= 0 ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"}
                >
                  {pnl >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {pnlPercentage.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="holdings">Holdings ({holdings.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="space-y-3 mt-4">
          {holdings.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No crypto holdings yet</p>
                <p className="text-sm">Buy some crypto to start building your portfolio!</p>
              </CardContent>
            </Card>
          ) : (
            holdings.map((holding) => {
              const currentPrice = getPrice(holding.crypto_id);
              const currentValue = holding.amount * currentPrice;
              const costBasis = holding.amount * holding.avg_buy_price;
              const holdingPnl = currentValue - costBasis;
              const holdingPnlPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;

              return (
                <Card key={holding.id} className="bg-card/50 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getImage(holding.crypto_id)}
                          alt={holding.crypto_name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-semibold">{holding.crypto_name}</p>
                          <p className="text-sm text-muted-foreground uppercase">
                            {holding.amount.toFixed(6)} {holding.crypto_symbol}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(currentValue)}</p>
                        <div className="flex items-center justify-end gap-1">
                          <span className={`text-sm ${holdingPnl >= 0 ? "text-accent" : "text-destructive"}`}>
                            {holdingPnl >= 0 ? "+" : ""}{formatCurrency(holdingPnl)}
                          </span>
                          <Badge 
                            variant="secondary"
                            className={`text-xs ${holdingPnl >= 0 ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"}`}
                          >
                            {holdingPnl >= 0 ? "+" : ""}{holdingPnlPercent.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Avg Buy Price</p>
                        <p className="font-medium">{formatCurrency(holding.avg_buy_price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Price</p>
                        <p className="font-medium">{formatCurrency(currentPrice)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-4">
          {transactions.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
              </CardContent>
            </Card>
          ) : (
            transactions.map((tx) => (
              <Card key={tx.id} className="bg-card/50 border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={tx.transaction_type === "buy" ? "default" : "secondary"}
                        className={tx.transaction_type === "buy" 
                          ? "bg-accent/20 text-accent" 
                          : "bg-primary/20 text-primary"
                        }
                      >
                        {tx.transaction_type.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{tx.crypto_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.amount.toFixed(6)} {tx.crypto_symbol.toUpperCase()} @ {formatCurrency(tx.price_per_unit)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.transaction_type === "buy" ? "text-destructive" : "text-accent"}`}>
                        {tx.transaction_type === "buy" ? "-" : "+"}{formatCurrency(tx.total_cost)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
