import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeConversation, generateFollowUpSuggestions, generateAISummary, generatePropertyRecommendations } from "./openai";
import { insertMessageSchema, leadAnalysisRequestSchema, insertListingSchema } from "@shared/schema";
import { detectFAQKeywords, getQuickReplyTemplates, generateQuickReply } from "./faq";
import { 
  getVerifyToken, 
  processWebhookMessage, 
  sendMessage, 
  syncFacebookConversations,
  verifyWebhookSignature,
  isFacebookConfigured
} from "./facebook";

export async function registerRoutes(app: Express): Promise<Server> {
  // ==========================================
  // Facebook Messenger Webhook Endpoints
  // ==========================================

  // Webhook verification (GET) - Facebook will call this to verify your webhook
  app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe") {
        try {
          const verifyToken = getVerifyToken();
          if (token === verifyToken) {
            console.log("Webhook verified successfully");
            return res.status(200).send(challenge);
          }
        } catch (error) {
          console.log("FACEBOOK_VERIFY_TOKEN not set - webhook verification skipped");
        }
      }
    }
    
    console.log("Webhook verification failed");
    res.sendStatus(403);
  });

  // Webhook event handler (POST) - Receives messages from Facebook
  app.post("/webhook", async (req, res) => {
    // Verify webhook signature for security
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    
    // Use raw body captured by express.json verify option in app.ts
    const rawBody = req.rawBody as Buffer;
    
    if (!rawBody) {
      console.error("No raw body available for signature verification");
      return res.sendStatus(500);
    }
    
    if (!verifyWebhookSignature(rawBody.toString(), signature)) {
      console.error("Webhook signature verification failed");
      return res.sendStatus(403);
    }

    const body = req.body;

    if (body.object === "page") {
      // Process each entry (usually just one)
      for (const entry of body.entry || []) {
        const pageId = entry.id;
        
        // Process each messaging event
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id;
          const recipientId = event.recipient?.id;
          
          if (!senderId) continue;

          // Handle incoming message (or echo of sent message)
          if (event.message && event.message.text) {
            const isEcho = event.message.is_echo === true;
            
            try {
              await processWebhookMessage(
                senderId,
                recipientId || "",
                pageId,
                event.message.mid,
                event.message.text,
                isEcho
              );
            } catch (error) {
              console.error("Error processing webhook message:", error);
            }
          }

          // Handle message read event
          if (event.read) {
            console.log(`Messages read by ${senderId} at ${event.read.watermark}`);
          }

          // Handle message delivery event
          if (event.delivery) {
            console.log(`Messages delivered to ${senderId}`);
          }
        }
      }

      // Always respond 200 OK to acknowledge receipt
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  });

  // Sync Facebook conversations manually
  app.post("/api/facebook/sync", async (req, res) => {
    try {
      if (!isFacebookConfigured()) {
        return res.status(400).json({ 
          error: "Facebook integration not configured. Please set FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_VERIFY_TOKEN, and FACEBOOK_APP_SECRET." 
        });
      }
      
      await syncFacebookConversations();
      res.json({ success: true, message: "Facebook conversations synced" });
    } catch (error) {
      console.error("Error syncing Facebook conversations:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sync";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Send a message via Facebook Messenger
  app.post("/api/facebook/send", async (req, res) => {
    try {
      if (!isFacebookConfigured()) {
        return res.status(400).json({ 
          error: "Facebook integration not configured" 
        });
      }
      
      const { recipientPsid, message, conversationId } = req.body;
      
      if (!recipientPsid || !message) {
        return res.status(400).json({ error: "recipientPsid and message are required" });
      }

      const success = await sendMessage(recipientPsid, message);
      
      if (success) {
        // Also persist the message locally if conversationId is provided
        if (conversationId) {
          try {
            await storage.createMessage({
              conversationId: Number(conversationId),
              content: message,
              role: "agent",
              platform: null,
              isRead: 1,
            });
          } catch (storageError) {
            console.error("Failed to persist outbound message:", storageError);
          }
        }
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    } catch (error) {
      console.error("Error sending Facebook message:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get Facebook integration status
  app.get("/api/facebook/status", (req, res) => {
    const hasPageToken = !!process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const hasVerifyToken = !!process.env.FACEBOOK_VERIFY_TOKEN;
    const hasAppSecret = !!process.env.FACEBOOK_APP_SECRET;
    
    res.json({
      configured: hasPageToken && hasVerifyToken && hasAppSecret,
      pageTokenSet: hasPageToken,
      verifyTokenSet: hasVerifyToken,
      appSecretSet: hasAppSecret,
      webhookUrl: `${req.protocol}://${req.get('host')}/webhook`,
    });
  });

  // ==========================================
  // Conversation Endpoints
  // ==========================================

  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const lang = (req.query.lang as string) || "zh";
      storage.setLanguage(lang === "en" ? "en" : "zh");
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get a single conversation
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const lang = (req.query.lang as string) || "zh";
      storage.setLanguage(lang === "en" ? "en" : "zh");
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create a new message in a conversation (and optionally send via Facebook)
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      
      const validation = insertMessageSchema.safeParse({
        ...req.body,
        conversationId: id,
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid message data",
          details: validation.error.errors,
        });
      }

      // Save message locally
      const message = await storage.createMessage(validation.data);

      // If this is an agent message and conversation has a Facebook PSID, send via Facebook
      if (validation.data.role === "agent") {
        const conversation = await storage.getConversation(id);
        if (conversation?.facebookPsid) {
          try {
            await sendMessage(conversation.facebookPsid, validation.data.content);
            console.log(`Sent message to Facebook user ${conversation.facebookPsid}`);
          } catch (fbError) {
            console.error("Failed to send via Facebook (message saved locally):", fbError);
          }
        }
      }

      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      
      const conversation = await storage.updateConversation(id, { unreadCount: 0 });
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Analyze a conversation with AI
  app.post("/api/conversations/:id/analyze", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const lang = (req.query.lang as string) || "zh";
      const language = lang === "en" ? "en" : "zh";

      const validation = leadAnalysisRequestSchema.safeParse({
        conversationId: id,
      });

      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid analysis request",
          details: validation.error.errors,
        });
      }

      storage.setLanguage(language);
      const messages = await storage.getMessages(id);
      
      if (messages.length === 0) {
        return res.status(400).json({ error: language === "en" ? "No messages to analyze" : "對話沒有訊息可供分析" });
      }

      const analysis = await analyzeConversation(messages, language);

      // Save complete analysis to storage
      await storage.updateLeadAnalysis(id, {
        leadScore: analysis.leadScore,
        leadReason: analysis.leadReason,
        followUpInDays: analysis.followUpInDays,
        followUpMessage: analysis.followUpMessage,
        buyerProfile: analysis.buyerProfile,
        replySuggestions: analysis.replies,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing conversation:", error);
      
      const errorMessage = error instanceof Error ? error.message : "AI analysis error";
      res.status(500).json({ 
        error: errorMessage,
      });
    }
  });

  // ==========================================
  // AI Summary Endpoint
  // ==========================================

  // Get AI summary for a conversation
  app.get("/api/conversations/:id/summary", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Return existing summary if available
      if (conversation.aiSummary) {
        res.json(conversation.aiSummary);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching AI summary:", error);
      res.status(500).json({ error: "Failed to fetch AI summary" });
    }
  });

  // Generate/refresh AI summary for a conversation
  app.post("/api/conversations/:id/summary", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const lang = (req.query.lang as string) || "zh";
      const language = lang === "en" ? "en" : "zh";

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      storage.setLanguage(language);
      const messages = await storage.getMessages(id);
      if (messages.length === 0) {
        return res.status(400).json({ error: language === "en" ? "No messages to analyze" : "對話沒有訊息可供分析" });
      }

      const summary = await generateAISummary(messages, conversation, language);
      await storage.updateAISummary(id, summary);

      res.json(summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      const errorMessage = error instanceof Error ? error.message : "AI summary generation failed";
      res.status(500).json({ error: errorMessage });
    }
  });

  // ==========================================
  // Follow-Up Endpoints
  // ==========================================

  // Get follow-up status and suggestions for a conversation
  app.get("/api/conversations/:id/followup", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await storage.getMessages(id);
      const logs = await storage.getFollowUpLogs(id);

      // Calculate inactivity
      const lastBuyerTime = conversation.lastBuyerMessageAt ? new Date(conversation.lastBuyerMessageAt).getTime() : 0;
      const lastAgentTime = conversation.lastAgentMessageAt ? new Date(conversation.lastAgentMessageAt).getTime() : 0;
      const now = Date.now();
      const hoursInactive = lastBuyerTime > lastAgentTime 
        ? Math.floor((now - lastBuyerTime) / 3600000) 
        : 0;

      res.json({
        needsFollowUp: hoursInactive > 12 && lastBuyerTime > lastAgentTime,
        hoursInactive,
        autoFollowUpEnabled: conversation.autoFollowUpEnabled === 1,
        followUpSentCount: conversation.followUpSentCount || 0,
        lastAutoFollowUpAt: conversation.lastAutoFollowUpAt,
        logs,
      });
    } catch (error) {
      console.error("Error fetching follow-up status:", error);
      res.status(500).json({ error: "Failed to fetch follow-up status" });
    }
  });

  // Generate follow-up suggestions for a conversation
  app.post("/api/conversations/:id/followup/suggestions", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const lang = (req.query.lang as string) || "zh";
      const language = lang === "en" ? "en" : "zh";

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      storage.setLanguage(language);
      const messages = await storage.getMessages(id);
      if (messages.length === 0) {
        return res.status(400).json({ error: language === "en" ? "No messages" : "對話沒有訊息" });
      }

      // Get last 5 messages for context
      const recentMessages = messages.slice(-5);
      const suggestions = await generateFollowUpSuggestions(recentMessages, conversation, language);

      // Log the follow-up suggestion generation
      await storage.logFollowUpAction({
        conversationId: id,
        actionType: "suggested",
        message: suggestions.suggestions.join(" | "),
      });

      res.json(suggestions);
    } catch (error) {
      console.error("Error generating follow-up suggestions:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate follow-up suggestions";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Toggle auto-follow-up for a conversation
  app.post("/api/conversations/:id/followup/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      const conversation = await storage.updateConversation(id, {
        autoFollowUpEnabled: enabled ? 1 : 0,
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json({ success: true, autoFollowUpEnabled: enabled });
    } catch (error) {
      console.error("Error toggling auto-follow-up:", error);
      res.status(500).json({ error: "Failed to toggle auto-follow-up" });
    }
  });

  // ==========================================
  // Property Recommendation Endpoint
  // ==========================================

  // Get AI-powered property recommendations for a conversation
  app.post("/api/conversations/:id/recommendations", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const lang = (req.query.lang as string) || "zh";
      const language = lang === "en" ? "en" : "zh";

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      storage.setLanguage(language);
      const messages = await storage.getMessages(id);
      if (messages.length === 0) {
        return res.status(400).json({ error: language === "en" ? "No messages" : "對話沒有訊息" });
      }

      // Get all available listings
      const allListings = await storage.getListings();
      if (allListings.length === 0) {
        return res.json({
          recommendedListingIds: [],
          recommendedListings: [],
          reasoning: language === "en" ? "No properties available" : "目前沒有可用物件",
          buyerIntent: { budget: null, location: null, propertyType: null, bedrooms: null },
        });
      }

      // Get last 10 messages for context
      const recentMessages = messages.slice(-10);
      const recommendations = await generatePropertyRecommendations(recentMessages, allListings, language);

      // Get full listing details for recommended IDs
      const recommendedListings = allListings.filter(
        l => recommendations.recommendedListingIds.includes(l.id)
      );

      res.json({
        ...recommendations,
        recommendedListings,
      });
    } catch (error) {
      console.error("Error generating property recommendations:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate property recommendations";
      res.status(500).json({ error: errorMessage });
    }
  });

  // ==========================================
  // FAQ & Quick Reply Endpoints
  // ==========================================

  // Detect FAQ keywords in a message
  app.post("/api/faq/detect", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      const detected = detectFAQKeywords(message);
      res.json(detected);
    } catch (error) {
      console.error("Error detecting FAQ keywords:", error);
      res.status(500).json({ error: "Failed to detect FAQ keywords" });
    }
  });

  // Get quick reply templates for a listing
  app.get("/api/quick-replies", async (req, res) => {
    try {
      const listingId = req.query.listingId ? parseInt(req.query.listingId as string, 10) : undefined;
      
      let listing = undefined;
      if (listingId) {
        listing = await storage.getListing(listingId);
      }

      const templates = getQuickReplyTemplates(listing || undefined);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quick reply templates:", error);
      res.status(500).json({ error: "Failed to fetch quick reply templates" });
    }
  });

  // Generate a quick reply message
  app.post("/api/quick-replies/generate", async (req, res) => {
    try {
      const { category, listingId } = req.body;
      if (!category) {
        return res.status(400).json({ error: "category is required" });
      }

      let listing = undefined;
      if (listingId) {
        listing = await storage.getListing(listingId);
      }

      const message = generateQuickReply(category, listing || undefined);
      res.json({ message });
    } catch (error) {
      console.error("Error generating quick reply:", error);
      res.status(500).json({ error: "Failed to generate quick reply" });
    }
  });

  // ==========================================
  // Listing Endpoints
  // ==========================================

  // Get all listings
  app.get("/api/listings", async (req, res) => {
    try {
      const listings = await storage.getListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Get a single listing
  app.get("/api/listings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }
      const listing = await storage.getListing(id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  // Create a new listing
  app.post("/api/listings", async (req, res) => {
    try {
      const validation = insertListingSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid listing data",
          details: validation.error.errors,
        });
      }

      const listing = await storage.createListing(validation.data);
      res.status(201).json(listing);
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  // Update a listing
  app.patch("/api/listings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }

      const listing = await storage.updateListing(id, req.body);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  // Delete a listing
  app.delete("/api/listings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }

      const success = await storage.deleteListing(id);
      if (!success) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  // Associate a listing with a conversation (legacy - sets primary listing)
  app.post("/api/conversations/:id/listing", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { listingId } = req.body;
      
      const conversation = await storage.updateConversation(id, {
        listingId: listingId || null,
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error associating listing:", error);
      res.status(500).json({ error: "Failed to associate listing" });
    }
  });

  // ==========================================
  // Conversation Listings (Multi-Listing Support)
  // ==========================================

  // Get all listings linked to a conversation
  app.get("/api/conversations/:id/listings", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const listings = await storage.getConversationListings(id);
      
      // Include primary listing ID for context
      res.json({
        listings,
        primaryListingId: conversation.listingId,
      });
    } catch (error) {
      console.error("Error fetching conversation listings:", error);
      res.status(500).json({ error: "Failed to fetch conversation listings" });
    }
  });

  // Link a listing to a conversation
  app.post("/api/conversations/:id/listings", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { listingId, setPrimary } = req.body;
      if (!listingId || typeof listingId !== "number") {
        return res.status(400).json({ error: "listingId is required and must be a number" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Link the listing to the conversation
      const link = await storage.linkListingToConversation(id, listingId);

      // If setPrimary is true or this is the first listing, set it as primary
      if (setPrimary === true) {
        await storage.setPrimaryListing(id, listingId);
      }

      const updatedListings = await storage.getConversationListings(id);
      const updatedConversation = await storage.getConversation(id);

      res.status(201).json({
        link,
        listings: updatedListings,
        primaryListingId: updatedConversation?.listingId,
      });
    } catch (error) {
      console.error("Error linking listing to conversation:", error);
      res.status(500).json({ error: "Failed to link listing to conversation" });
    }
  });

  // Unlink a listing from a conversation
  app.delete("/api/conversations/:id/listings/:listingId", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id, 10);
      const listingId = parseInt(req.params.listingId, 10);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (isNaN(listingId)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await storage.unlinkListingFromConversation(conversationId, listingId);

      const updatedListings = await storage.getConversationListings(conversationId);
      const updatedConversation = await storage.getConversation(conversationId);

      res.json({
        success: true,
        listings: updatedListings,
        primaryListingId: updatedConversation?.listingId,
      });
    } catch (error) {
      console.error("Error unlinking listing from conversation:", error);
      res.status(500).json({ error: "Failed to unlink listing from conversation" });
    }
  });

  // Set a listing as primary for a conversation
  app.put("/api/conversations/:id/listings/:listingId/primary", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id, 10);
      const listingId = parseInt(req.params.listingId, 10);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (isNaN(listingId)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }

      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const conversation = await storage.setPrimaryListing(conversationId, listingId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Update usage timestamp
      await storage.updateConversationListingUsage(conversationId, listingId);

      const listings = await storage.getConversationListings(conversationId);

      res.json({
        success: true,
        conversation,
        listings,
        primaryListingId: conversation.listingId,
      });
    } catch (error) {
      console.error("Error setting primary listing:", error);
      res.status(500).json({ error: "Failed to set primary listing" });
    }
  });

  // ==========================================
  // Dashboard Endpoint
  // ==========================================

  // Get dashboard data
  app.get("/api/dashboard", async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
