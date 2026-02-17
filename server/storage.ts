
import { silverPrices, analysis, type InsertSilverPrice, type SilverPrice, type InsertAnalysis, type Analysis } from "@shared/schema";
import { db } from "./db";
import { desc } from "drizzle-orm";

export interface IStorage {
  createSilverPrice(price: InsertSilverPrice): Promise<SilverPrice>;
  getLatestPrices(limit?: number): Promise<SilverPrice[]>;
  getLatestPrice(): Promise<SilverPrice | undefined>;
  
  createAnalysis(data: InsertAnalysis): Promise<Analysis>;
  getLatestAnalysis(limit?: number): Promise<Analysis[]>;
}

export class DatabaseStorage implements IStorage {
  async createSilverPrice(price: InsertSilverPrice): Promise<SilverPrice> {
    const [newPrice] = await db.insert(silverPrices).values(price).returning();
    return newPrice;
  }

  async getLatestPrices(limit: number = 12): Promise<SilverPrice[]> {
    return await db
      .select()
      .from(silverPrices)
      .orderBy(desc(silverPrices.timestamp))
      .limit(limit);
  }

  async getLatestPrice(): Promise<SilverPrice | undefined> {
    const [price] = await db
      .select()
      .from(silverPrices)
      .orderBy(desc(silverPrices.timestamp))
      .limit(1);
    return price;
  }

  async createAnalysis(data: InsertAnalysis): Promise<Analysis> {
    const [newAnalysis] = await db.insert(analysis).values(data).returning();
    return newAnalysis;
  }

  async getLatestAnalysis(limit: number = 5): Promise<Analysis[]> {
    return await db
      .select()
      .from(analysis)
      .orderBy(desc(analysis.timestamp))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
