import { z } from "zod";
import { pgTable, serial, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Database Tables

// Listings table - stores property listing info for quick replies
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  address: text("address"),
  priceGuide: text("price_guide"),
  inspectionTimes: text("inspection_times"),
  strataFee: text("strata_fee"),
  contractLink: text("contract_link"),
  infoPackLink: text("info_pack_link"),
  floorplanUrl: text("floorplan_url"),
  agentName: text("agent_name"),
  agentMobile: text("agent_mobile"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  parking: integer("parking"),
  propertyType: varchar("property_type", { length: 50 }),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // NEW: Available inspection scheduling fields
  inspectionAvailableDate: text("inspection_available_date"),
  inspectionAvailableTime: text("inspection_available_time"),
});

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
  // NEW: Follow-up tracking fields
  lastBuyerMessageAt: timestamp("last_buyer_message_at"),
  lastAgentMessageAt: timestamp("last_agent_message_at"),
  needsFollowUp: integer("needs_follow_up").default(0),
  autoFollowUpEnabled: integer("auto_follow_up_enabled").default(0),
  lastAutoFollowUpAt: timestamp("last_auto_follow_up_at"),
  followUpSentCount: integer("follow_up_sent_count").default(0),
  // NEW: AI Summary fields
  aiSummary: jsonb("ai_summary"),
  aiSummaryUpdatedAt: timestamp("ai_summary_updated_at"),
  // NEW: Listing association
  listingId: integer("listing_id"),
  // NEW: Dashboard status tracking
  needsAttention: integer("needs_attention").default(0),
  waitingForDocuments: integer("waiting_for_documents").default(0),
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
  // NEW: Auto follow-up tracking
  isAutoFollowUp: integer("is_auto_follow_up").default(0),
});

// Follow-up logs table - tracks all follow-up actions
export const followUpLogs = pgTable("follow_up_logs", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  actionType: varchar("action_type", { length: 50 }).notNull(), // 'suggested', 'auto_sent', 'manual_sent', 'dismissed'
  message: text("message"),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
});

// Junction table for multiple listings per conversation
export const conversationListings = pgTable("conversation_listings", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  listingId: integer("listing_id").notNull().references(() => listings.id),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

// Define relations
export const listingsRelations = relations(listings, ({ many }) => ({
  conversations: many(conversations),
  conversationListings: many(conversationListings),
}));

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  primaryListing: one(listings, {
    fields: [conversations.listingId],
    references: [listings.id],
  }),
  followUpLogs: many(followUpLogs),
  conversationListings: many(conversationListings),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const followUpLogsRelations = relations(followUpLogs, ({ one }) => ({
  conversation: one(conversations, {
    fields: [followUpLogs.conversationId],
    references: [conversations.id],
  }),
}));

export const conversationListingsRelations = relations(conversationListings, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationListings.conversationId],
    references: [conversations.id],
  }),
  listing: one(listings, {
    fields: [conversationListings.listingId],
    references: [listings.id],
  }),
}));

// Zod schemas for validation
export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  timestamp: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertFollowUpLogSchema = createInsertSchema(followUpLogs).omit({
  id: true,
  triggeredAt: true,
});

export const insertConversationListingSchema = createInsertSchema(conversationListings).omit({
  id: true,
  linkedAt: true,
  lastUsedAt: true,
});

// Types
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type FollowUpLog = typeof followUpLogs.$inferSelect;
export type InsertFollowUpLog = z.infer<typeof insertFollowUpLogSchema>;
export type ConversationListing = typeof conversationListings.$inferSelect;
export type InsertConversationListing = z.infer<typeof insertConversationListingSchema>;

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

// AI Summary Schema (for JSON field)
export const aiSummarySchema = z.object({
  buyerName: z.string().nullable(),
  budget: z.string().nullable(),
  requirements: z.string().nullable(),
  questionsAsked: z.array(z.string()),
  leadIntent: z.enum(["hot", "warm", "cold"]),
  pendingActions: z.array(z.string()),
  lastTouchHoursAgo: z.number(),
  conversationSummary: z.string(),
});

export type AISummary = z.infer<typeof aiSummarySchema>;

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

// Follow-up suggestion response schema
export const followUpSuggestionSchema = z.object({
  suggestions: z.array(z.string()).length(3),
  urgencyLevel: z.enum(["high", "medium", "low"]),
  reasonForFollowUp: z.string(),
});

export type FollowUpSuggestion = z.infer<typeof followUpSuggestionSchema>;

// Property recommendation schema (AI-based)
export const propertyRecommendationSchema = z.object({
  recommendedListingIds: z.array(z.number()).min(1).max(3),
  reasoning: z.string(),
  buyerIntent: z.object({
    budget: z.string().nullable(),
    location: z.string().nullable(),
    propertyType: z.string().nullable(),
    bedrooms: z.number().nullable(),
  }),
});

export type PropertyRecommendation = z.infer<typeof propertyRecommendationSchema>;

// Dashboard data schemas
export const dashboardConversationSchema = z.object({
  id: z.number(),
  buyerName: z.string(),
  lastMessage: z.string().nullable(),
  leadScore: z.string().nullable(),
  inactiveHours: z.number(),
  summarySnippet: z.string().nullable(),
  needsFollowUp: z.boolean(),
  unreadCount: z.number(),
});

export type DashboardConversation = z.infer<typeof dashboardConversationSchema>;

export const dashboardDataSchema = z.object({
  needsFollowUp: z.array(dashboardConversationSchema),
  hotLeads: z.array(dashboardConversationSchema),
  unreadMessages: z.array(dashboardConversationSchema),
  waitingForDocuments: z.array(dashboardConversationSchema),
  stats: z.object({
    totalConversations: z.number(),
    hotLeadsCount: z.number(),
    needsFollowUpCount: z.number(),
    unreadCount: z.number(),
  }),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// FAQ keyword detection types
export const faqCategorySchema = z.enum(["price", "inspection", "property_info", "contract", "general"]);
export type FAQCategory = z.infer<typeof faqCategorySchema>;

export const detectedFAQSchema = z.object({
  category: faqCategorySchema,
  keywords: z.array(z.string()),
  confidence: z.number(),
});

export type DetectedFAQ = z.infer<typeof detectedFAQSchema>;

// Quick reply template
export const quickReplyTemplateSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: faqCategorySchema,
  template: z.string(),
});

export type QuickReplyTemplate = z.infer<typeof quickReplyTemplateSchema>;

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
