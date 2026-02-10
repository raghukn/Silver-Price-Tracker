
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import axios from "axios";

// Configuration
const SCRAPE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const XAG_USD_API_URL = "https://data-asg.goldprice.org/dbXRates/USD";
const CONVERSION_RATE = 93; // Fixed rate as per user request
const TROY_OUNCE_TO_GRAMS = 31.1;

async function scrapeSilverPrice() {
  try {
    console.log("Starting fetch of silver price from JSON API...");
    
    const response = await axios.get(XAG_USD_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://goldprice.org/'
      }
    });

    const data = response.data;
    if (!data.items || data.items.length === 0) {
      console.error("Invalid API response format", data);
      return;
    }

    const item = data.items[0];
    const priceUsd = item.xagPrice;

    if (!priceUsd) {
      console.error("Price not found in API response", item);
      return;
    }

    // Calculate Price per Gram in INR
    // Formula: (XAGUSD / 31.1) * 93
    const priceInr = (priceUsd / TROY_OUNCE_TO_GRAMS) * CONVERSION_RATE;

    console.log(`Fetched Price (USD): ${priceUsd}`);
    console.log(`Calculated Price (INR/g): ${priceInr.toFixed(2)}`);

    await storage.createSilverPrice({
      priceUsd: priceUsd.toString(),
      priceInr: priceInr.toFixed(2),
    });

  } catch (error) {
    console.error("Error fetching silver price:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // API Routes
  app.get(api.prices.list.path, async (req, res) => {
    // Return chronological order for the chart (oldest first) so we reverse the storage result (newest first)
    const prices = await storage.getLatestPrices(12);
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
