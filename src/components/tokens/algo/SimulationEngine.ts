// Client-side simulation engine for algo trading strategies

export interface SimulationResult {
  trades: SimTrade[];
  totalPnL: number;
  winRate: number;
  totalTrades: number;
}

export interface SimTrade {
  type: "buy" | "sell";
  price: number;
  amount: number;
  gramCost: number;
  timestamp: string;
  reason: string;
}

const GRAM_TO_USD = 0.10;

export function simulateGridTrading(
  currentPrice: number,
  config: Record<string, any>
): SimulationResult {
  const upper = parseFloat(config.upperPrice);
  const lower = parseFloat(config.lowerPrice);
  const gridCount = parseInt(config.gridCount);
  const investment = parseFloat(config.investmentAmount);

  const gridSpacing = (upper - lower) / gridCount;
  const amountPerGrid = (investment * GRAM_TO_USD) / gridCount / currentPrice;
  const trades: SimTrade[] = [];

  // Simulate grid orders around current price
  for (let i = 0; i < gridCount; i++) {
    const gridPrice = lower + gridSpacing * i;
    if (gridPrice < currentPrice) {
      // Buy orders below current price
      trades.push({
        type: "buy",
        price: gridPrice,
        amount: amountPerGrid,
        gramCost: Math.ceil((amountPerGrid * gridPrice) / GRAM_TO_USD),
        timestamp: new Date(Date.now() - (gridCount - i) * 3600000).toISOString(),
        reason: `Grid buy at $${gridPrice.toFixed(2)}`,
      });
    }
    if (gridPrice + gridSpacing <= upper && gridPrice > currentPrice) {
      // Sell orders above current price
      const sellPrice = gridPrice;
      const profit = (sellPrice - (gridPrice - gridSpacing)) * amountPerGrid;
      trades.push({
        type: "sell",
        price: sellPrice,
        amount: amountPerGrid,
        gramCost: Math.ceil((amountPerGrid * sellPrice) / GRAM_TO_USD),
        timestamp: new Date(Date.now() - (gridCount - i) * 3600000).toISOString(),
        reason: `Grid sell at $${sellPrice.toFixed(2)} (profit: $${profit.toFixed(2)})`,
      });
    }
  }

  const totalPnL = trades
    .filter((t) => t.type === "sell")
    .reduce((sum, t) => sum + t.gramCost * 0.02, 0); // ~2% profit per grid cycle

  return {
    trades,
    totalPnL: Math.round(totalPnL),
    winRate: 68,
    totalTrades: trades.length,
  };
}

export function simulateDCA(
  currentPrice: number,
  config: Record<string, any>
): SimulationResult {
  const perOrder = parseFloat(config.investmentPerOrder);
  const intervalH = parseFloat(config.intervalHours);
  const totalOrders = parseInt(config.totalOrders);

  const trades: SimTrade[] = [];
  let totalSpent = 0;
  let totalAmount = 0;

  for (let i = 0; i < totalOrders; i++) {
    // Simulate price variation ±5%
    const priceVariation = 1 + (Math.sin(i * 0.7) * 0.05);
    const price = currentPrice * priceVariation;
    const usdAmount = perOrder * GRAM_TO_USD;
    const cryptoAmount = usdAmount / price;

    totalSpent += perOrder;
    totalAmount += cryptoAmount;

    trades.push({
      type: "buy",
      price,
      amount: cryptoAmount,
      gramCost: perOrder,
      timestamp: new Date(Date.now() - (totalOrders - i) * intervalH * 3600000).toISOString(),
      reason: `DCA buy #${i + 1}`,
    });
  }

  const avgPrice = (totalSpent * GRAM_TO_USD) / totalAmount;
  const currentValue = Math.ceil((totalAmount * currentPrice) / GRAM_TO_USD);
  const totalPnL = currentValue - totalSpent;

  return {
    trades,
    totalPnL: Math.round(totalPnL),
    winRate: totalPnL > 0 ? 100 : 0,
    totalTrades: trades.length,
  };
}

export function simulateRSI(
  currentPrice: number,
  config: Record<string, any>
): SimulationResult {
  const buyThreshold = parseFloat(config.rsiBuyThreshold) || 30;
  const sellThreshold = parseFloat(config.rsiSellThreshold) || 70;
  const tradeAmt = parseFloat(config.tradeAmount);

  const trades: SimTrade[] = [];
  let holding = 0;
  let avgBuyPrice = 0;
  let totalPnL = 0;
  let wins = 0;

  // Simulate 20 RSI readings
  for (let i = 0; i < 20; i++) {
    const rsi = 30 + Math.sin(i * 0.8) * 35 + Math.random() * 10;
    const priceVar = 1 + Math.sin(i * 0.5) * 0.08;
    const price = currentPrice * priceVar;

    if (rsi < buyThreshold && holding === 0) {
      const usd = tradeAmt * GRAM_TO_USD;
      holding = usd / price;
      avgBuyPrice = price;
      trades.push({
        type: "buy",
        price,
        amount: holding,
        gramCost: tradeAmt,
        timestamp: new Date(Date.now() - (20 - i) * 4 * 3600000).toISOString(),
        reason: `RSI ${rsi.toFixed(1)} < ${buyThreshold} (oversold)`,
      });
    } else if (rsi > sellThreshold && holding > 0) {
      const sellValue = Math.ceil((holding * price) / GRAM_TO_USD);
      const pnl = sellValue - tradeAmt;
      totalPnL += pnl;
      if (pnl > 0) wins++;

      trades.push({
        type: "sell",
        price,
        amount: holding,
        gramCost: sellValue,
        timestamp: new Date(Date.now() - (20 - i) * 4 * 3600000).toISOString(),
        reason: `RSI ${rsi.toFixed(1)} > ${sellThreshold} (overbought) P&L: ${pnl > 0 ? "+" : ""}${pnl}`,
      });
      holding = 0;
    }
  }

  const sellTrades = trades.filter((t) => t.type === "sell").length;

  return {
    trades,
    totalPnL: Math.round(totalPnL),
    winRate: sellTrades > 0 ? Math.round((wins / sellTrades) * 100) : 0,
    totalTrades: trades.length,
  };
}

export function simulateCopyTrading(
  currentPrice: number,
  config: Record<string, any>
): SimulationResult {
  const maxSize = parseFloat(config.maxTradeSize);
  const ratio = parseFloat(config.copyRatio) / 100;

  const trades: SimTrade[] = [];
  let totalPnL = 0;
  let wins = 0;

  // Simulate copying 8 trades from "top trader"
  const traderActions = [
    { type: "buy" as const, priceOffset: -0.02, reason: "Copied: breakout buy" },
    { type: "sell" as const, priceOffset: 0.03, reason: "Copied: take profit" },
    { type: "buy" as const, priceOffset: -0.04, reason: "Copied: dip buy" },
    { type: "sell" as const, priceOffset: 0.01, reason: "Copied: partial exit" },
    { type: "buy" as const, priceOffset: -0.01, reason: "Copied: support bounce" },
    { type: "sell" as const, priceOffset: 0.05, reason: "Copied: swing target hit" },
    { type: "buy" as const, priceOffset: -0.03, reason: "Copied: accumulation" },
    { type: "sell" as const, priceOffset: 0.02, reason: "Copied: resistance sell" },
  ];

  for (let i = 0; i < traderActions.length; i++) {
    const action = traderActions[i];
    const price = currentPrice * (1 + action.priceOffset);
    const gramAmt = Math.min(maxSize, maxSize * ratio);
    const usd = gramAmt * GRAM_TO_USD;
    const amount = usd / price;

    if (action.type === "sell") {
      const pnl = Math.round(gramAmt * 0.03);
      totalPnL += pnl;
      if (pnl > 0) wins++;
    }

    trades.push({
      type: action.type,
      price,
      amount,
      gramCost: gramAmt,
      timestamp: new Date(Date.now() - (8 - i) * 6 * 3600000).toISOString(),
      reason: action.reason,
    });
  }

  const sellCount = trades.filter((t) => t.type === "sell").length;

  return {
    trades,
    totalPnL: Math.round(totalPnL),
    winRate: sellCount > 0 ? Math.round((wins / sellCount) * 100) : 0,
    totalTrades: trades.length,
  };
}

export function runSimulation(
  strategyType: string,
  currentPrice: number,
  config: Record<string, any>
): SimulationResult {
  switch (strategyType) {
    case "grid":
      return simulateGridTrading(currentPrice, config);
    case "dca":
      return simulateDCA(currentPrice, config);
    case "rsi":
      return simulateRSI(currentPrice, config);
    case "copy":
      return simulateCopyTrading(currentPrice, config);
    default:
      return { trades: [], totalPnL: 0, winRate: 0, totalTrades: 0 };
  }
}
