import { z } from "zod";
import { pgTable, text, integer, timestamp, json, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Platform enum values
export const platformValues = ["LINE", "WhatsApp", "Messenger", "Instagram", "Email"] as const;
export const roleValues = ["buyer", "agent", "system"] as const;
export const leadScoreValues = ["hot", "warm", "cold"] as const;

// Buyer Profile Schema (for JSON storage)
export const buyerProfileSchema = z.object({
  budget: z.string().nullable(),
  location: z.string().nullable(),
  propertyType: z.string().nullable(),
  purpose: z.string().nullable(),
  timeline: z.string().nullable(),
  notes: z.string().nullable(),
});

export type BuyerProfile = z.infer<typeof buyerProfileSchema>;

// Lead Analysis Response Schema (for JSON storage and OpenAI response)
export const leadAnalysisResponseSchema = z.object({
  leadScore: z.enum(leadScoreValues),
  leadReason: z.string(),
  followUpInDays: z.number(),
  followUpMessage: z.string(),
  buyerProfile: buyerProfileSchema,
  replies: z.array(z.string()),
}).describe("Lead analysis response with exactly 3 reply suggestions");

export type LeadAnalysisResponse = z.infer<typeof leadAnalysisResponseSchema>;

// Database Tables

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  buyerName: text("buyer_name").notNull(),
  lastMessage: text("last_message").notNull().default(""),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  platform: text("platform", { enum: platformValues }).notNull(),
  unreadCount: integer("unread_count").default(0),
  leadScore: text("lead_score", { enum: leadScoreValues }),
  lastAnalysis: json("last_analysis").$type<LeadAnalysisResponse | null>(),
  lastAnalysisTimestamp: timestamp("last_analysis_timestamp"),
  externalSenderId: text("external_sender_id"),
});

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  role: text("role", { enum: roleValues }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  platform: text("platform", { enum: platformValues }),
  externalMessageId: text("external_message_id"),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Zod schemas from Drizzle tables
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  timestamp: true,
  lastMessage: true,
  lastAnalysis: true,
  lastAnalysisTimestamp: true,
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

// Lead Analysis Request Schema
export const leadAnalysisRequestSchema = z.object({
  conversationId: z.string(),
});

export type LeadAnalysisRequest = z.infer<typeof leadAnalysisRequestSchema>;

// API response types (for frontend compatibility - use string IDs)
export type ConversationResponse = Omit<Conversation, 'id' | 'timestamp' | 'lastAnalysisTimestamp'> & {
  id: string;
  timestamp: string;
  lastAnalysisTimestamp: string | null;
};

export type MessageResponse = Omit<Message, 'id' | 'conversationId' | 'timestamp'> & {
  id: string;
  conversationId: string;
  timestamp: string;
};
