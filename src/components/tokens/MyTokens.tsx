import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TokenHolding {
  token_id: string;
  balance: number;
  token: {
    name: string;
    symbol: string;
    price_per_token: number;
  };
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  price_per_token: number;
  total_cost: number;
  created_at: string;
  token: {
    name: string;
    symbol: string;
  } | null;
}

interface MyTokensProps {
  userId: string;
}

export const MyTokens = ({ userId }: MyTokensProps) => {
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [createdTokens, setCreatedTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    // Fetch holdings with token details
    const { data: holdingsData } = await supabase
      .from("user_tokens")
      .select(`
        token_id,
        balance,
        token:tokens(name, symbol, price_per_token)
      `)
      .eq("user_id", userId)
      .gt("balance", 0);

    // Fetch transactions
    const { data: txData } = await supabase
      .from("token_transactions")
      .select(`
        id,
        transaction_type,
        amount,
        price_per_token,
        total_cost,
        created_at,
        token:tokens(name, symbol)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch tokens created by user
    const { data: createdData } = await supabase
      .from("tokens")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    // Transform holdings data to match interface
    const transformedHoldings = (holdingsData || []).map((h: any) => ({
      token_id: h.token_id,
      balance: h.balance,
      token: h.token,
    }));

    // Transform transactions data to match interface
    const transformedTx = (txData || []).map((t: any) => ({
      id: t.id,
      transaction_type: t.transaction_type,
      amount: t.amount,
      price_per_token: t.price_per_token,
      total_cost: t.total_cost,
      created_at: t.created_at,
      token: t.token,
    }));

    setHoldings(transformedHoldings);
    setTransactions(transformedTx);
    setCreatedTokens(createdData || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.balance * h.token.price_per_token, 0);

  return (
    <Tabs defaultValue="holdings" className="space-y-4">
      <TabsList>
        <TabsTrigger value="holdings">Holdings</TabsTrigger>
        <TabsTrigger value="created">Created Tokens</TabsTrigger>
        <TabsTrigger value="history">Transaction History</TabsTrigger>
      </TabsList>

      <TabsContent value="holdings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Portfolio Value</span>
              <span className="text-2xl text-primary">{totalValue.toFixed(4)} $GRAM</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {holdings.map((holding) => (
            <Card key={holding.token_id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{holding.token.name}</p>
                    <Badge variant="secondary">${holding.token.symbol}</Badge>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance:</span>
                    <span className="font-semibold">{holding.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-semibold text-primary">
                      {(holding.balance * holding.token.price_per_token).toFixed(4)} $GRAM
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {holdings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No token holdings yet</p>
            <p className="text-sm">Start by buying some tokens from the marketplace!</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="created" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {createdTokens.map((token) => (
            <Card key={token.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{token.name}</p>
                    <Badge variant="secondary">${token.symbol}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {token.description || "No description"}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Supply:</span>
                    <span>{token.total_supply.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Circulating:</span>
                    <span>{token.circulating_supply.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span>{token.price_per_token} $GRAM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {createdTokens.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tokens created yet</p>
            <p className="text-sm">Create your own token to launch your project!</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.transaction_type === "buy" || tx.transaction_type === "create"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {tx.transaction_type === "buy" || tx.transaction_type === "create" ? (
                        <ArrowDownRight className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {tx.transaction_type} {tx.token?.symbol || "Token"}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {tx.transaction_type === "create" ? "-" : tx.amount.toLocaleString()} tokens
                    </p>
                    <p className={`text-sm ${
                      tx.transaction_type === "sell" ? "text-green-500" : "text-red-500"
                    }`}>
                      {tx.transaction_type === "sell" ? "+" : "-"}{tx.total_cost.toFixed(4)} $GRAM
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {transactions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
