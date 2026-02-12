import { useSilverPrices, useLatestPrice } from "@/hooks/use-prices";
import { Header } from "@/components/Header";
import { PriceChart } from "@/components/PriceChart";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Coins, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: prices, isLoading: isLoadingHistory, isError: isHistoryError, refetch: refetchHistory } = useSilverPrices();
  const { data: latest, isLoading: isLoadingLatest, refetch: refetchLatest } = useLatestPrice();

  const handleManualRefresh = async () => {
    await Promise.all([refetchHistory(), refetchLatest()]);
  };

  // Helper to determine trend
  const calculateTrend = () => {
    if (!prices || prices.length < 2) return { diff: 0, percent: 0, isUp: true };
    const current = parseFloat(prices[prices.length - 1].priceInr);
    const prev = parseFloat(prices[prices.length - 2].priceInr);
    const diff = current - prev;
    const percent = (diff / prev) * 100;
    return { 
      diff, 
      percent: Math.abs(percent), 
      isUp: diff >= 0 
    };
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [marginX, setMarginX] = useState(2);

  useEffect(() => {
    if (latest?.marginX) {
      setMarginX(parseFloat(latest.marginX));
    }
  }, [latest]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const trend = calculateTrend();

  if (isLoadingHistory || isLoadingLatest) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading market data...</p>
      </div>
    );
  }

  if (isHistoryError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p>Failed to load silver price data. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const latestPriceInr = (latestPriceUsd / 31.3) * conversionRate + marginX;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* Header and Refresh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Market Overview</h1>
            <p className="text-muted-foreground">Real-time silver prices and exchange rates</p>
          </div>
          <Button 
            onClick={handleManualRefresh}
            className="w-full md:w-auto gap-2 shadow-lg shadow-primary/20 hover-elevate active-elevate-2"
            size="lg"
            data-testid="button-refresh-all"
          >
            <RefreshCw className={`w-5 h-5 ${isLoadingHistory || isLoadingLatest ? "animate-spin" : ""}`} />
            Refresh All Metrics
          </Button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            label="Global Spot Price (USD)"
            value={`$${latestPriceUsd.toFixed(2)}`}
            subValue={`Last updated: ${format(lastUpdated, "h:mm a")}`}
            icon={<DollarSign className="w-6 h-6" />}
            delay={0.1}
          />

          <MetricCard
            label="USD/INR Exchange Rate"
            value={`₹${conversionRate.toFixed(2)}`}
            subValue={`Scraped at ${format(lastUpdated, "h:mm a")}`}
            icon={
              <button 
                onClick={handleManualRefresh}
                className="hover:rotate-180 transition-transform duration-500 p-1 rounded-full hover:bg-primary/10"
                title="Refresh Data"
                data-testid="button-manual-refresh"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            }
            delay={0.2}
          />

          <MetricCard
            label="Silver ETF Price (NSE)"
            value={`₹${etfPrice.toFixed(2)}`}
            subValue={`SILVERBEES at ${format(lastUpdated, "h:mm a")}`}
            icon={<Coins className="w-6 h-6 text-orange-500" />}
            delay={0.3}
          />

          <MetricCard
            label="Current Silver Price (INR)"
            value={`₹${latestPriceInr.toFixed(2)}`}
            subValue={`Last computed: ${format(lastUpdated, "h:mm a")}`}
            icon={<Coins className="w-6 h-6" />}
            delay={0.4}
            className="border-l-4 border-l-primary"
          />
        </div>

        {/* Chart Section */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold font-display text-foreground">Price Trend</h2>
              <p className="text-muted-foreground">Showing last 12 data points (1 Hour)</p>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full self-start md:self-auto">
              <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              Page Time: {format(currentTime, "h:mm:ss a")}
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full self-start md:self-auto">
              <RefreshCw className="w-3 h-3 md:w-4 md:h-4 animate-spin-slow" />
              Last Data Refresh: {format(lastUpdated, "h:mm:ss a")}
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl shadow-black/5">
            <PriceChart data={(prices || []).map(p => ({ ...p, timestamp: new Date(p.timestamp).toISOString() }))} />
          </div>
        </section>

        {/* Info Grid */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-primary/5 rounded-2xl p-8 border border-primary/10"
          >
            <h3 className="text-lg font-bold font-display mb-4 text-primary">Calculation Formula</h3>
            <div className="font-mono text-sm bg-background p-4 rounded-xl border border-border text-foreground/80 mb-4">
              Price (INR/g) = (XAGUSD / 31.3) × {conversionRate.toFixed(2)} + {marginX}
            </div>
            <div className="flex flex-col gap-4 mb-4">
              <label className="text-sm font-medium">Adjust Margin (X)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  step="0.1" 
                  value={marginX} 
                  onChange={(e) => setMarginX(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="font-mono w-12">₹{marginX.toFixed(1)}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We take the global spot price of Silver (XAG/USD), convert it to grams by dividing by 31.3 (troy ounce to gram conversion), apply the live USD/INR exchange rate (₹{conversionRate.toFixed(2)}), and then add a margin of ₹{marginX.toFixed(1)}.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-secondary/30 rounded-2xl p-8 border border-secondary"
          >
            <h3 className="text-lg font-bold font-display mb-4">About This Data</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5" />
                Data is scraped from Investing.com every 5 minutes.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5" />
                The chart displays the most recent 12 data points to help identify short-term trends.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5" />
                Prices are indicative and for informational purposes only. Always verify with a broker before trading.
              </li>
            </ul>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
