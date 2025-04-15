import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
  passkeyId: text("passkey_id"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  txHash: text("tx_hash").notNull(),
  amount: text("amount").notNull(),
  success: boolean("success").notNull().default(true),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  connectionMethod: text("connection_method").notNull(), // "passkey" or "phantom"
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  walletAddress: true,
  passkeyId: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  txHash: true,
  amount: true,
  success: true,
  connectionMethod: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Client-side types
export interface ClientTransaction {
  id: string;
  amount: number;
  success: boolean;
  timestamp: Date;
  connectionMethod: 'passkey' | 'phantom';
  duration?: number; // Transaction duration in milliseconds
}
