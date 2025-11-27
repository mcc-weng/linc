import { storage } from "./storage";
import type { InsertConversation, InsertMessage } from "@shared/schema";

const FACEBOOK_GRAPH_API_VERSION = "v21.0";
const FACEBOOK_GRAPH_API_BASE = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;

interface FacebookUser {
  id: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
}

interface FacebookConversation {
  id: string;
  participants: { data: Array<{ id: string; name: string }> };
  updated_time: string;
}

interface FacebookMessage {
  id: string;
  message?: string;
  from: { id: string; name?: string };
  to?: { data: Array<{ id: string; name?: string }> };
  created_time: string;
}

// Get Facebook Page access token from environment
function getPageAccessToken(): string {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is not set");
  }
  return token;
}

// Get Facebook App Secret from environment
function getAppSecret(): string {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret) {
    throw new Error("FACEBOOK_APP_SECRET is not set");
  }
  return secret;
}

// Get Facebook Verify Token from environment
export function getVerifyToken(): string {
  const token = process.env.FACEBOOK_VERIFY_TOKEN;
  if (!token) {
    throw new Error("FACEBOOK_VERIFY_TOKEN is not set");
  }
  return token;
}

// Fetch user profile from Facebook Graph API
export async function getUserProfile(psid: string): Promise<FacebookUser | null> {
  try {
    const token = getPageAccessToken();
    const response = await fetch(
      `${FACEBOOK_GRAPH_API_BASE}/${psid}?fields=first_name,last_name,profile_pic&access_token=${token}`
    );
    
    if (!response.ok) {
      console.error("Failed to fetch user profile:", await response.text());
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// Fetch all conversations from Facebook Page
export async function getPageConversations(): Promise<FacebookConversation[]> {
  try {
    const token = getPageAccessToken();
    const response = await fetch(
      `${FACEBOOK_GRAPH_API_BASE}/me/conversations?fields=participants,updated_time&access_token=${token}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch conversations:", errorText);
      throw new Error(`Facebook API error: ${errorText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
}

// Fetch messages for a specific conversation from Facebook
export async function getConversationMessages(conversationId: string): Promise<FacebookMessage[]> {
  try {
    const token = getPageAccessToken();
    const response = await fetch(
      `${FACEBOOK_GRAPH_API_BASE}/${conversationId}/messages?fields=id,message,from,to,created_time&access_token=${token}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch messages:", errorText);
      throw new Error(`Facebook API error: ${errorText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

// Send a message to a user via Facebook Messenger
export async function sendMessage(recipientPsid: string, messageText: string): Promise<boolean> {
  try {
    const token = getPageAccessToken();
    const response = await fetch(
      `${FACEBOOK_GRAPH_API_BASE}/me/messages?access_token=${token}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          message: { text: messageText },
          messaging_type: "RESPONSE",
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send message:", errorText);
      return false;
    }
    
    const result = await response.json();
    console.log("Message sent successfully:", result);
    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

// Process incoming webhook message event
export async function processWebhookMessage(senderId: string, pageId: string, messageId: string, messageText: string): Promise<void> {
  try {
    // Check if conversation exists
    let conversation = await storage.getConversationByFacebookPsid(senderId);
    
    if (!conversation) {
      // Create new conversation
      const userProfile = await getUserProfile(senderId);
      const buyerName = userProfile 
        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || senderId
        : senderId;
      
      const newConversation: InsertConversation = {
        buyerName,
        platform: "Messenger",
        facebookPsid: senderId,
        facebookPageId: pageId,
        profilePictureUrl: userProfile?.profile_pic || null,
        unreadCount: 1,
      };
      
      conversation = await storage.createConversation(newConversation);
    } else {
      // Update unread count
      await storage.updateConversation(conversation.id, {
        unreadCount: (conversation.unreadCount || 0) + 1,
      });
    }
    
    // Save the message
    const newMessage: InsertMessage = {
      conversationId: conversation.id,
      content: messageText,
      role: "buyer",
      platform: "Messenger",
      facebookMessageId: messageId,
      isRead: 0,
    };
    
    await storage.createMessage(newMessage);
    
    console.log(`Processed incoming message from ${senderId}: ${messageText.substring(0, 50)}...`);
  } catch (error) {
    console.error("Error processing webhook message:", error);
    throw error;
  }
}

// Sync all Facebook conversations to local storage
export async function syncFacebookConversations(): Promise<void> {
  try {
    console.log("Starting Facebook conversation sync...");
    const fbConversations = await getPageConversations();
    
    for (const fbConv of fbConversations) {
      // Find the participant that is not the page (the user)
      const participant = fbConv.participants?.data?.[0];
      if (!participant) continue;
      
      // Check if conversation already exists
      let conversation = await storage.getConversationByFacebookPsid(participant.id);
      
      if (!conversation) {
        // Create new conversation
        const userProfile = await getUserProfile(participant.id);
        const newConversation: InsertConversation = {
          buyerName: participant.name || userProfile?.first_name || participant.id,
          platform: "Messenger",
          facebookPsid: participant.id,
          profilePictureUrl: userProfile?.profile_pic || null,
        };
        
        conversation = await storage.createConversation(newConversation);
      }
      
      // Sync messages for this conversation
      const fbMessages = await getConversationMessages(fbConv.id);
      const existingMessages = await storage.getMessages(conversation.id);
      const existingMessageIds = new Set(existingMessages.map(m => m.facebookMessageId));
      
      for (const fbMsg of fbMessages.reverse()) { // Reverse to get oldest first
        if (!fbMsg.message || existingMessageIds.has(fbMsg.id)) continue;
        
        const isFromUser = fbMsg.from.id !== process.env.FACEBOOK_PAGE_ID;
        
        const newMessage: InsertMessage = {
          conversationId: conversation.id,
          content: fbMsg.message,
          role: isFromUser ? "buyer" : "agent",
          platform: isFromUser ? "Messenger" : null,
          facebookMessageId: fbMsg.id,
          isRead: 1,
        };
        
        await storage.createMessage(newMessage);
      }
    }
    
    console.log(`Synced ${fbConversations.length} Facebook conversations`);
  } catch (error) {
    console.error("Error syncing Facebook conversations:", error);
    throw error;
  }
}

// Verify webhook signature (for security)
export function verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
  if (!signature) {
    console.error("No signature provided");
    return false;
  }
  
  try {
    const crypto = require('crypto');
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    
    if (!appSecret) {
      console.error("FACEBOOK_APP_SECRET not set - cannot verify signature");
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    const expected = `sha256=${expectedSignature}`;
    
    // Use timing-safe comparison to prevent timing attacks
    if (signature.length !== expected.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

// Check if Facebook is configured
export function isFacebookConfigured(): boolean {
  return !!(
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN &&
    process.env.FACEBOOK_VERIFY_TOKEN &&
    process.env.FACEBOOK_APP_SECRET
  );
}
