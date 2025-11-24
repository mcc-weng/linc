import { z } from "zod";

// Message Schema
export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  content: z.string(),
  role: z.enum(["buyer", "agent", "system"]),
  timestamp: z.string(),
  platform: z.enum(["LINE", "WhatsApp", "Messenger", "Instagram", "Email"]).optional(),
});

export type Message = z.infer<typeof messageSchema>;

export const insertMessageSchema = messageSchema.omit({ id: true, timestamp: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;

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

// Conversation Schema
export const conversationSchema = z.object({
  id: z.string(),
  buyerName: z.string(),
  lastMessage: z.string(),
  timestamp: z.string(),
  platform: z.enum(["LINE", "WhatsApp", "Messenger", "Instagram", "Email"]),
  unreadCount: z.number().optional(),
  leadScore: z.enum(["hot", "warm", "cold"]).optional(),
  lastAnalysis: leadAnalysisResponseSchema.optional().nullable(),
  lastAnalysisTimestamp: z.string().optional().nullable(),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const insertConversationSchema = conversationSchema.omit({ id: true, timestamp: true, lastMessage: true, lastAnalysis: true, lastAnalysisTimestamp: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Lead Analysis Request Schema
export const leadAnalysisRequestSchema = z.object({
  conversationId: z.string(),
});

export type LeadAnalysisRequest = z.infer<typeof leadAnalysisRequestSchema>;
