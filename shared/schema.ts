import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Lead Analysis Request Schema
export const leadAnalysisRequestSchema = z.object({
  message: z.string().min(1, "買家訊息不能為空"),
  source: z.enum(["LINE", "Messenger", "WhatsApp", "Instagram", "Email"]),
  customerType: z.enum(["買家", "投資客", "租客", "其他"]),
  replyLanguage: z.enum(["中文", "英文", "雙語"]),
  notes: z.string().optional(),
});

export type LeadAnalysisRequest = z.infer<typeof leadAnalysisRequestSchema>;

// Buyer Profile Schema
export const buyerProfileSchema = z.object({
  budget: z.string().nullable(),
  location: z.string().nullable(),
  propertyType: z.string().nullable(),
  purpose: z.string().nullable(),
  timeline: z.string().nullable(),
  notes: z.string().nullable(),
});

export type BuyerProfile = z.infer<typeof buyerProfileSchema>;

// Lead Analysis Response Schema
export const leadAnalysisResponseSchema = z.object({
  leadScore: z.enum(["hot", "warm", "cold"]),
  leadReason: z.string(),
  followUpInDays: z.number(),
  followUpMessage: z.string(),
  buyerProfile: buyerProfileSchema,
  replies: z.array(z.string()).length(3),
});

export type LeadAnalysisResponse = z.infer<typeof leadAnalysisResponseSchema>;
