import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";
import { motion } from "framer-motion";
import type { SilverPrice } from "@/hooks/use-prices";

interface PriceChartProps {
  data: SilverPrice[];
}

export function PriceChart({ data }: PriceChartProps) {
  const chartData = useMemo(() => {
    // Take the last 12 items and reverse if necessary so oldest is left, newest right
    // Assuming backend returns sorted data, but let's be safe:
    const sortedData = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // We only want the last 24 points for the trend
    const recentData = sortedData.slice(-24);

    return recentData.map((item) => ({
      ...item,
      // Parse float for recharts
      priceInrVal: parseFloat(item.priceInr),
      etfPriceVal: item.etfPrice ? parseFloat(item.etfPrice) : null,
      formattedTime: format(new Date(item.timestamp), "HH:mm"),
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-xl">
        Waiting for data points...
      </div>
    );
  }

  // Calculate domain for Y-axis to make the chart look dynamic (zoom in on the variation)
  const allValues = chartData.flatMap(d => [
    d.priceInrVal,
    ...(d.etfPriceVal !== null ? [d.etfPriceVal] : [])
  ]);
  const minPrice = Math.min(...allValues);
  const maxPrice = Math.max(...allValues);
  const padding = (maxPrice - minPrice) * 0.1; // 10% padding

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full h-[300px] md:h-[400px] mt-6"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEtf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--orange-500))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--orange-500))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="formattedTime" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            domain={[minPrice - padding, maxPrice + padding]} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => `₹${value.toFixed(0)}`}
            width={60}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))", 
              borderColor: "hsl(var(--border))",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
            itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Area 
            type="monotone" 
            dataKey="priceInrVal" 
            name="Physical Silver"
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />
          <Area 
            type="monotone" 
            dataKey="etfPriceVal" 
            name="Silver ETF"
            stroke="#f97316" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorEtf)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
