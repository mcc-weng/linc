import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeConversation } from "./openai";
import { insertMessageSchema, leadAnalysisRequestSchema } from "@shared/schema";
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
          
          if (!senderId) continue;

          // Handle incoming message
          if (event.message && event.message.text) {
            try {
              await processWebhookMessage(
                senderId,
                pageId,
                event.message.mid,
                event.message.text
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

  // ==========================================
  // Existing API Endpoints
  // ==========================================

  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
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

      const validation = leadAnalysisRequestSchema.safeParse({
        conversationId: id,
      });

      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid analysis request",
          details: validation.error.errors,
        });
      }

      const messages = await storage.getMessages(id);
      
      if (messages.length === 0) {
        return res.status(400).json({ error: "對話沒有訊息可供分析" });
      }

      const analysis = await analyzeConversation(messages);

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
      
      const errorMessage = error instanceof Error ? error.message : "AI 分析服務發生錯誤";
      res.status(500).json({ 
        error: errorMessage,
      });
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

  const httpServer = createServer(app);

  return httpServer;
}
