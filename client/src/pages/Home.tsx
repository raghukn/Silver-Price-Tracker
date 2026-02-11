import { useSilverPrices, useLatestPrice } from "@/hooks/use-prices";
import { Header } from "@/components/Header";
import { PriceChart } from "@/components/PriceChart";
import { MetricCard } from "@/components/MetricCard";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Coins, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Home() {
  const { data: prices, isLoading: isLoadingHistory, isError: isHistoryError } = useSilverPrices();
  const { data: latest, isLoading: isLoadingLatest } = useLatestPrice();

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

  const latestPriceInr = latest?.priceInr ? parseFloat(latest.priceInr) : 0;
  const latestPriceUsd = latest?.priceUsd ? parseFloat(latest.priceUsd) : 0;
  const conversionRate = latest?.conversionRate ? parseFloat(latest.conversionRate) : 93;
  const lastUpdated = latest?.timestamp ? new Date(latest.timestamp) : new Date();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            label="Current Silver Price (INR)"
            value={`₹${latestPriceInr.toFixed(2)}`}
            subValue="Per Gram"
            icon={<Coins className="w-6 h-6" />}
            delay={0.1}
            className="border-l-4 border-l-primary"
          />
          
          <MetricCard
            label="Global Spot Price (USD)"
            value={`$${latestPriceUsd.toFixed(2)}`}
            subValue="Per Ounce (XAG)"
            icon={<DollarSign className="w-6 h-6" />}
            delay={0.2}
          />

          <MetricCard
            label="USD/INR Exchange Rate"
            value={`₹${conversionRate.toFixed(2)}`}
            subValue={`Scraped at ${format(lastUpdated, "h:mm a")}`}
            icon={<RefreshCw className="w-6 h-6" />}
            delay={0.3}
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
              <RefreshCw className="w-3 h-3 md:w-4 md:h-4 animate-spin-slow" />
              Last updated: {format(lastUpdated, "MMM d, h:mm a")}
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
            <div className="font-mono text-sm bg-background p-4 rounded-xl border border-border text-foreground/80">
              Price (INR/g) = (XAGUSD / 31.1) × {conversionRate.toFixed(2)}
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              We take the global spot price of Silver (XAG/USD), convert it to grams by dividing by 31.1 (troy ounce to gram conversion), and then apply the live USD/INR exchange rate (₹{conversionRate.toFixed(2)}) fetched from global markets.
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
