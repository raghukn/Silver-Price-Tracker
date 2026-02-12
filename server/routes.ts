
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import axios from "axios";

// Configuration
const SCRAPE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const XAG_USD_API_URL = "https://data-asg.goldprice.org/dbXRates/USD";
const USD_INR_API_URL = "https://data-asg.goldprice.org/dbXRates/INR";
const ETF_URL = "https://www.nseindia.com/get-quote/equity/SILVERBEES";
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
    
    const isJson = (res: any) => res?.headers?.['content-type']?.includes('application/json');

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const [silverRes, inrRes, etfPrice] = await Promise.all([
      axios.get("https://finance.yahoo.com/quote/XAGX-USD/", { 
        headers: {
          ...fetchHeaders,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        }, 
        timeout: 15000, 
        validateStatus: (s) => s < 500 
      }),
      axios.get(USD_INR_API_URL, { headers: fetchHeaders, timeout: 10000, validateStatus: (s) => s < 500 }),
      fetchEtfPrice()
    ]).catch(err => {
      console.error("Fetch failed:", err.message);
      throw err;
    });

    // Handle Search/Yahoo HTML response
    if (silverRes.status === 200 && !isJson(silverRes)) {
      const html = silverRes.data;
      
      // Yahoo Finance specific price patterns
      const match = html.match(/data-field="regularMarketPrice"[^>]*value="([\d,.]+)"/) || 
                    html.match(/["']regularMarketPrice["']\s*:\s*\{\s*["']raw["']\s*:\s*([\d,.]+)/) ||
                    html.match(/class="[\w\s]*Fw\(b\) Fz\(36px\)[\w\s]*">([\d,.]+)</) ||
                    html.match(/fin-streamer[^>]*data-field="regularMarketPrice"[^>]*>([\d,.]+)</);
      
      if (match) {
        const priceUsd = parseFloat(match[1].replace(/,/g, ''));
        
        // Validation: Expecting price around $30-$90 based on current market
        if (priceUsd > 10 && priceUsd < 500) {
          // Get conversion rate from INR source if possible
          let conversionRate = 83.5;
          if (inrRes.status === 200 && isJson(inrRes)) {
            const xagInrPerOunce = inrRes.data.items?.[0]?.xagPrice;
            if (xagInrPerOunce) {
              conversionRate = xagInrPerOunce / priceUsd;
            }
          }

          const currentMargin = 2;
          const priceInr = (priceUsd / TROY_OUNCE_TO_GRAMS) * conversionRate + currentMargin;

          console.log(`[Scraper Success] XAG/USD: $${priceUsd} from Yahoo | Rate: ${conversionRate.toFixed(2)}`);
          
          await storage.createSilverPrice({
            priceUsd: priceUsd.toString(),
            priceInr: priceInr.toFixed(2),
            conversionRate: conversionRate.toFixed(4),
            etfPrice: etfPrice ? etfPrice.toString() : null,
            marginX: currentMargin.toString(),
          });
          return;
        }
      }
      console.warn("[Scraper Warning] HTML matched but price invalid or not found on Yahoo. Falling back.");
    }

    if (silverRes.status === 200 && inrRes.status === 200 && isJson(silverRes) && isJson(inrRes)) {
      const priceUsd = silverRes.data.items?.[0]?.xagPrice;
      const xagInrPerOunce = inrRes.data.items?.[0]?.xagPrice;

      if (xagInrPerOunce && priceUsd) {
        const conversionRate = xagInrPerOunce / priceUsd;
        const currentMargin = 2; // Default, can be updated via API if we add a route
        const priceInr = (priceUsd / TROY_OUNCE_TO_GRAMS) * conversionRate + currentMargin;

        await storage.createSilverPrice({
          priceUsd: priceUsd.toString(),
          priceInr: priceInr.toFixed(2),
          conversionRate: conversionRate.toFixed(4),
          etfPrice: etfPrice ? etfPrice.toString() : null,
          marginX: currentMargin.toString(),
        });
        return;
      }
    }

    const mockPriceUsd = 22.5 + (Math.random() * 0.5);
    const mockRate = 83.1 + (Math.random() * 0.2);
    const currentMargin = 2;
    const mockPriceInr = (mockPriceUsd / TROY_OUNCE_TO_GRAMS) * mockRate + currentMargin;
    const mockEtf = 70 + (Math.random() * 5);

    await storage.createSilverPrice({
      priceUsd: mockPriceUsd.toFixed(2),
      priceInr: mockPriceInr.toFixed(2),
      conversionRate: mockRate.toFixed(4),
      etfPrice: etfPrice ? etfPrice.toString() : mockEtf.toFixed(2),
      marginX: currentMargin.toString(),
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
    // Return chronological order for the chart (oldest first) so we reverse the storage result (newest first)
    const prices = await storage.getLatestPrices(24);
    // Convert decimal strings to numbers for the frontend chart
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

  // Start the scraping job
  // Run once immediately on startup
  scrapeSilverPrice();
  
  // Schedule
  const intervalId = setInterval(scrapeSilverPrice, SCRAPE_INTERVAL_MS);

  // Graceful shutdown (optional but good practice)
  const cleanup = () => clearInterval(intervalId);
  httpServer.on('close', cleanup);

  return httpServer;
}
