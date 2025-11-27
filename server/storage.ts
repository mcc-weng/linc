import {
  conversations,
  messages,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type ConversationResponse,
  type MessageResponse,
  type LeadAnalysisResponse,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getConversations(): Promise<ConversationResponse[]>;
  getConversation(id: string): Promise<ConversationResponse | undefined>;
  getConversationByExternalId(externalSenderId: string, platform: string): Promise<ConversationResponse | undefined>;
  createConversation(conversation: InsertConversation): Promise<ConversationResponse>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<ConversationResponse | undefined>;

  getMessages(conversationId: string): Promise<MessageResponse[]>;
  createMessage(message: InsertMessage): Promise<MessageResponse>;
}

function toConversationResponse(conv: Conversation): ConversationResponse {
  return {
    ...conv,
    id: String(conv.id),
    timestamp: conv.timestamp.toISOString(),
    lastAnalysisTimestamp: conv.lastAnalysisTimestamp?.toISOString() ?? null,
  };
}

function toMessageResponse(msg: Message): MessageResponse {
  return {
    ...msg,
    id: String(msg.id),
    conversationId: String(msg.conversationId),
    timestamp: msg.timestamp.toISOString(),
  };
}

export class DatabaseStorage implements IStorage {
  async getConversations(): Promise<ConversationResponse[]> {
    const results = await db.select().from(conversations).orderBy(desc(conversations.timestamp));
    return results.map(toConversationResponse);
  }

  async getConversation(id: string): Promise<ConversationResponse | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, parseInt(id)));
    return conv ? toConversationResponse(conv) : undefined;
  }

  async getConversationByExternalId(externalSenderId: string, platform: string): Promise<ConversationResponse | undefined> {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalSenderId, externalSenderId));
    return conv ? toConversationResponse(conv) : undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<ConversationResponse> {
    const [conv] = await db.insert(conversations).values(insertConversation).returning();
    return toConversationResponse(conv);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<ConversationResponse | undefined> {
    const [conv] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, parseInt(id)))
      .returning();
    return conv ? toConversationResponse(conv) : undefined;
  }

  async getMessages(conversationId: string): Promise<MessageResponse[]> {
    const results = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, parseInt(conversationId)))
      .orderBy(messages.timestamp);
    return results.map(toMessageResponse);
  }

  async createMessage(insertMessage: InsertMessage): Promise<MessageResponse> {
    const [msg] = await db.insert(messages).values(insertMessage).returning();

    await db
      .update(conversations)
      .set({
        lastMessage: insertMessage.content,
        timestamp: new Date(),
      })
      .where(eq(conversations.id, insertMessage.conversationId));

    return toMessageResponse(msg);
  }
}

export const storage = new DatabaseStorage();
