import { db } from "./db";
import { conversations, messages } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(messages);
  await db.delete(conversations);

  // Create conversations
  const conv1 = await db.insert(conversations).values({
    buyerName: "王小明",
    lastMessage: "我想找2-3房的公寓，預算120-150萬左右",
    timestamp: new Date(Date.now() - 3600000),
    platform: "LINE",
    unreadCount: 2,
    leadScore: "hot",
  }).returning();

  const conv2 = await db.insert(conversations).values({
    buyerName: "李美華",
    lastMessage: "請問Chatswood那邊有適合投資的物件嗎？",
    timestamp: new Date(Date.now() - 7200000),
    platform: "WhatsApp",
    unreadCount: 0,
    leadScore: "warm",
  }).returning();

  const conv3 = await db.insert(conversations).values({
    buyerName: "張大衛",
    lastMessage: "先了解一下市場行情",
    timestamp: new Date(Date.now() - 86400000),
    platform: "Email",
    unreadCount: 0,
    leadScore: "cold",
  }).returning();

  // Create messages for conversation 1
  await db.insert(messages).values([
    {
      conversationId: conv1[0].id,
      content: "你好！我想在北雪梨區找房子",
      role: "buyer",
      timestamp: new Date(Date.now() - 3600000 - 1800000),
      platform: "LINE",
    },
    {
      conversationId: conv1[0].id,
      content: "您好！很高興為您服務。請問您的預算大概是多少？需要幾房幾衛？",
      role: "agent",
      timestamp: new Date(Date.now() - 3600000 - 1500000),
    },
    {
      conversationId: conv1[0].id,
      content: "我想找2-3房的公寓，預算120-150萬左右",
      role: "buyer",
      timestamp: new Date(Date.now() - 3600000),
      platform: "LINE",
    },
  ]);

  // Create messages for conversation 2
  await db.insert(messages).values([
    {
      conversationId: conv2[0].id,
      content: "請問Chatswood那邊有適合投資的物件嗎？",
      role: "buyer",
      timestamp: new Date(Date.now() - 7200000),
      platform: "WhatsApp",
    },
    {
      conversationId: conv2[0].id,
      content: "有的！Chatswood是很好的投資區域。請問您的預算範圍是？",
      role: "agent",
      timestamp: new Date(Date.now() - 7000000),
    },
  ]);

  // Create messages for conversation 3
  await db.insert(messages).values([
    {
      conversationId: conv3[0].id,
      content: "先了解一下市場行情",
      role: "buyer",
      timestamp: new Date(Date.now() - 86400000),
      platform: "Email",
    },
  ]);

  console.log("Database seeded successfully!");
}

seed()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
