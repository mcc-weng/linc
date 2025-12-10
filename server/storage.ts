import { 
  type Conversation, 
  type InsertConversation, 
  type Message, 
  type InsertMessage,
  type Listing,
  type InsertListing,
  type FollowUpLog,
  type InsertFollowUpLog,
  type ConversationListing,
  type InsertConversationListing,
  type BuyerProfile,
  type AISummary,
  type DashboardData,
  type DashboardConversation,
  conversations,
  messages,
  listings,
  followUpLogs,
  conversationListings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt, isNull, or } from "drizzle-orm";

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

  // Listing methods
  getListings(): Promise<Listing[]>;
  getListing(id: number): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: number, updates: Partial<Listing>): Promise<Listing | undefined>;
  deleteListing(id: number): Promise<boolean>;

  // Conversation Listings methods (multi-listing support)
  getConversationListings(conversationId: number): Promise<Listing[]>;
  linkListingToConversation(conversationId: number, listingId: number): Promise<ConversationListing>;
  unlinkListingFromConversation(conversationId: number, listingId: number): Promise<boolean>;
  setPrimaryListing(conversationId: number, listingId: number): Promise<Conversation | undefined>;
  updateConversationListingUsage(conversationId: number, listingId: number): Promise<void>;

  // Follow-up methods
  getConversationsNeedingFollowUp(hoursThreshold: number): Promise<Conversation[]>;
  updateFollowUpStatus(conversationId: number, needsFollowUp: boolean): Promise<void>;
  logFollowUpAction(log: InsertFollowUpLog): Promise<FollowUpLog>;
  getFollowUpLogs(conversationId: number): Promise<FollowUpLog[]>;

  // AI Summary methods
  updateAISummary(conversationId: number, summary: AISummary): Promise<Conversation | undefined>;

  // Dashboard methods
  getDashboardData(): Promise<{
    needsFollowUp: Conversation[];
    hotLeads: Conversation[];
    unread: Conversation[];
    stats: {
      totalConversations: number;
      hotLeadsCount: number;
      warmLeadsCount: number;
      coldLeadsCount: number;
      avgResponseTimeHours: number;
    };
  }>;
}

// In-memory storage fallback (used when database is unavailable)
export class MemStorage implements IStorage {
  private conversationsMap: Map<number, Conversation>;
  private messagesMap: Map<number, Message[]>;
  private listingsMap: Map<number, Listing>;
  private followUpLogsMap: Map<number, FollowUpLog[]>;
  private conversationListingsMap: Map<number, ConversationListing[]>;
  private englishConversationsMap: Map<number, Conversation>;
  private englishMessagesMap: Map<number, Message[]>;
  private nextConversationId: number;
  private nextMessageId: number;
  private nextListingId: number;
  private nextFollowUpLogId: number;
  private nextConversationListingId: number;
  private currentLanguage: "zh" | "en" = "zh";

  constructor() {
    this.conversationsMap = new Map();
    this.messagesMap = new Map();
    this.englishConversationsMap = new Map();
    this.englishMessagesMap = new Map();
    this.listingsMap = new Map();
    this.followUpLogsMap = new Map();
    this.conversationListingsMap = new Map();
    this.nextConversationId = 1;
    this.nextMessageId = 1;
    this.nextListingId = 1;
    this.nextFollowUpLogId = 1;
    this.nextConversationListingId = 1;
    this.initializeMockData();
  }

  setLanguage(language: "zh" | "en") {
    this.currentLanguage = language;
  }

  private initializeMockData() {
    // Create sample listings
    const sampleListing1: Listing = {
      id: 1,
      title: "Chatswood 精品公寓",
      address: "123 Victoria Avenue, Chatswood NSW 2067",
      priceGuide: "$1,200,000 - $1,350,000",
      inspectionTimes: "週六 10:00-10:30, 週日 11:00-11:30",
      strataFee: "$1,200/季",
      contractLink: "https://example.com/contract",
      infoPackLink: "https://example.com/infopack",
      floorplanUrl: "https://example.com/floorplan",
      agentName: "王經紀",
      agentMobile: "0412 345 678",
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      propertyType: "apartment",
      isActive: 1,
      createdAt: new Date(),
      inspectionAvailableDate: "2025-12-07",
      inspectionAvailableTime: "10:00-12:00, 14:00-16:00",
    };
    this.listingsMap.set(1, sampleListing1);

    const sampleListing2: Listing = {
      id: 2,
      title: "North Sydney 海景豪宅",
      address: "88 Berry Street, North Sydney NSW 2060",
      priceGuide: "$2,500,000 - $2,800,000",
      inspectionTimes: "週六 11:00-11:30",
      strataFee: "$2,500/季",
      contractLink: "https://example.com/contract2",
      infoPackLink: "https://example.com/infopack2",
      floorplanUrl: "https://example.com/floorplan2",
      agentName: "王經紀",
      agentMobile: "0412 345 678",
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      propertyType: "apartment",
      isActive: 1,
      createdAt: new Date(),
      inspectionAvailableDate: "2025-12-08",
      inspectionAvailableTime: "09:00-11:00",
    };
    this.listingsMap.set(2, sampleListing2);

    const sampleListing3: Listing = {
      id: 3,
      title: "Lane Cove 花園別墅",
      address: "25 Longueville Road, Lane Cove NSW 2066",
      priceGuide: "$1,800,000 - $2,000,000",
      inspectionTimes: "週日 14:00-14:30",
      strataFee: null,
      contractLink: "https://example.com/contract3",
      infoPackLink: null,
      floorplanUrl: "https://example.com/floorplan3",
      agentName: "王經紀",
      agentMobile: "0412 345 678",
      bedrooms: 4,
      bathrooms: 3,
      parking: 2,
      propertyType: "house",
      isActive: 1,
      createdAt: new Date(),
      inspectionAvailableDate: "2025-12-14",
      inspectionAvailableTime: "13:00-17:00",
    };
    this.listingsMap.set(3, sampleListing3);

    this.nextListingId = 4;

    const now = new Date();
    const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600000);
    
    const conv1: Conversation = {
      id: 1,
      buyerName: "王小明",
      lastMessage: "我想找北雪梨區2-3房的公寓，預算120-150萬",
      timestamp: hoursAgo(2),
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
      lastBuyerMessageAt: hoursAgo(2),
      lastAgentMessageAt: hoursAgo(3),
      needsFollowUp: 0,
      autoFollowUpEnabled: 0,
      lastAutoFollowUpAt: null,
      followUpSentCount: 0,
      aiSummary: null,
      aiSummaryUpdatedAt: null,
      listingId: 1,
      needsAttention: 1,
      waitingForDocuments: 0,
    };

    const conv2: Conversation = {
      id: 2,
      buyerName: "李美華",
      lastMessage: "請問Chatswood那邊有適合投資的物件嗎？",
      timestamp: hoursAgo(14),
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
      lastBuyerMessageAt: hoursAgo(14),
      lastAgentMessageAt: hoursAgo(12),
      needsFollowUp: 1,
      autoFollowUpEnabled: 1,
      lastAutoFollowUpAt: null,
      followUpSentCount: 0,
      aiSummary: null,
      aiSummaryUpdatedAt: null,
      listingId: null,
      needsAttention: 1,
      waitingForDocuments: 0,
    };

    const conv3: Conversation = {
      id: 3,
      buyerName: "張大衛",
      lastMessage: "可以發合約給我看看嗎？",
      timestamp: hoursAgo(24),
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
      lastBuyerMessageAt: hoursAgo(24),
      lastAgentMessageAt: hoursAgo(20),
      needsFollowUp: 0,
      autoFollowUpEnabled: 0,
      lastAutoFollowUpAt: null,
      followUpSentCount: 0,
      aiSummary: null,
      aiSummaryUpdatedAt: null,
      listingId: 1,
      needsAttention: 0,
      waitingForDocuments: 1,
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
        timestamp: hoursAgo(4),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 2,
        conversationId: 1,
        content: "您好！很高興為您服務。請問您的預算大概是多少？需要幾房幾衛？",
        role: "agent",
        timestamp: hoursAgo(3),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 3,
        conversationId: 1,
        content: "我想找2-3房的公寓，預算120-150萬左右",
        role: "buyer",
        timestamp: hoursAgo(2),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 0,
        isAutoFollowUp: 0,
      },
    ]);

    this.messagesMap.set(2, [
      {
        id: 4,
        conversationId: 2,
        content: "請問Chatswood那邊有適合投資的物件嗎？",
        role: "buyer",
        timestamp: hoursAgo(14),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 5,
        conversationId: 2,
        content: "有的！Chatswood是很好的投資區域。請問您的預算範圍是？",
        role: "agent",
        timestamp: hoursAgo(12),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
    ]);

    this.messagesMap.set(3, [
      {
        id: 6,
        conversationId: 3,
        content: "我對Victoria Avenue那間公寓有興趣",
        role: "buyer",
        timestamp: hoursAgo(26),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 7,
        conversationId: 3,
        content: "好的！那是一間很棒的物件，您想了解哪方面的資訊？",
        role: "agent",
        timestamp: hoursAgo(25),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 8,
        conversationId: 3,
        content: "可以發合約給我看看嗎？",
        role: "buyer",
        timestamp: hoursAgo(24),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
    ]);

    this.nextMessageId = 9;

    // English mock data
    const engConv1: Conversation = {
      id: 1,
      buyerName: "Alex Wang",
      lastMessage: "I'm looking for a 2-3 bedroom apartment in North Sydney, budget around $1.2-1.5M",
      timestamp: hoursAgo(2),
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
      lastBuyerMessageAt: hoursAgo(2),
      lastAgentMessageAt: hoursAgo(3),
      needsFollowUp: 0,
      autoFollowUpEnabled: 0,
      lastAutoFollowUpAt: null,
      followUpSentCount: 0,
      aiSummary: null,
      aiSummaryUpdatedAt: null,
      listingId: 1,
      needsAttention: 1,
      waitingForDocuments: 0,
    };

    const engConv2: Conversation = {
      id: 2,
      buyerName: "Michelle Li",
      lastMessage: "Do you have any investment properties in Chatswood?",
      timestamp: hoursAgo(14),
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
      lastBuyerMessageAt: hoursAgo(14),
      lastAgentMessageAt: hoursAgo(12),
      needsFollowUp: 1,
      autoFollowUpEnabled: 1,
      lastAutoFollowUpAt: null,
      followUpSentCount: 0,
      aiSummary: null,
      aiSummaryUpdatedAt: null,
      listingId: null,
      needsAttention: 1,
      waitingForDocuments: 0,
    };

    const engConv3: Conversation = {
      id: 3,
      buyerName: "David Zhang",
      lastMessage: "Can you send me the contract for review?",
      timestamp: hoursAgo(24),
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
      lastBuyerMessageAt: hoursAgo(24),
      lastAgentMessageAt: hoursAgo(20),
      needsFollowUp: 0,
      autoFollowUpEnabled: 0,
      lastAutoFollowUpAt: null,
      followUpSentCount: 0,
      aiSummary: null,
      aiSummaryUpdatedAt: null,
      listingId: 1,
      needsAttention: 0,
      waitingForDocuments: 1,
    };

    this.englishConversationsMap.set(1, engConv1);
    this.englishConversationsMap.set(2, engConv2);
    this.englishConversationsMap.set(3, engConv3);

    this.englishMessagesMap.set(1, [
      {
        id: 1,
        conversationId: 1,
        content: "Hi! I'm interested in finding a home in North Sydney",
        role: "buyer",
        timestamp: hoursAgo(4),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 2,
        conversationId: 1,
        content: "Hello! I'd be happy to help you. What's your budget and how many bedrooms do you need?",
        role: "agent",
        timestamp: hoursAgo(3),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 3,
        conversationId: 1,
        content: "I'm looking for a 2-3 bedroom apartment, budget around $1.2-1.5 million",
        role: "buyer",
        timestamp: hoursAgo(2),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 0,
        isAutoFollowUp: 0,
      },
    ]);

    this.englishMessagesMap.set(2, [
      {
        id: 4,
        conversationId: 2,
        content: "Do you have any investment properties in Chatswood?",
        role: "buyer",
        timestamp: hoursAgo(14),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 5,
        conversationId: 2,
        content: "Yes! Chatswood is a great investment area. What's your budget range?",
        role: "agent",
        timestamp: hoursAgo(12),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
    ]);

    this.englishMessagesMap.set(3, [
      {
        id: 6,
        conversationId: 3,
        content: "I'm interested in the apartment on Victoria Avenue",
        role: "buyer",
        timestamp: hoursAgo(26),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 7,
        conversationId: 3,
        content: "Great choice! That's a wonderful property. What information would you like?",
        role: "agent",
        timestamp: hoursAgo(25),
        platform: null,
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
      {
        id: 8,
        conversationId: 3,
        content: "Can you send me the contract for review?",
        role: "buyer",
        timestamp: hoursAgo(24),
        platform: "Messenger",
        facebookMessageId: null,
        isRead: 1,
        isAutoFollowUp: 0,
      },
    ]);
  }

  async getConversations(): Promise<Conversation[]> {
    const map = this.currentLanguage === "en" ? this.englishConversationsMap : this.conversationsMap;
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const map = this.currentLanguage === "en" ? this.englishConversationsMap : this.conversationsMap;
    return map.get(id);
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
      lastBuyerMessageAt: insertConversation.lastBuyerMessageAt || null,
      lastAgentMessageAt: insertConversation.lastAgentMessageAt || null,
      needsFollowUp: insertConversation.needsFollowUp || 0,
      autoFollowUpEnabled: insertConversation.autoFollowUpEnabled || 0,
      lastAutoFollowUpAt: insertConversation.lastAutoFollowUpAt || null,
      followUpSentCount: insertConversation.followUpSentCount || 0,
      aiSummary: insertConversation.aiSummary || null,
      aiSummaryUpdatedAt: insertConversation.aiSummaryUpdatedAt || null,
      listingId: insertConversation.listingId || null,
      needsAttention: insertConversation.needsAttention || 0,
      waitingForDocuments: insertConversation.waitingForDocuments || 0,
    };
    // Store to both maps to ensure visibility regardless of language context
    this.conversationsMap.set(id, conversation);
    this.englishConversationsMap.set(id, conversation);
    this.messagesMap.set(id, []);
    this.englishMessagesMap.set(id, []);
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
    const map = this.currentLanguage === "en" ? this.englishMessagesMap : this.messagesMap;
    return map.get(conversationId) || [];
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
      isAutoFollowUp: insertMessage.isAutoFollowUp || 0,
    };

    const messages = this.messagesMap.get(insertMessage.conversationId) || [];
    messages.push(message);
    this.messagesMap.set(insertMessage.conversationId, messages);

    // Update conversation with last message and activity timestamps
    const updates: Partial<Conversation> = {
      lastMessage: insertMessage.content,
      timestamp: message.timestamp,
    };

    if (insertMessage.role === "buyer") {
      updates.lastBuyerMessageAt = message.timestamp;
      updates.needsFollowUp = 0; // Reset follow-up flag when buyer responds
    } else if (insertMessage.role === "agent") {
      updates.lastAgentMessageAt = message.timestamp;
    }

    await this.updateConversation(insertMessage.conversationId, updates);

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

  // Listing methods
  async getListings(): Promise<Listing[]> {
    return Array.from(this.listingsMap.values()).filter(l => l.isActive === 1);
  }

  async getListing(id: number): Promise<Listing | undefined> {
    return this.listingsMap.get(id);
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const id = this.nextListingId++;
    const listing: Listing = {
      id,
      title: insertListing.title,
      address: insertListing.address || null,
      priceGuide: insertListing.priceGuide || null,
      inspectionTimes: insertListing.inspectionTimes || null,
      strataFee: insertListing.strataFee || null,
      contractLink: insertListing.contractLink || null,
      infoPackLink: insertListing.infoPackLink || null,
      floorplanUrl: insertListing.floorplanUrl || null,
      agentName: insertListing.agentName || null,
      agentMobile: insertListing.agentMobile || null,
      bedrooms: insertListing.bedrooms || null,
      bathrooms: insertListing.bathrooms || null,
      parking: insertListing.parking || null,
      propertyType: insertListing.propertyType || null,
      isActive: insertListing.isActive ?? 1,
      createdAt: new Date(),
      inspectionAvailableDate: insertListing.inspectionAvailableDate || null,
      inspectionAvailableTime: insertListing.inspectionAvailableTime || null,
    };
    this.listingsMap.set(id, listing);
    return listing;
  }

  async updateListing(id: number, updates: Partial<Listing>): Promise<Listing | undefined> {
    const listing = this.listingsMap.get(id);
    if (!listing) return undefined;
    
    const updated = { ...listing, ...updates };
    this.listingsMap.set(id, updated);
    return updated;
  }

  async deleteListing(id: number): Promise<boolean> {
    return this.listingsMap.delete(id);
  }

  // Conversation Listings methods (multi-listing support)
  async getConversationListings(conversationId: number): Promise<Listing[]> {
    const links = this.conversationListingsMap.get(conversationId) || [];
    const listings: Listing[] = [];
    for (const link of links) {
      const listing = this.listingsMap.get(link.listingId);
      if (listing && listing.isActive === 1) {
        listings.push(listing);
      }
    }
    return listings;
  }

  async linkListingToConversation(conversationId: number, listingId: number): Promise<ConversationListing> {
    const existingLinks = this.conversationListingsMap.get(conversationId) || [];
    
    // Check if already linked
    const existingLink = existingLinks.find(l => l.listingId === listingId);
    if (existingLink) {
      return existingLink;
    }

    const id = this.nextConversationListingId++;
    const link: ConversationListing = {
      id,
      conversationId,
      listingId,
      linkedAt: new Date(),
      lastUsedAt: new Date(),
    };
    
    existingLinks.push(link);
    this.conversationListingsMap.set(conversationId, existingLinks);
    return link;
  }

  async unlinkListingFromConversation(conversationId: number, listingId: number): Promise<boolean> {
    const links = this.conversationListingsMap.get(conversationId) || [];
    const filtered = links.filter(l => l.listingId !== listingId);
    
    if (filtered.length === links.length) {
      return false; // Nothing was removed
    }
    
    this.conversationListingsMap.set(conversationId, filtered);
    
    // If this was the primary listing, clear it
    const conversation = this.conversationsMap.get(conversationId);
    if (conversation && conversation.listingId === listingId) {
      await this.updateConversation(conversationId, { listingId: null });
    }
    
    return true;
  }

  async setPrimaryListing(conversationId: number, listingId: number): Promise<Conversation | undefined> {
    // Ensure the listing is linked to the conversation
    await this.linkListingToConversation(conversationId, listingId);
    
    // Update the primary listing
    return this.updateConversation(conversationId, { listingId });
  }

  async updateConversationListingUsage(conversationId: number, listingId: number): Promise<void> {
    const links = this.conversationListingsMap.get(conversationId) || [];
    const link = links.find(l => l.listingId === listingId);
    if (link) {
      link.lastUsedAt = new Date();
    }
  }

  // Follow-up methods
  async getConversationsNeedingFollowUp(hoursThreshold: number): Promise<Conversation[]> {
    const thresholdTime = new Date(Date.now() - hoursThreshold * 3600000);
    
    return Array.from(this.conversationsMap.values()).filter(conv => {
      // Must have buyer message after last agent message
      if (!conv.lastBuyerMessageAt) return false;
      
      const lastBuyerTime = new Date(conv.lastBuyerMessageAt).getTime();
      const lastAgentTime = conv.lastAgentMessageAt ? new Date(conv.lastAgentMessageAt).getTime() : 0;
      
      // Buyer messaged after agent's last message, and it's been longer than threshold
      return lastBuyerTime > lastAgentTime && lastBuyerTime < thresholdTime.getTime();
    });
  }

  async updateFollowUpStatus(conversationId: number, needsFollowUp: boolean): Promise<void> {
    await this.updateConversation(conversationId, { needsFollowUp: needsFollowUp ? 1 : 0 });
  }

  async logFollowUpAction(log: InsertFollowUpLog): Promise<FollowUpLog> {
    const id = this.nextFollowUpLogId++;
    const followUpLog: FollowUpLog = {
      id,
      conversationId: log.conversationId,
      actionType: log.actionType,
      message: log.message || null,
      triggeredAt: new Date(),
      sentAt: log.sentAt || null,
    };
    
    const logs = this.followUpLogsMap.get(log.conversationId) || [];
    logs.push(followUpLog);
    this.followUpLogsMap.set(log.conversationId, logs);
    
    return followUpLog;
  }

  async getFollowUpLogs(conversationId: number): Promise<FollowUpLog[]> {
    return this.followUpLogsMap.get(conversationId) || [];
  }

  // AI Summary methods
  async updateAISummary(conversationId: number, summary: AISummary): Promise<Conversation | undefined> {
    return this.updateConversation(conversationId, {
      aiSummary: summary,
      aiSummaryUpdatedAt: new Date(),
    });
  }

  // Dashboard methods - returns format expected by frontend
  async getDashboardData(): Promise<{
    needsFollowUp: Conversation[];
    hotLeads: Conversation[];
    unread: Conversation[];
    stats: {
      totalConversations: number;
      hotLeadsCount: number;
      warmLeadsCount: number;
      coldLeadsCount: number;
      avgResponseTimeHours: number;
    };
  }> {
    const allConversations = Array.from(this.conversationsMap.values());
    const now = Date.now();

    // Conversations needing follow-up (inactive > 12 hours with no agent response)
    const needsFollowUp = allConversations.filter(conv => {
      if (!conv.lastBuyerMessageAt) return false;
      const buyerTime = new Date(conv.lastBuyerMessageAt).getTime();
      const agentTime = conv.lastAgentMessageAt ? new Date(conv.lastAgentMessageAt).getTime() : 0;
      const hoursInactive = (now - buyerTime) / 3600000;
      return buyerTime > agentTime && hoursInactive > 12;
    });

    // Hot leads
    const hotLeads = allConversations.filter(conv => conv.leadScore === "hot");
    
    // Warm leads
    const warmLeads = allConversations.filter(conv => conv.leadScore === "warm");
    
    // Cold leads
    const coldLeads = allConversations.filter(conv => conv.leadScore === "cold");

    // Unread messages
    const unread = allConversations.filter(conv => (conv.unreadCount || 0) > 0);

    // Calculate average response time (hours between buyer message and agent response)
    let totalResponseTime = 0;
    let responseCount = 0;
    for (const conv of allConversations) {
      if (conv.lastBuyerMessageAt && conv.lastAgentMessageAt) {
        const buyerTime = new Date(conv.lastBuyerMessageAt).getTime();
        const agentTime = new Date(conv.lastAgentMessageAt).getTime();
        if (agentTime > buyerTime) {
          totalResponseTime += (agentTime - buyerTime) / 3600000;
          responseCount++;
        }
      }
    }
    const avgResponseTimeHours = responseCount > 0 ? totalResponseTime / responseCount : 0;

    return {
      needsFollowUp,
      hotLeads,
      unread,
      stats: {
        totalConversations: allConversations.length,
        hotLeadsCount: hotLeads.length,
        warmLeadsCount: warmLeads.length,
        coldLeadsCount: coldLeads.length,
        avgResponseTimeHours,
      },
    };
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

    // Update conversation with last message and activity timestamps
    const updates: Partial<Conversation> = {
      lastMessage: insertMessage.content,
      timestamp: new Date(),
    };

    if (insertMessage.role === "buyer") {
      updates.lastBuyerMessageAt = new Date();
      updates.needsFollowUp = 0;
    } else if (insertMessage.role === "agent") {
      updates.lastAgentMessageAt = new Date();
    }

    await db
      .update(conversations)
      .set(updates)
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

  // Listing methods
  async getListings(): Promise<Listing[]> {
    return await db.select().from(listings).where(eq(listings.isActive, 1));
  }

  async getListing(id: number): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing || undefined;
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const [listing] = await db.insert(listings).values(insertListing).returning();
    return listing;
  }

  async updateListing(id: number, updates: Partial<Listing>): Promise<Listing | undefined> {
    const [listing] = await db
      .update(listings)
      .set(updates)
      .where(eq(listings.id, id))
      .returning();
    return listing || undefined;
  }

  async deleteListing(id: number): Promise<boolean> {
    const result = await db.delete(listings).where(eq(listings.id, id));
    return true;
  }

  // Conversation Listings methods (multi-listing support)
  async getConversationListings(conversationId: number): Promise<Listing[]> {
    const links = await db
      .select()
      .from(conversationListings)
      .where(eq(conversationListings.conversationId, conversationId));
    
    const listingsList: Listing[] = [];
    for (const link of links) {
      const [listing] = await db.select().from(listings).where(
        and(eq(listings.id, link.listingId), eq(listings.isActive, 1))
      );
      if (listing) {
        listingsList.push(listing);
      }
    }
    return listingsList;
  }

  async linkListingToConversation(conversationId: number, listingId: number): Promise<ConversationListing> {
    // Check if already linked
    const [existing] = await db
      .select()
      .from(conversationListings)
      .where(
        and(
          eq(conversationListings.conversationId, conversationId),
          eq(conversationListings.listingId, listingId)
        )
      );
    
    if (existing) {
      return existing;
    }

    const [link] = await db
      .insert(conversationListings)
      .values({ conversationId, listingId })
      .returning();
    return link;
  }

  async unlinkListingFromConversation(conversationId: number, listingId: number): Promise<boolean> {
    await db
      .delete(conversationListings)
      .where(
        and(
          eq(conversationListings.conversationId, conversationId),
          eq(conversationListings.listingId, listingId)
        )
      );
    
    // If this was the primary listing, clear it
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (conversation && conversation.listingId === listingId) {
      await db.update(conversations).set({ listingId: null }).where(eq(conversations.id, conversationId));
    }
    
    return true;
  }

  async setPrimaryListing(conversationId: number, listingId: number): Promise<Conversation | undefined> {
    // Ensure the listing is linked to the conversation
    await this.linkListingToConversation(conversationId, listingId);
    
    // Update the primary listing
    const [conversation] = await db
      .update(conversations)
      .set({ listingId })
      .where(eq(conversations.id, conversationId))
      .returning();
    return conversation || undefined;
  }

  async updateConversationListingUsage(conversationId: number, listingId: number): Promise<void> {
    await db
      .update(conversationListings)
      .set({ lastUsedAt: new Date() })
      .where(
        and(
          eq(conversationListings.conversationId, conversationId),
          eq(conversationListings.listingId, listingId)
        )
      );
  }

  // Follow-up methods
  async getConversationsNeedingFollowUp(hoursThreshold: number): Promise<Conversation[]> {
    const thresholdTime = new Date(Date.now() - hoursThreshold * 3600000);
    // This is a simplified query - in production you'd want more complex SQL
    const allConvs = await this.getConversations();
    return allConvs.filter(conv => {
      if (!conv.lastBuyerMessageAt) return false;
      const buyerTime = new Date(conv.lastBuyerMessageAt).getTime();
      const agentTime = conv.lastAgentMessageAt ? new Date(conv.lastAgentMessageAt).getTime() : 0;
      return buyerTime > agentTime && buyerTime < thresholdTime.getTime();
    });
  }

  async updateFollowUpStatus(conversationId: number, needsFollowUp: boolean): Promise<void> {
    await db
      .update(conversations)
      .set({ needsFollowUp: needsFollowUp ? 1 : 0 })
      .where(eq(conversations.id, conversationId));
  }

  async logFollowUpAction(log: InsertFollowUpLog): Promise<FollowUpLog> {
    const [followUpLog] = await db.insert(followUpLogs).values(log).returning();
    return followUpLog;
  }

  async getFollowUpLogs(conversationId: number): Promise<FollowUpLog[]> {
    return await db
      .select()
      .from(followUpLogs)
      .where(eq(followUpLogs.conversationId, conversationId))
      .orderBy(desc(followUpLogs.triggeredAt));
  }

  // AI Summary methods
  async updateAISummary(conversationId: number, summary: AISummary): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({
        aiSummary: summary,
        aiSummaryUpdatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return conversation || undefined;
  }

  // Dashboard methods - returns format expected by frontend
  async getDashboardData(): Promise<{
    needsFollowUp: Conversation[];
    hotLeads: Conversation[];
    unread: Conversation[];
    stats: {
      totalConversations: number;
      hotLeadsCount: number;
      warmLeadsCount: number;
      coldLeadsCount: number;
      avgResponseTimeHours: number;
    };
  }> {
    const allConversations = await this.getConversations();
    const now = Date.now();

    // Conversations needing follow-up (inactive > 12 hours with no agent response)
    const needsFollowUp = allConversations.filter(conv => {
      if (!conv.lastBuyerMessageAt) return false;
      const buyerTime = new Date(conv.lastBuyerMessageAt).getTime();
      const agentTime = conv.lastAgentMessageAt ? new Date(conv.lastAgentMessageAt).getTime() : 0;
      const hoursInactive = (now - buyerTime) / 3600000;
      return buyerTime > agentTime && hoursInactive > 12;
    });

    // Hot leads
    const hotLeads = allConversations.filter(conv => conv.leadScore === "hot");
    
    // Warm leads
    const warmLeads = allConversations.filter(conv => conv.leadScore === "warm");
    
    // Cold leads
    const coldLeads = allConversations.filter(conv => conv.leadScore === "cold");

    // Unread messages
    const unread = allConversations.filter(conv => (conv.unreadCount || 0) > 0);

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    for (const conv of allConversations) {
      if (conv.lastBuyerMessageAt && conv.lastAgentMessageAt) {
        const buyerTime = new Date(conv.lastBuyerMessageAt).getTime();
        const agentTime = new Date(conv.lastAgentMessageAt).getTime();
        if (agentTime > buyerTime) {
          totalResponseTime += (agentTime - buyerTime) / 3600000;
          responseCount++;
        }
      }
    }
    const avgResponseTimeHours = responseCount > 0 ? totalResponseTime / responseCount : 0;

    return {
      needsFollowUp,
      hotLeads,
      unread,
      stats: {
        totalConversations: allConversations.length,
        hotLeadsCount: hotLeads.length,
        warmLeadsCount: warmLeads.length,
        coldLeadsCount: coldLeads.length,
        avgResponseTimeHours,
      },
    };
  }
}

// Use in-memory storage for now (switch to DatabaseStorage when DB is available)
export const storage = new MemStorage();
