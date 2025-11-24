import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeConversation } from "./openai";
import { insertMessageSchema, leadAnalysisRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create a new message in a conversation
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      
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

      const message = await storage.createMessage(validation.data);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Analyze a conversation with AI
  app.post("/api/conversations/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;

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

      await storage.updateConversation(id, {
        leadScore: analysis.leadScore,
        lastAnalysis: analysis,
        lastAnalysisTimestamp: new Date().toISOString(),
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

  const httpServer = createServer(app);

  return httpServer;
}
