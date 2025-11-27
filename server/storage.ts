import { type Conversation, type InsertConversation, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Conversation methods
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;

  // Message methods
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message[]>;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.initializeMockData();
  }

  private initializeMockData() {
    const now = new Date().toISOString();
    
    const conv1: Conversation = {
      id: "1",
      buyerName: "王小明",
      lastMessage: "我想找北雪梨區2-3房的公寓，預算120-150萬",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      platform: "LINE",
      unreadCount: 2,
      leadScore: "hot",
    };

    const conv2: Conversation = {
      id: "2",
      buyerName: "李美華",
      lastMessage: "請問Chatswood那邊有適合投資的物件嗎？",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      platform: "WhatsApp",
      unreadCount: 0,
      leadScore: "warm",
    };

    const conv3: Conversation = {
      id: "3",
      buyerName: "張大衛",
      lastMessage: "先了解一下市場行情",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      platform: "Email",
      unreadCount: 0,
      leadScore: "cold",
    };

    this.conversations.set("1", conv1);
    this.conversations.set("2", conv2);
    this.conversations.set("3", conv3);

    this.messages.set("1", [
      {
        id: "m1",
        conversationId: "1",
        content: "你好！我想在北雪梨區找房子",
        role: "buyer",
        timestamp: new Date(Date.now() - 3600000 - 1800000).toISOString(),
        platform: "LINE",
      },
      {
        id: "m2",
        conversationId: "1",
        content: "您好！很高興為您服務。請問您的預算大概是多少？需要幾房幾衛？",
        role: "agent",
        timestamp: new Date(Date.now() - 3600000 - 1500000).toISOString(),
      },
      {
        id: "m3",
        conversationId: "1",
        content: "我想找2-3房的公寓，預算120-150萬左右",
        role: "buyer",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        platform: "LINE",
      },
    ]);

    this.messages.set("2", [
      {
        id: "m4",
        conversationId: "2",
        content: "請問Chatswood那邊有適合投資的物件嗎？",
        role: "buyer",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        platform: "WhatsApp",
      },
      {
        id: "m5",
        conversationId: "2",
        content: "有的！Chatswood是很好的投資區域。請問您的預算範圍是？",
        role: "agent",
        timestamp: new Date(Date.now() - 7000000).toISOString(),
      },
    ]);

    this.messages.set("3", [
      {
        id: "m6",
        conversationId: "3",
        content: "先了解一下市場行情",
        role: "buyer",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        platform: "Email",
      },
    ]);
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      lastMessage: "",
      timestamp: new Date().toISOString(),
    };
    this.conversations.set(id, conversation);
    this.messages.set(id, []);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updated = { ...conversation, ...updates };
    this.conversations.set(id, updated);
    return updated;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messages.get(conversationId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date().toISOString(),
    };

    const messages = this.messages.get(insertMessage.conversationId) || [];
    messages.push(message);
    this.messages.set(insertMessage.conversationId, messages);

    await this.updateConversation(insertMessage.conversationId, {
      lastMessage: insertMessage.content,
      timestamp: message.timestamp,
    });

    return message;
  }
}

export const storage = new MemStorage();
