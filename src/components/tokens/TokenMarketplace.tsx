import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Coins, TrendingUp, TrendingDown, Search } from "lucide-react";
import { toast } from "sonner";

interface Token {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  logo_url: string | null;
  total_supply: number;
  circulating_supply: number;
  price_per_token: number;
  creator_id: string;
}

interface TokenMarketplaceProps {
  userId: string;
  gramBalance: number;
  onBalanceChange: (newBalance: number) => void;
  gramOnly?: boolean;
}

const GRAM_TOKEN_ID = "00000000-0000-0000-0000-000000000001";

export const TokenMarketplace = ({ userId, gramBalance, onBalanceChange, gramOnly = false }: TokenMarketplaceProps) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [userHoldings, setUserHoldings] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTokens();
    fetchUserHoldings();
  }, [gramOnly]);

  const fetchTokens = async () => {
    let query = supabase.from("tokens").select("*").order("circulating_supply", { ascending: false });
    
    if (gramOnly) {
      query = query.eq("id", GRAM_TOKEN_ID);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching tokens:", error);
      return;
    }
    setTokens(data || []);
    setLoading(false);
  };

  const fetchUserHoldings = async () => {
    const { data, error } = await supabase
      .from("user_tokens")
      .select("token_id, balance")
      .eq("user_id", userId);

    if (!error && data) {
      const holdings: Record<string, number> = {};
      data.forEach((h) => {
        holdings[h.token_id] = h.balance;
      });
      setUserHoldings(holdings);
    }
  };

  const handleTrade = async () => {
    if (!selectedToken || !amount || parseInt(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const tokenAmount = parseInt(amount);
    const totalCost = tokenAmount * selectedToken.price_per_token;

    setProcessing(true);

    try {
      if (tradeType === "buy") {
        // Check if user has enough GRAM
        if (gramBalance < totalCost) {
          toast.error("Insufficient $GRAM balance");
          setProcessing(false);
          return;
        }

        // Deduct GRAM from user
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ token_balance: gramBalance - totalCost })
          .eq("user_id", userId);

        if (updateError) throw updateError;

        // Add/Update user token holdings
        const existingBalance = userHoldings[selectedToken.id] || 0;
        const { error: holdingsError } = await supabase
          .from("user_tokens")
          .upsert({
            user_id: userId,
            token_id: selectedToken.id,
            balance: existingBalance + tokenAmount,
          }, { onConflict: "user_id,token_id" });

        if (holdingsError) throw holdingsError;

        // Update circulating supply
        await supabase
          .from("tokens")
          .update({ circulating_supply: selectedToken.circulating_supply + tokenAmount })
          .eq("id", selectedToken.id);

        // Record transaction
        await supabase.from("token_transactions").insert({
          user_id: userId,
          token_id: selectedToken.id,
          transaction_type: "buy",
          amount: tokenAmount,
          price_per_token: selectedToken.price_per_token,
          total_cost: totalCost,
        });

        onBalanceChange(gramBalance - totalCost);
        toast.success(`Successfully bought ${tokenAmount} ${selectedToken.symbol}!`);
      } else {
        // Sell tokens
        const userBalance = userHoldings[selectedToken.id] || 0;
        if (userBalance < tokenAmount) {
          toast.error(`Insufficient ${selectedToken.symbol} balance`);
          setProcessing(false);
          return;
        }

        // Add GRAM to user
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ token_balance: gramBalance + totalCost })
          .eq("user_id", userId);

        if (updateError) throw updateError;

        // Update user token holdings
        const { error: holdingsError } = await supabase
          .from("user_tokens")
          .update({ balance: userBalance - tokenAmount })
          .eq("user_id", userId)
          .eq("token_id", selectedToken.id);

        if (holdingsError) throw holdingsError;

        // Update circulating supply
        await supabase
          .from("tokens")
          .update({ circulating_supply: Math.max(0, selectedToken.circulating_supply - tokenAmount) })
          .eq("id", selectedToken.id);

        // Record transaction
        await supabase.from("token_transactions").insert({
          user_id: userId,
          token_id: selectedToken.id,
          transaction_type: "sell",
          amount: tokenAmount,
          price_per_token: selectedToken.price_per_token,
          total_cost: totalCost,
        });

        onBalanceChange(gramBalance + totalCost);
        toast.success(`Successfully sold ${tokenAmount} ${selectedToken.symbol}!`);
      }

      setSelectedToken(null);
      setAmount("");
      fetchTokens();
      fetchUserHoldings();
    } catch (error) {
      console.error("Trade error:", error);
      toast.error("Transaction failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!gramOnly && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTokens.map((token) => (
          <Card key={token.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Coins className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{token.name}</CardTitle>
                    <Badge variant="secondary">${token.symbol}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {token.description || "No description available"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-semibold">{token.price_per_token} $GRAM</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Supply</p>
                  <p className="font-semibold">{token.circulating_supply.toLocaleString()}</p>
                </div>
                {userHoldings[token.id] > 0 && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Your Balance</p>
                    <p className="font-semibold text-primary">{userHoldings[token.id].toLocaleString()} ${token.symbol}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedToken(token);
                    setTradeType("buy");
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Buy
                </Button>
                <Button
                  onClick={() => {
                    setSelectedToken(token);
                    setTradeType("sell");
                  }}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                  size="sm"
                  disabled={!userHoldings[token.id]}
                >
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Sell
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTokens.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tokens found</p>
        </div>
      )}

      <Dialog open={!!selectedToken} onOpenChange={() => setSelectedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeType === "buy" ? "Buy" : "Sell"} {selectedToken?.symbol}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>
            {amount && selectedToken && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Price per token:</span>
                  <span>{selectedToken.price_per_token} $GRAM</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total {tradeType === "buy" ? "Cost" : "Receive"}:</span>
                  <span>{(parseInt(amount) * selectedToken.price_per_token).toFixed(4)} $GRAM</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Your $GRAM balance:</span>
                  <span>{gramBalance.toLocaleString()}</span>
                </div>
                {tradeType === "sell" && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Your {selectedToken.symbol} balance:</span>
                    <span>{(userHoldings[selectedToken.id] || 0).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedToken(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleTrade}
              disabled={processing || !amount}
              className={tradeType === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {processing ? "Processing..." : tradeType === "buy" ? "Buy" : "Sell"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
