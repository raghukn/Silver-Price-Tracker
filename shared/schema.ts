
import { pgTable, text, serial, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const silverPrices = pgTable("silver_prices", {
  id: serial("id").primaryKey(),
  priceUsd: decimal("price_usd").notNull(),
  priceInr: decimal("price_inr").notNull(), // Price per gram in INR
  conversionRate: decimal("conversion_rate").notNull().default("93"), // USD to INR rate
  etfPrice: decimal("etf_price"), // Silver ETF price in INR
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertSilverPriceSchema = createInsertSchema(silverPrices).omit({
  id: true,
  timestamp: true,
});

export type SilverPrice = typeof silverPrices.$inferSelect;
export type InsertSilverPrice = z.infer<typeof insertSilverPriceSchema>;
