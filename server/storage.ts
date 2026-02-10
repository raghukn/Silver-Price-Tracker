
import { silverPrices, type InsertSilverPrice, type SilverPrice } from "@shared/schema";
import { db } from "./db";
import { desc } from "drizzle-orm";

export interface IStorage {
  createSilverPrice(price: InsertSilverPrice): Promise<SilverPrice>;
  getLatestPrices(limit?: number): Promise<SilverPrice[]>;
  getLatestPrice(): Promise<SilverPrice | undefined>;
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
}

export const storage = new DatabaseStorage();
