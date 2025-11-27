import { z } from "zod";
import { pgTable, serial, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Database Tables

// Conversations table - stores chat threads from Facebook Messenger
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  buyerName: text("buyer_name").notNull(),
  lastMessage: text("last_message").default(""),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  platform: varchar("platform", { length: 50 }).notNull().default("Messenger"),
  unreadCount: integer("unread_count").default(0),
  leadScore: varchar("lead_score", { length: 20 }),
  // Facebook-specific fields
  facebookPsid: varchar("facebook_psid", { length: 100 }),
  facebookPageId: varchar("facebook_page_id", { length: 100 }),
  profilePictureUrl: text("profile_picture_url"),
  // Lead analysis data stored as JSON
  buyerProfile: jsonb("buyer_profile"),
  leadReason: text("lead_reason"),
  followUpInDays: integer("follow_up_in_days"),
  followUpMessage: text("follow_up_message"),
  replySuggestions: jsonb("reply_suggestions"),
});

// Messages table - stores individual messages in conversations
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'buyer', 'agent', 'system'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  platform: varchar("platform", { length: 50 }),
  // Facebook-specific fields
  facebookMessageId: varchar("facebook_message_id", { length: 100 }),
  isRead: integer("is_read").default(0),
});

// Define relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Zod schemas for validation
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  timestamp: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

// Types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Buyer Profile Schema (for JSON field)
export const buyerProfileSchema = z.object({
  budget: z.string().nullable(),
  location: z.string().nullable(),
  propertyType: z.string().nullable(),
  purpose: z.string().nullable(),
  timeline: z.string().nullable(),
  notes: z.string().nullable(),
});

export type BuyerProfile = z.infer<typeof buyerProfileSchema>;

// Lead Analysis Request Schema
export const leadAnalysisRequestSchema = z.object({
  conversationId: z.number(),
});

export type LeadAnalysisRequest = z.infer<typeof leadAnalysisRequestSchema>;

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

// Facebook webhook event types
export const facebookWebhookMessageSchema = z.object({
  sender: z.object({ id: z.string() }),
  recipient: z.object({ id: z.string() }),
  timestamp: z.number(),
  message: z.object({
    mid: z.string(),
    text: z.string().optional(),
    attachments: z.array(z.object({
      type: z.string(),
      payload: z.object({ url: z.string().optional() }).optional(),
    })).optional(),
  }).optional(),
  read: z.object({ watermark: z.number() }).optional(),
  delivery: z.object({ mids: z.array(z.string()), watermark: z.number() }).optional(),
});

export type FacebookWebhookMessage = z.infer<typeof facebookWebhookMessageSchema>;
