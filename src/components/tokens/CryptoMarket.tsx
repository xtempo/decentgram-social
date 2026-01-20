import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, RefreshCw, Bitcoin, Wallet } from "lucide-react";
import { CryptoChart } from "./CryptoChart";
import { CryptoPortfolio } from "./CryptoPortfolio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  sparkline_in_7d: { price: number[] };
}

interface CryptoMarketProps {
  userId?: string;
  gramBalance?: number;
  onBalanceChange?: (newBalance: number) => void;
}

const CRYPTO_ICONS: Record<string, string> = {
  bitcoin: "₿",
  ethereum: "Ξ",
  tether: "₮",
  "usd-coin": "$",
  binancecoin: "BNB",
  ripple: "XRP",
  cardano: "ADA",
  solana: "SOL",
  dogecoin: "Ð",
  polkadot: "DOT",
};

// Virtual exchange rate: 1 $GRAM = $0.10 USD
const GRAM_TO_USD_RATE = 0.10;

export const CryptoMarket = ({ userId, gramBalance = 0, onBalanceChange }: CryptoMarketProps) => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [portfolioKey, setPortfolioKey] = useState(0);

  const fetchCryptoData = async () => {
    try {
      setError(null);
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=7d"
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch crypto data");
      }
      
      const data = await response.json();
      setCryptos(data);
      if (data.length > 0 && !selectedCrypto) {
        setSelectedCrypto(data[0]);
      }
    } catch (err) {
      setError("Unable to load crypto prices. Please try again later.");
      console.error("Error fetching crypto data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCryptoData();
  };

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return price.toLocaleString("en-US", { style: "currency", currency: "USD" });
    }
    return "$" + price.toFixed(6);
  };

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    return `$${vol.toLocaleString()}`;
  };

  const openTradeDialog = (type: "buy" | "sell", crypto: CryptoData) => {
    if (!userId) {
      toast.error("Please log in to trade");
      return;
    }
    setSelectedCrypto(crypto);
    setTradeType(type);
    setTradeAmount("");
    setShowTradeDialog(true);
  };

  const calculateGramCost = (usdAmount: number) => {
    return Math.ceil(usdAmount / GRAM_TO_USD_RATE);
  };

  const handleTrade = async () => {
    if (!selectedCrypto || !userId || !tradeAmount) return;

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalUsd = amount * selectedCrypto.current_price;
    const gramCost = calculateGramCost(totalUsd);

    setProcessing(true);

    try {
      if (tradeType === "buy") {
        // Check if user has enough $GRAM
        if (gramCost > gramBalance) {
          toast.error(`Insufficient $GRAM balance. Need ${gramCost} $GRAM`);
          setProcessing(false);
          return;
        }

        // Get existing holding
        const { data: existingHolding } = await supabase
          .from("virtual_crypto_holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("crypto_id", selectedCrypto.id)
          .maybeSingle();

        if (existingHolding) {
          // Update existing holding with new average price
          const existingAmount = Number(existingHolding.amount);
          const existingAvgPrice = Number(existingHolding.avg_buy_price);
          const newTotalAmount = existingAmount + amount;
          const newAvgPrice = ((existingAmount * existingAvgPrice) + (amount * selectedCrypto.current_price)) / newTotalAmount;

          await supabase
            .from("virtual_crypto_holdings")
            .update({
              amount: newTotalAmount,
              avg_buy_price: newAvgPrice
            })
            .eq("id", existingHolding.id);
        } else {
          // Create new holding
          await supabase
            .from("virtual_crypto_holdings")
            .insert({
              user_id: userId,
              crypto_id: selectedCrypto.id,
              crypto_symbol: selectedCrypto.symbol,
              crypto_name: selectedCrypto.name,
              amount: amount,
              avg_buy_price: selectedCrypto.current_price
            });
        }

        // Record transaction
        await supabase
          .from("virtual_crypto_transactions")
          .insert({
            user_id: userId,
            crypto_id: selectedCrypto.id,
            crypto_symbol: selectedCrypto.symbol,
            crypto_name: selectedCrypto.name,
            transaction_type: "buy",
            amount: amount,
            price_per_unit: selectedCrypto.current_price,
            total_cost: totalUsd
          });

        // Deduct $GRAM
        const newBalance = gramBalance - gramCost;
        await supabase
          .from("profiles")
          .update({ token_balance: newBalance })
          .eq("user_id", userId);

        onBalanceChange?.(newBalance);
        toast.success(`Bought ${amount} ${selectedCrypto.symbol.toUpperCase()} for ${gramCost} $GRAM`);
      } else {
        // Sell - check if user has enough crypto
        const { data: holding } = await supabase
          .from("virtual_crypto_holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("crypto_id", selectedCrypto.id)
          .maybeSingle();

        if (!holding || Number(holding.amount) < amount) {
          toast.error(`Insufficient ${selectedCrypto.symbol.toUpperCase()} balance`);
          setProcessing(false);
          return;
        }

        const newAmount = Number(holding.amount) - amount;

        if (newAmount <= 0) {
          await supabase
            .from("virtual_crypto_holdings")
            .delete()
            .eq("id", holding.id);
        } else {
          await supabase
            .from("virtual_crypto_holdings")
            .update({ amount: newAmount })
            .eq("id", holding.id);
        }

        // Record transaction
        await supabase
          .from("virtual_crypto_transactions")
          .insert({
            user_id: userId,
            crypto_id: selectedCrypto.id,
            crypto_symbol: selectedCrypto.symbol,
            crypto_name: selectedCrypto.name,
            transaction_type: "sell",
            amount: amount,
            price_per_unit: selectedCrypto.current_price,
            total_cost: totalUsd
          });

        // Add $GRAM
        const newBalance = gramBalance + gramCost;
        await supabase
          .from("profiles")
          .update({ token_balance: newBalance })
          .eq("user_id", userId);

        onBalanceChange?.(newBalance);
        toast.success(`Sold ${amount} ${selectedCrypto.symbol.toUpperCase()} for ${gramCost} $GRAM`);
      }

      setShowTradeDialog(false);
      setPortfolioKey(prev => prev + 1);
    } catch (error) {
      console.error("Trade error:", error);
      toast.error("Trade failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tradeUsdAmount = parseFloat(tradeAmount || "0") * (selectedCrypto?.current_price || 0);
  const tradeGramCost = calculateGramCost(tradeUsdAmount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bitcoin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Live Crypto Prices</h3>
            <p className="text-sm text-muted-foreground">Trade with virtual $GRAM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userId && (
            <Button 
              variant={showPortfolio ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPortfolio(!showPortfolio)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Portfolio
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Portfolio Section */}
      {showPortfolio && userId && (
        <CryptoPortfolio 
          key={portfolioKey}
          userId={userId}
          cryptoPrices={cryptos.map(c => ({ id: c.id, current_price: c.current_price, image: c.image }))}
          onRefresh={() => setPortfolioKey(prev => prev + 1)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2">
          {selectedCrypto && (
            <Card className="bg-card/50 backdrop-blur border-border overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedCrypto.image} 
                      alt={selectedCrypto.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <CardTitle className="text-xl">{selectedCrypto.name}</CardTitle>
                      <p className="text-sm text-muted-foreground uppercase">{selectedCrypto.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatPrice(selectedCrypto.current_price)}</p>
                    <Badge 
                      variant={selectedCrypto.price_change_percentage_24h >= 0 ? "default" : "destructive"}
                      className={selectedCrypto.price_change_percentage_24h >= 0 
                        ? "bg-accent/20 text-accent" 
                        : "bg-destructive/20 text-destructive"
                      }
                    >
                      {selectedCrypto.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {selectedCrypto.price_change_percentage_24h?.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CryptoChart 
                  data={selectedCrypto.sparkline_in_7d?.price || []}
                  priceChange={selectedCrypto.price_change_percentage_7d_in_currency}
                />
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Cap</p>
                    <p className="font-semibold">{formatMarketCap(selectedCrypto.market_cap)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">24h Volume</p>
                    <p className="font-semibold">{formatVolume(selectedCrypto.total_volume)}</p>
                  </div>
                </div>
                {userId && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button 
                      className="flex-1 bg-accent hover:bg-accent/80"
                      onClick={() => openTradeDialog("buy", selectedCrypto)}
                    >
                      Buy {selectedCrypto.symbol.toUpperCase()}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => openTradeDialog("sell", selectedCrypto)}
                    >
                      Sell {selectedCrypto.symbol.toUpperCase()}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Crypto List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {cryptos.map((crypto, index) => (
            <Card 
              key={crypto.id}
              className={`bg-card/50 backdrop-blur border-border cursor-pointer transition-all hover:bg-card/80 hover:border-primary/50 ${
                selectedCrypto?.id === crypto.id ? "border-primary bg-card/80" : ""
              }`}
              onClick={() => setSelectedCrypto(crypto)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-5">{index + 1}</span>
                    <img 
                      src={crypto.image} 
                      alt={crypto.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{crypto.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{crypto.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(crypto.current_price)}</p>
                    <p className={`text-xs flex items-center justify-end ${
                      crypto.price_change_percentage_24h >= 0 ? "text-accent" : "text-destructive"
                    }`}>
                      {crypto.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {crypto.price_change_percentage_24h?.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stablecoins Section */}
      <Card className="bg-card/50 backdrop-blur border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-xl">$</span>
            Stablecoins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cryptos
              .filter(c => ["tether", "usd-coin", "dai", "busd", "tusd", "usdd", "frax"].includes(c.id))
              .slice(0, 4)
              .map((stable) => (
                <div 
                  key={stable.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedCrypto(stable)}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={stable.image} 
                      alt={stable.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{stable.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{stable.symbol}</p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatPrice(stable.current_price)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Data provided by CoinGecko API • 1 $GRAM = $0.10 USD (virtual trading)
      </p>

      {/* Trade Dialog */}
      <Dialog open={showTradeDialog} onOpenChange={setShowTradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCrypto && (
                <>
                  <img 
                    src={selectedCrypto.image} 
                    alt={selectedCrypto.name}
                    className="w-6 h-6 rounded-full"
                  />
                  {tradeType === "buy" ? "Buy" : "Sell"} {selectedCrypto.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Amount ({selectedCrypto?.symbol.toUpperCase()})</label>
              <Input
                type="number"
                placeholder="0.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                min="0"
                step="0.000001"
                className="mt-1"
              />
            </div>
            
            {selectedCrypto && tradeAmount && (
              <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per {selectedCrypto.symbol.toUpperCase()}</span>
                  <span>{formatPrice(selectedCrypto.current_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">USD Value</span>
                  <span>{formatPrice(tradeUsdAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span>{tradeType === "buy" ? "Cost" : "You'll Receive"}</span>
                  <span className={tradeType === "buy" ? "text-destructive" : "text-accent"}>
                    {tradeGramCost.toLocaleString()} $GRAM
                  </span>
                </div>
                {tradeType === "buy" && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Your Balance</span>
                    <span className={gramBalance < tradeGramCost ? "text-destructive" : ""}>
                      {gramBalance.toLocaleString()} $GRAM
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTradeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTrade}
              disabled={processing || !tradeAmount || parseFloat(tradeAmount) <= 0}
              className={tradeType === "buy" ? "bg-accent hover:bg-accent/80" : ""}
            >
              {processing ? "Processing..." : `${tradeType === "buy" ? "Buy" : "Sell"} Now`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};