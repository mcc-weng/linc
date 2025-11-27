import { 
  type Conversation, 
  type InsertConversation, 
  type Message, 
  type InsertMessage,
  conversations,
  messages,
  type BuyerProfile
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Conversation methods
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationByFacebookPsid(psid: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;

  // Message methods
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Lead analysis methods
  updateLeadAnalysis(conversationId: number, analysis: {
    leadScore: string;
    leadReason: string;
    followUpInDays: number;
    followUpMessage: string;
    buyerProfile: BuyerProfile;
    replySuggestions: string[];
  }): Promise<Conversation | undefined>;
}

// In-memory storage fallback (used when database is unavailable)
export class MemStorage implements IStorage {
  private conversationsMap: Map<number, Conversation>;
  private messagesMap: Map<number, Message[]>;
  private nextConversationId: number;
  private nextMessageId: number;

  constructor() {
    this.conversationsMap = new Map();
    this.messagesMap = new Map();
    this.nextConversationId = 1;
    this.nextMessageId = 1;
    this.initializeMockData();
  }

  private initializeMockData() {
    const now = new Date();
    
    const conv1: Conversation = {
      id: 1,
      buyerName: "王小明",
      lastMessage: "我想找北雪梨區2-3房的公寓，預算120-150萬",
      timestamp: new Date(Date.now() - 3600000),
      platform: "Messenger",
      unreadCount: 2,
      leadScore: "hot",
      facebookPsid: null,
      facebookPageId: null,
      profilePictureUrl: null,
      buyerProfile: null,
      leadReason: null,
      followUpInDays: null,
      followUpMessage: null,
      replySuggestions: null,
    };

    const conv2: Conversation = {
      id: 2,
      buyerName: "李美華",
      lastMessage: "請問Chatswood那邊有適合投資的物件嗎？",
      timestamp: new Date(Date.now() - 7200000),
      platform: "Messenger",
      unreadCount: 0,
      leadScore: "warm",
      facebookPsid: null,
      facebookPageId: null,
      profilePictureUrl: null,
      buyerProfile: null,
      leadReason: null,
      followUpInDays: null,
      followUpMessage: null,
      replySuggestions: null,
    };

    const conv3: Conversation = {
      id: 3,
      buyerName: "張大衛",
      lastMessage: "先了解一下市場行情",
      timestamp: new Date(Date.now() - 86400000),
      platform: "Messenger",
      unreadCount: 0,
      leadScore: "cold",
      facebookPsid: null,
      facebookPageId: null,
      profilePictureUrl: null,
      buyerProfile: null,
      leadReason: null,
      followUpInDays: null,
      followUpMessage: null,
      replySuggestions: null,
    };

    this.conversationsMap.set(1, conv1);
    this.conversationsMap.set(2, conv2);
    this.conversationsMap.set(3, conv3);
    this.nextConversationId = 4;

    this.messagesMap.set(1, [
      {
        id: 1,
        conversationId: 1,
        content: "你好！我想在北雪梨區找房子",
        role: "buyer",
        timestamp: new Date(Date.now() - 3600000 - 1800000),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
      },
      {
        id: 2,
        conversationId: 1,
        content: "您好！很高興為您服務。請問您的預算大概是多少？需要幾房幾衛？",
        role: "agent",
        timestamp: new Date(Date.now() - 3600000 - 1500000),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
      },
      {
        id: 3,
        conversationId: 1,
        content: "我想找2-3房的公寓，預算120-150萬左右",
        role: "buyer",
        timestamp: new Date(Date.now() - 3600000),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 0,
      },
    ]);

    this.messagesMap.set(2, [
      {
        id: 4,
        conversationId: 2,
        content: "請問Chatswood那邊有適合投資的物件嗎？",
        role: "buyer",
        timestamp: new Date(Date.now() - 7200000),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
      },
      {
        id: 5,
        conversationId: 2,
        content: "有的！Chatswood是很好的投資區域。請問您的預算範圍是？",
        role: "agent",
        timestamp: new Date(Date.now() - 7000000),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
      },
    ]);

    this.messagesMap.set(3, [
      {
        id: 6,
        conversationId: 3,
        content: "先了解一下市場行情",
        role: "buyer",
        timestamp: new Date(Date.now() - 86400000),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
      },
    ]);

    this.nextMessageId = 7;
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversationsMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversationsMap.get(id);
  }

  async getConversationByFacebookPsid(psid: string): Promise<Conversation | undefined> {
    return Array.from(this.conversationsMap.values()).find(c => c.facebookPsid === psid);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.nextConversationId++;
    const conversation: Conversation = {
      id,
      buyerName: insertConversation.buyerName,
      lastMessage: insertConversation.lastMessage || "",
      timestamp: new Date(),
      platform: insertConversation.platform || "Messenger",
      unreadCount: insertConversation.unreadCount || 0,
      leadScore: insertConversation.leadScore || null,
      facebookPsid: insertConversation.facebookPsid || null,
      facebookPageId: insertConversation.facebookPageId || null,
      profilePictureUrl: insertConversation.profilePictureUrl || null,
      buyerProfile: insertConversation.buyerProfile || null,
      leadReason: insertConversation.leadReason || null,
      followUpInDays: insertConversation.followUpInDays || null,
      followUpMessage: insertConversation.followUpMessage || null,
      replySuggestions: insertConversation.replySuggestions || null,
    };
    this.conversationsMap.set(id, conversation);
    this.messagesMap.set(id, []);
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversationsMap.get(id);
    if (!conversation) return undefined;
    
    const updated = { ...conversation, ...updates };
    this.conversationsMap.set(id, updated);
    return updated;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return this.messagesMap.get(conversationId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.nextMessageId++;
    const message: Message = {
      id,
      conversationId: insertMessage.conversationId,
      content: insertMessage.content,
      role: insertMessage.role,
      timestamp: new Date(),
      platform: insertMessage.platform || null,
      facebookMessageId: insertMessage.facebookMessageId || null,
      isRead: insertMessage.isRead || 0,
    };

    const messages = this.messagesMap.get(insertMessage.conversationId) || [];
    messages.push(message);
    this.messagesMap.set(insertMessage.conversationId, messages);

    await this.updateConversation(insertMessage.conversationId, {
      lastMessage: insertMessage.content,
      timestamp: message.timestamp,
    });

    return message;
  }

  async updateLeadAnalysis(conversationId: number, analysis: {
    leadScore: string;
    leadReason: string;
    followUpInDays: number;
    followUpMessage: string;
    buyerProfile: BuyerProfile;
    replySuggestions: string[];
  }): Promise<Conversation | undefined> {
    return this.updateConversation(conversationId, {
      leadScore: analysis.leadScore,
      leadReason: analysis.leadReason,
      followUpInDays: analysis.followUpInDays,
      followUpMessage: analysis.followUpMessage,
      buyerProfile: analysis.buyerProfile,
      replySuggestions: analysis.replySuggestions,
    });
  }
}

// Database storage (used when PostgreSQL is available)
export class DatabaseStorage implements IStorage {
  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.timestamp));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByFacebookPsid(psid: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.facebookPsid, psid));
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();

    await db
      .update(conversations)
      .set({ 
        lastMessage: insertMessage.content,
        timestamp: new Date(),
      })
      .where(eq(conversations.id, insertMessage.conversationId));

    return message;
  }

  async updateLeadAnalysis(conversationId: number, analysis: {
    leadScore: string;
    leadReason: string;
    followUpInDays: number;
    followUpMessage: string;
    buyerProfile: BuyerProfile;
    replySuggestions: string[];
  }): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({
        leadScore: analysis.leadScore,
        leadReason: analysis.leadReason,
        followUpInDays: analysis.followUpInDays,
        followUpMessage: analysis.followUpMessage,
        buyerProfile: analysis.buyerProfile,
        replySuggestions: analysis.replySuggestions,
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return conversation || undefined;
  }
}

// Use in-memory storage for now (switch to DatabaseStorage when DB is available)
// To use database: export const storage = new DatabaseStorage();
export const storage = new MemStorage();
