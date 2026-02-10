
import { z } from "zod";
import { silverPrices, insertSilverPriceSchema } from "./schema";

export const api = {
  prices: {
    list: {
      method: "GET" as const,
      path: "/api/prices" as const,
      responses: {
        200: z.array(z.custom<typeof silverPrices.$inferSelect>()),
      },
    },
    latest: {
      method: "GET" as const,
      path: "/api/prices/latest" as const,
      responses: {
        200: z.custom<typeof silverPrices.$inferSelect>().nullable(),
      },
    },
  },
};
