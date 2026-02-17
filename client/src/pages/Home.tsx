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
  const [refreshInterval, setRefreshInterval] = useState(5); // in minutes
  const { data: prices, isLoading: isLoadingHistory, isError: isHistoryError, refetch: refetchHistory } = useSilverPrices(refreshInterval * 60000);
  const { data: latest, isLoading: isLoadingLatest, refetch: refetchLatest } = useLatestPrice(refreshInterval * 60000);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshError, setLastRefreshError] = useState<Date | null>(null);
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState<Date | null>(new Date());

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/prices/scrape", { method: "POST" });
      if (!res.ok) throw new Error("Scrape failed");
      await Promise.all([refetchHistory(), refetchLatest()]);
      setLastSuccessfulRefresh(new Date());
      setLastRefreshError(null);
    } catch (err) {
      console.error("Manual refresh failed", err);
      setLastRefreshError(new Date());
    } finally {
      setIsRefreshing(false);
    }
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
  const [marginX, setMarginX] = useState(4);

  const getAlertInfo = () => {
    if (!prices || prices.length < 2) return null;
    
    const latestPrice = prices[prices.length - 1];
    const tenMinsAgo = new Date(Date.now() - 10 * 60000);
    
    // Find a price point from approximately 10 minutes ago
    const oldPricePoint = [...prices].reverse().find(p => new Date(p.timestamp) <= tenMinsAgo);
    
    if (!oldPricePoint) return null;
    
    const currentVal = parseFloat(latestPrice.priceUsd);
    const oldVal = parseFloat(oldPricePoint.priceUsd);
    const changePercent = ((currentVal - oldVal) / oldVal) * 100;
    
    if (Math.abs(changePercent) >= 1) {
      return {
        percent: Math.abs(changePercent).toFixed(2),
        isUp: changePercent > 0
      };
    }
    return null;
  };

  const getTrend = (minutes: number) => {
    if (!prices || prices.length < 2) return null;
    
    const latestPrice = prices[prices.length - 1];
    const pastTime = new Date(Date.now() - minutes * 60000);
    
    // Find a price point from approximately the specified time ago
    const oldPricePoint = [...prices].reverse().find(p => new Date(p.timestamp) <= pastTime);
    
    if (!oldPricePoint) return null;
    
    const currentVal = parseFloat(latestPrice.priceUsd);
    const oldVal = parseFloat(oldPricePoint.priceUsd);
    const changePercent = ((currentVal - oldVal) / oldVal) * 100;
    
    return {
      percent: Math.abs(changePercent).toFixed(2),
      isUp: changePercent >= 0
    };
  };

  const alertInfo = getAlertInfo();
  const trend5m = getTrend(5);
  const trend30m = getTrend(30);
  const trend60m = getTrend(60);

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

  const latestPriceUsd = latest?.priceUsd ? parseFloat(latest.priceUsd) : 0;
  const etfPrice = latest?.etfPrice ? parseFloat(latest.etfPrice) : 0;
  const conversionRate = latest?.conversionRate ? parseFloat(latest.conversionRate) : 93;
  const lastUpdated = latest?.timestamp ? new Date(latest.timestamp) : new Date();
  const volumeInfo = latest?.volumeInfo ? JSON.parse(latest.volumeInfo) : null;

  const latestPriceInr = (latestPriceUsd / 31.3) * conversionRate + marginX;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* Header and Refresh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold font-display text-foreground">Market Overview</h1>
            <p className="text-muted-foreground">Real-time silver prices and exchange rates</p>
            {alertInfo && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold w-fit ${
                  alertInfo.isUp ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                }`}
              >
                {alertInfo.isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                Significant Movement: {alertInfo.percent}% in last 10m
              </motion.div>
            )}
          </div>
          <Button 
            onClick={handleManualRefresh}
            className="w-full md:w-auto gap-2 shadow-lg shadow-primary/20 hover-elevate active-elevate-2"
            size="lg"
            data-testid="button-refresh-all"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh All Metrics"}
          </Button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            label="Global Spot Price (USD)"
            value={`$${latestPriceUsd.toFixed(2)}`}
            subValue={
              <div className="flex flex-col gap-1 mt-1">
                {trend5m && (
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${trend5m.isUp ? "text-emerald-500" : "text-rose-500"}`}>
                    {trend5m.isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {trend5m.percent}% (5m)
                  </div>
                )}
                {trend30m && (
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${trend30m.isUp ? "text-emerald-500" : "text-rose-500"}`}>
                    {trend30m.isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {trend30m.percent}% (30m)
                  </div>
                )}
                {trend60m && (
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${trend60m.isUp ? "text-emerald-500" : "text-rose-500"}`}>
                    {trend60m.isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {trend60m.percent}% (60m)
                  </div>
                )}
                {volumeInfo && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-blue-500 mt-1 pt-1 border-t border-border/20">
                    Activity: {volumeInfo.sentiment}
                  </div>
                )}
                {!trend5m && !trend30m && !trend60m && <span>Last updated: {format(lastUpdated, "h:mm a")}</span>}
              </div>
            }
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
                className={`hover:rotate-180 transition-transform duration-500 p-1 rounded-full hover:bg-primary/10 ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Refresh Data"
                data-testid="button-manual-refresh"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-6 h-6 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            }
            delay={0.2}
          />

          <MetricCard
            label="Nippon ETF Price"
            value={`₹${etfPrice.toFixed(2)}`}
            subValue={`SILVERBEES at ${format(lastUpdated, "h:mm a")}`}
            icon={<Coins className="w-6 h-6 text-orange-500" />}
            delay={0.3}
          />

          <MetricCard
            label="Calculated Price (INR)"
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
              <p className="text-muted-foreground">Showing last 24 data points (2 Hours)</p>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground self-start md:self-auto">
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
                <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                Page Time: {format(currentTime, "h:mm:ss a")}
              </div>
              {lastSuccessfulRefresh && (
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
                  <RefreshCw className="w-3 h-3 md:w-4 md:h-4 animate-spin-slow" />
                  Last Success: {format(lastSuccessfulRefresh, "h:mm:ss a")}
                </div>
              )}
              {lastRefreshError && (
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded-full border border-destructive/20">
                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                  Refresh Failed: {format(lastRefreshError, "h:mm:ss a")}
                </div>
              )}
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
            <div className="flex flex-col gap-6 mb-4">
              <div className="flex flex-col gap-3">
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
                  <span className="font-mono w-16 text-right">₹{marginX.toFixed(1)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium">Auto-Refresh Interval</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    step="1" 
                    value={refreshInterval} 
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="font-mono w-16 text-right">{refreshInterval}m</span>
                </div>
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
                Data is updated via real-time market search. Use the slider below to adjust polling frequency.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5" />
                Pricing sourced from global market indicators including Yahoo Finance and Live Spot Data.
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
