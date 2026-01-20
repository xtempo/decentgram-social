import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Target, X, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LimitOrder {
  id: string;
  crypto_id: string;
  crypto_symbol: string;
  crypto_name: string;
  order_type: string;
  amount: number;
  target_price: number;
  total_cost: number;
  status: string;
  created_at: string;
  executed_at: string | null;
}

interface CryptoPrice {
  id: string;
  current_price: number;
  image: string;
  name: string;
  symbol: string;
}

interface LimitOrdersProps {
  userId: string;
  cryptoPrices: CryptoPrice[];
  gramBalance: number;
  onBalanceChange?: (newBalance: number) => void;
  onOrderExecuted?: () => void;
}

// Virtual exchange rate: 1 $GRAM = $0.10 USD
const GRAM_TO_USD_RATE = 0.10;

export const LimitOrders = ({ 
  userId, 
  cryptoPrices, 
  gramBalance, 
  onBalanceChange,
  onOrderExecuted 
}: LimitOrdersProps) => {
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoPrice | null>(null);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("virtual_limit_orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setOrders(data.map(o => ({
          ...o,
          amount: Number(o.amount),
          target_price: Number(o.target_price),
          total_cost: Number(o.total_cost)
        })));
      }
    } catch (error) {
      console.error("Error fetching limit orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  // Check and execute orders when prices change
  useEffect(() => {
    const checkOrders = async () => {
      const pendingOrders = orders.filter(o => o.status === "pending");
      
      for (const order of pendingOrders) {
        const currentPrice = cryptoPrices.find(c => c.id === order.crypto_id)?.current_price;
        if (!currentPrice) continue;

        let shouldExecute = false;
        
        if (order.order_type === "buy" && currentPrice <= order.target_price) {
          shouldExecute = true;
        } else if (order.order_type === "sell" && currentPrice >= order.target_price) {
          shouldExecute = true;
        }

        if (shouldExecute) {
          await executeOrder(order, currentPrice);
        }
      }
    };

    if (orders.length > 0 && cryptoPrices.length > 0) {
      checkOrders();
    }
  }, [cryptoPrices, orders]);

  const calculateGramCost = (usdAmount: number) => {
    return Math.ceil(usdAmount / GRAM_TO_USD_RATE);
  };

  const executeOrder = async (order: LimitOrder, currentPrice: number) => {
    try {
      const gramCost = calculateGramCost(order.amount * currentPrice);

      if (order.order_type === "buy") {
        // Check balance
        if (gramCost > gramBalance) {
          toast.error(`Limit order cancelled: Insufficient $GRAM for ${order.crypto_symbol.toUpperCase()}`);
          await supabase
            .from("virtual_limit_orders")
            .update({ status: "cancelled" })
            .eq("id", order.id);
          fetchOrders();
          return;
        }

        // Get existing holding
        const { data: existingHolding } = await supabase
          .from("virtual_crypto_holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("crypto_id", order.crypto_id)
          .maybeSingle();

        if (existingHolding) {
          const existingAmount = Number(existingHolding.amount);
          const existingAvgPrice = Number(existingHolding.avg_buy_price);
          const newTotalAmount = existingAmount + order.amount;
          const newAvgPrice = ((existingAmount * existingAvgPrice) + (order.amount * currentPrice)) / newTotalAmount;

          await supabase
            .from("virtual_crypto_holdings")
            .update({
              amount: newTotalAmount,
              avg_buy_price: newAvgPrice
            })
            .eq("id", existingHolding.id);
        } else {
          await supabase
            .from("virtual_crypto_holdings")
            .insert({
              user_id: userId,
              crypto_id: order.crypto_id,
              crypto_symbol: order.crypto_symbol,
              crypto_name: order.crypto_name,
              amount: order.amount,
              avg_buy_price: currentPrice
            });
        }

        // Record transaction
        await supabase
          .from("virtual_crypto_transactions")
          .insert({
            user_id: userId,
            crypto_id: order.crypto_id,
            crypto_symbol: order.crypto_symbol,
            crypto_name: order.crypto_name,
            transaction_type: "buy",
            amount: order.amount,
            price_per_unit: currentPrice,
            total_cost: order.amount * currentPrice
          });

        // Deduct $GRAM
        const newBalance = gramBalance - gramCost;
        await supabase
          .from("profiles")
          .update({ token_balance: newBalance })
          .eq("user_id", userId);

        onBalanceChange?.(newBalance);
        toast.success(`Limit order executed: Bought ${order.amount} ${order.crypto_symbol.toUpperCase()}`);
      } else {
        // Sell order
        const { data: holding } = await supabase
          .from("virtual_crypto_holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("crypto_id", order.crypto_id)
          .maybeSingle();

        if (!holding || Number(holding.amount) < order.amount) {
          toast.error(`Limit order cancelled: Insufficient ${order.crypto_symbol.toUpperCase()}`);
          await supabase
            .from("virtual_limit_orders")
            .update({ status: "cancelled" })
            .eq("id", order.id);
          fetchOrders();
          return;
        }

        const newAmount = Number(holding.amount) - order.amount;

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
            crypto_id: order.crypto_id,
            crypto_symbol: order.crypto_symbol,
            crypto_name: order.crypto_name,
            transaction_type: "sell",
            amount: order.amount,
            price_per_unit: currentPrice,
            total_cost: order.amount * currentPrice
          });

        // Add $GRAM
        const newBalance = gramBalance + gramCost;
        await supabase
          .from("profiles")
          .update({ token_balance: newBalance })
          .eq("user_id", userId);

        onBalanceChange?.(newBalance);
        toast.success(`Limit order executed: Sold ${order.amount} ${order.crypto_symbol.toUpperCase()}`);
      }

      // Mark order as executed
      await supabase
        .from("virtual_limit_orders")
        .update({ 
          status: "executed",
          executed_at: new Date().toISOString()
        })
        .eq("id", order.id);

      fetchOrders();
      onOrderExecuted?.();
    } catch (error) {
      console.error("Error executing order:", error);
    }
  };

  const createOrder = async () => {
    if (!selectedCrypto || !amount || !targetPrice) return;

    const amountNum = parseFloat(amount);
    const targetPriceNum = parseFloat(targetPrice);
    
    if (isNaN(amountNum) || amountNum <= 0 || isNaN(targetPriceNum) || targetPriceNum <= 0) {
      toast.error("Please enter valid amount and target price");
      return;
    }

    const totalUsd = amountNum * targetPriceNum;
    const gramCost = calculateGramCost(totalUsd);

    // For buy orders, check if user has enough balance reserved
    if (orderType === "buy" && gramCost > gramBalance) {
      toast.error(`Insufficient $GRAM balance. Need ${gramCost} $GRAM`);
      return;
    }

    // For sell orders, check if user has enough crypto
    if (orderType === "sell") {
      const { data: holding } = await supabase
        .from("virtual_crypto_holdings")
        .select("amount")
        .eq("user_id", userId)
        .eq("crypto_id", selectedCrypto.id)
        .maybeSingle();

      if (!holding || Number(holding.amount) < amountNum) {
        toast.error(`Insufficient ${selectedCrypto.symbol.toUpperCase()} balance`);
        return;
      }
    }

    setCreating(true);

    try {
      const { error } = await supabase
        .from("virtual_limit_orders")
        .insert({
          user_id: userId,
          crypto_id: selectedCrypto.id,
          crypto_symbol: selectedCrypto.symbol,
          crypto_name: selectedCrypto.name,
          order_type: orderType,
          amount: amountNum,
          target_price: targetPriceNum,
          total_cost: totalUsd,
          status: "pending"
        });

      if (error) throw error;

      toast.success(`Limit ${orderType} order created for ${selectedCrypto.name}`);
      setShowCreateDialog(false);
      setAmount("");
      setTargetPrice("");
      fetchOrders();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create limit order");
    } finally {
      setCreating(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await supabase
        .from("virtual_limit_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      toast.success("Order cancelled");
      fetchOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    }
  };

  const openCreateDialog = (crypto: CryptoPrice, type: "buy" | "sell") => {
    setSelectedCrypto(crypto);
    setOrderType(type);
    setTargetPrice(crypto.current_price.toString());
    setAmount("");
    setShowCreateDialog(true);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1) {
      return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
    }
    return "$" + value.toFixed(6);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getImage = (cryptoId: string) => {
    return cryptoPrices.find(c => c.id === cryptoId)?.image || "";
  };

  const getCurrentPrice = (cryptoId: string) => {
    return cryptoPrices.find(c => c.id === cryptoId)?.current_price || 0;
  };

  const pendingOrders = orders.filter(o => o.status === "pending");
  const completedOrders = orders.filter(o => o.status !== "pending");

  const totalCostUsd = parseFloat(amount || "0") * parseFloat(targetPrice || "0");
  const totalCostGram = calculateGramCost(totalCostUsd);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Limit Order */}
      <Card className="bg-card/50 backdrop-blur border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Create Limit Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set a target price to automatically buy or sell when the market reaches your price.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cryptoPrices.slice(0, 8).map((crypto) => (
              <div key={crypto.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm">
                  <img src={crypto.image} alt={crypto.name} className="w-5 h-5 rounded-full" />
                  <span className="font-medium truncate">{crypto.symbol.toUpperCase()}</span>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-xs h-7"
                    onClick={() => openCreateDialog(crypto, "buy")}
                  >
                    Buy
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-xs h-7"
                    onClick={() => openCreateDialog(crypto, "sell")}
                  >
                    Sell
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Pending Orders ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOrders.map((order) => {
              const currentPrice = getCurrentPrice(order.crypto_id);
              const priceDiff = order.order_type === "buy" 
                ? currentPrice - order.target_price
                : order.target_price - currentPrice;
              const priceDiffPercent = currentPrice > 0 
                ? (Math.abs(priceDiff) / currentPrice) * 100 
                : 0;
              const willExecute = priceDiff <= 0;

              return (
                <div 
                  key={order.id} 
                  className={`p-4 rounded-lg border ${willExecute ? 'border-accent bg-accent/10' : 'border-border bg-secondary/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={getImage(order.crypto_id)}
                        alt={order.crypto_name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={order.order_type === "buy" ? "default" : "secondary"}
                            className={order.order_type === "buy" 
                              ? "bg-accent/20 text-accent" 
                              : "bg-primary/20 text-primary"
                            }
                          >
                            {order.order_type.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{order.crypto_name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.amount.toFixed(6)} @ {formatCurrency(order.target_price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current</p>
                        <p className="font-medium">{formatCurrency(currentPrice)}</p>
                        <p className={`text-xs ${willExecute ? 'text-accent' : 'text-muted-foreground'}`}>
                          {willExecute ? 'Ready to execute!' : `${priceDiffPercent.toFixed(2)}% away`}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => cancelOrder(order.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
              Order History ({completedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedOrders.slice(0, 10).map((order) => (
              <div 
                key={order.id} 
                className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={getImage(order.crypto_id)}
                    alt={order.crypto_name}
                    className="w-6 h-6 rounded-full opacity-70"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={order.status === "executed" 
                          ? "border-accent text-accent" 
                          : "border-destructive text-destructive"
                        }
                      >
                        {order.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm">{order.order_type.toUpperCase()} {order.crypto_symbol.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.amount.toFixed(6)} @ {formatCurrency(order.target_price)}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {formatDate(order.executed_at || order.created_at)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {orders.length === 0 && (
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No limit orders yet</p>
            <p className="text-sm">Create a limit order to buy or sell at your target price</p>
          </CardContent>
        </Card>
      )}

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                  Limit {orderType === "buy" ? "Buy" : "Sell"} {selectedCrypto.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={orderType === "buy" ? "default" : "outline"}
                className={orderType === "buy" ? "flex-1 bg-accent hover:bg-accent/80" : "flex-1"}
                onClick={() => setOrderType("buy")}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Buy
              </Button>
              <Button
                variant={orderType === "sell" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setOrderType("sell")}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Sell
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">Amount ({selectedCrypto?.symbol.toUpperCase()})</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.000001"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Target Price (USD)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                min="0"
                step="0.01"
                className="mt-1"
              />
              {selectedCrypto && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current price: {formatCurrency(selectedCrypto.current_price)}
                </p>
              )}
            </div>

            {selectedCrypto && amount && targetPrice && (
              <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Type</span>
                  <span className="capitalize">{orderType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target Price</span>
                  <span>{formatCurrency(parseFloat(targetPrice))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total USD Value</span>
                  <span>{formatCurrency(totalCostUsd)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span>{orderType === "buy" ? "Cost" : "You'll Receive"}</span>
                  <span className={orderType === "buy" ? "text-destructive" : "text-accent"}>
                    {totalCostGram.toLocaleString()} $GRAM
                  </span>
                </div>
                {orderType === "buy" && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Your Balance</span>
                    <span className={gramBalance < totalCostGram ? "text-destructive" : ""}>
                      {gramBalance.toLocaleString()} $GRAM
                    </span>
                  </div>
                )}

                <div className="mt-2 p-2 rounded bg-primary/10 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {orderType === "buy" 
                      ? `Order will execute when price drops to or below ${formatCurrency(parseFloat(targetPrice))}`
                      : `Order will execute when price rises to or above ${formatCurrency(parseFloat(targetPrice))}`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createOrder}
              disabled={creating || !amount || !targetPrice || parseFloat(amount) <= 0 || parseFloat(targetPrice) <= 0}
              className={orderType === "buy" ? "bg-accent hover:bg-accent/80" : ""}
            >
              {creating ? "Creating..." : `Create ${orderType === "buy" ? "Buy" : "Sell"} Order`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};