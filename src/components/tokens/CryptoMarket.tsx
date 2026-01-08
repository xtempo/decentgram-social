import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, RefreshCw, Bitcoin, ExternalLink } from "lucide-react";
import { CryptoChart } from "./CryptoChart";

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

export const CryptoMarket = () => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const interval = setInterval(fetchCryptoData, 60000); // Refresh every minute
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bitcoin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Live Crypto Prices</h3>
            <p className="text-sm text-muted-foreground">Real-time market data</p>
          </div>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2">
          {selectedCrypto && (
            <Card className="bg-card/50 backdrop-blur border-border overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
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
        Data provided by CoinGecko API • Updates every minute
      </p>
    </div>
  );
};
