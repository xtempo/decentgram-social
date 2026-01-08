import { useMemo } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

interface CryptoChartProps {
  data: number[];
  priceChange?: number;
}

export const CryptoChart = ({ data, priceChange = 0 }: CryptoChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sample the data to reduce points (take every nth point)
    const step = Math.max(1, Math.floor(data.length / 168)); // ~168 points for 7 days
    const sampledData = data.filter((_, index) => index % step === 0);
    
    return sampledData.map((price, index) => ({
      time: index,
      price,
    }));
  }, [data]);

  const isPositive = priceChange >= 0;
  const strokeColor = isPositive ? "hsl(145, 85%, 55%)" : "hsl(0, 84%, 60%)";
  const fillColor = isPositive ? "hsl(145, 85%, 55%)" : "hsl(0, 84%, 60%)";

  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    if (value >= 1) {
      return `$${value.toFixed(2)}`;
    }
    return `$${value.toFixed(4)}`;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No chart data available
      </div>
    );
  }

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const padding = (maxPrice - minPrice) * 0.1;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(222, 47%, 25%)" 
            vertical={false}
          />
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={false}
          />
          <YAxis 
            domain={[minPrice - padding, maxPrice + padding]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(180, 30%, 70%)", fontSize: 12 }}
            tickFormatter={formatPrice}
            width={60}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-foreground font-semibold">
                      {formatPrice(payload[0].value as number)}
                    </p>
                    <p className="text-xs text-muted-foreground">7 Day Chart</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#priceGradient)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
