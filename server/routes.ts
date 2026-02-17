
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import axios from "axios";

// Configuration
const SCRAPE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const USD_INR_API_URL = "https://data-asg.goldprice.org/dbXRates/INR";
const TROY_OUNCE_TO_GRAMS = 31.3;

async function fetchEtfPrice() {
  try {
    const response = await axios.get("https://www.nseindia.com/api/quote-equity?symbol=SILVERBEES", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.nseindia.com/get-quote/equity/SILVERBEES',
      },
      timeout: 10000
    });
    return response.data?.priceInfo?.lastPrice;
  } catch (err) {
    console.error("ETF fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function scrapeSilverPrice() {
  try {
    console.log("Starting fetch of silver, exchange rates, and ETF...");
    
    const [silverRes, inrRes, etfPrice] = await Promise.allSettled([
      axios.get("https://query1.finance.yahoo.com/v8/finance/chart/XAGX-USD", { 
        timeout: 15000, 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      }),
      axios.get("https://query1.finance.yahoo.com/v8/finance/chart/INR=X", { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      }),
      fetchEtfPrice()
    ]);

    const lastPrice = await storage.getLatestPrice();
    let priceUsd = lastPrice ? Number(lastPrice.priceUsd) : 76.0;
    let conversionRate = lastPrice ? Number(lastPrice.conversionRate) : 83.5;
    let currentEtfPrice = lastPrice ? (lastPrice.etfPrice ? Number(lastPrice.etfPrice) : null) : null;
    let volumeInfo = lastPrice && 'volumeInfo' in lastPrice ? (lastPrice as any).volumeInfo : null;

    if (silverRes.status === 'fulfilled' && silverRes.value.status === 200) {
      const val = silverRes.value.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (val) priceUsd = val;
      
      // Try to get volume or trade info
      const indicators = silverRes.value.data?.chart?.result?.[0]?.indicators?.quote?.[0];
      if (indicators && indicators.volume) {
        const volumes = indicators.volume.filter((v: any) => v !== null);
        if (volumes.length > 0) {
          const avgVol = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
          const lastVol = volumes[volumes.length - 1];
          // Simple sentiment: if last volume > avg, mark as higher activity
          volumeInfo = JSON.stringify({ lastVol, avgVol, sentiment: lastVol > avgVol ? 'High' : 'Normal' });
        }
      }
    }

    if (inrRes.status === 'fulfilled' && inrRes.value.status === 200) {
      const val = inrRes.value.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (val) conversionRate = val;
    }

    if (etfPrice.status === 'fulfilled') {
      currentEtfPrice = etfPrice.value;
    }

    const currentMargin = 4;
    const priceInr = (priceUsd / TROY_OUNCE_TO_GRAMS) * conversionRate + currentMargin;

    console.log(`[Scraper Success] XAG/USD: $${priceUsd} | USD/INR: ${conversionRate.toFixed(2)} | INR/g: ${priceInr.toFixed(2)}`);
    
    await storage.createSilverPrice({
      priceUsd: priceUsd.toString(),
      priceInr: priceInr.toFixed(2),
      conversionRate: conversionRate.toFixed(4),
      etfPrice: currentEtfPrice ? currentEtfPrice.toString() : null,
      marginX: currentMargin.toString(),
      volumeInfo: volumeInfo,
    });

  } catch (err: any) {
    console.error("Final error in scrape:", err.message);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // API Routes
  app.get(api.prices.list.path, async (req, res) => {
    const prices = await storage.getLatestPrices(24);
    const formattedPrices = prices.reverse().map(p => ({
      ...p,
      priceUsd: Number(p.priceUsd),
      priceInr: Number(p.priceInr)
    }));
    res.json(formattedPrices);
  });

  app.get(api.prices.latest.path, async (req, res) => {
    const price = await storage.getLatestPrice();
    res.json(price || null);
  });

  app.post("/api/prices/scrape", async (req, res) => {
    try {
      await scrapeSilverPrice();
      const latest = await storage.getLatestPrice();
      res.json(latest);
    } catch (err) {
      res.status(500).json({ error: "Failed to trigger scrape" });
    }
  });

  scrapeSilverPrice();
  
  const intervalId = setInterval(scrapeSilverPrice, SCRAPE_INTERVAL_MS);

  const cleanup = () => clearInterval(intervalId);
  httpServer.on('close', cleanup);

  return httpServer;
}
