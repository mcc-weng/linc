import { z } from "zod";
import { pgTable, varchar, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Enums
export const platformEnum = pgEnum("platform", ["LINE", "WhatsApp", "Messenger", "Instagram", "Email"]);
export const roleEnum = pgEnum("role", ["buyer", "agent", "system"]);
export const leadScoreEnum = pgEnum("lead_score", ["hot", "warm", "cold"]);

// Conversations Table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  buyerName: varchar("buyer_name", { length: 255 }).notNull(),
  lastMessage: text("last_message").notNull().default(""),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  platform: platformEnum("platform").notNull(),
  unreadCount: integer("unread_count").default(0),
  leadScore: leadScoreEnum("lead_score"),
});

// Messages Table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: varchar("conversation_id", { length: 255 }).notNull().references(() => conversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  role: roleEnum("role").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  platform: platformEnum("platform"),
});

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Types from Drizzle tables
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Insert schemas with validation
export const insertConversationSchema = createInsertSchema(conversations).omit({ 
  id: true, 
  timestamp: true, 
  lastMessage: true 
});

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, 
  timestamp: true 
});

// Lead Analysis Request Schema
export const leadAnalysisRequestSchema = z.object({
  conversationId: z.string(),
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
  replies: z.array(z.string()),
}).describe("Lead analysis response with exactly 3 reply suggestions");

export type LeadAnalysisResponse = z.infer<typeof leadAnalysisResponseSchema>;
