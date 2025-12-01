import type { FAQCategory, DetectedFAQ, QuickReplyTemplate, Listing } from "@shared/schema";

// FAQ keyword patterns for detection
const FAQ_PATTERNS: Record<FAQCategory, string[]> = {
  price: [
    "價格", "價錢", "多少錢", "guide", "price", "how much", "budget", "預算",
    "報價", "開價", "底價", "成交價", "指導價"
  ],
  inspection: [
    "看房", "open home", "inspection", "inspect", "參觀", "開放參觀",
    "開放日", "開放時間", "什麼時候可以看", "預約看房", "看屋"
  ],
  property_info: [
    "strata", "管理費", "body corp", "公設比", "坪數", "面積", "幾房",
    "車位", "陽台", "朝向", "樓層", "屋齡", "details", "詳情", "資料"
  ],
  contract: [
    "合約", "contract", "合同", "文件", "documents", "送審", "冷靜期",
    "cooling off", "deposit", "訂金", "定金"
  ],
  general: [
    "info pack", "information", "資訊包", "資料包", "floorplan", "平面圖",
    "photos", "照片", "更多資訊", "詳細資料"
  ],
};

// Detect FAQ keywords in a message
export function detectFAQKeywords(message: string): DetectedFAQ[] {
  const lowerMessage = message.toLowerCase();
  const detected: DetectedFAQ[] = [];

  for (const [category, keywords] of Object.entries(FAQ_PATTERNS)) {
    const matchedKeywords = keywords.filter(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      detected.push({
        category: category as FAQCategory,
        keywords: matchedKeywords,
        confidence: Math.min(matchedKeywords.length * 0.3, 1),
      });
    }
  }

  // Sort by confidence (highest first)
  return detected.sort((a, b) => b.confidence - a.confidence);
}

// Get quick reply templates based on listing info
export function getQuickReplyTemplates(listing?: Listing): QuickReplyTemplate[] {
  const templates: QuickReplyTemplate[] = [];

  // Price guide template
  templates.push({
    id: "price",
    label: "價格指南",
    category: "price",
    template: listing?.priceGuide 
      ? `這間物業的指導價格為 ${listing.priceGuide}。如需了解更多價格細節，歡迎隨時詢問！`
      : "感謝您的詢問！關於價格方面，歡迎私訊我詳細討論，我可以根據您的需求提供最合適的選擇。",
  });

  // Inspection template
  templates.push({
    id: "inspection",
    label: "看房時間",
    category: "inspection",
    template: listing?.inspectionTimes
      ? `開放參觀時間：${listing.inspectionTimes}\n\n歡迎預約看房，如需其他時間也可另外安排！`
      : "目前可安排預約看房，請告訴我您方便的時間，我會盡快安排。",
  });

  // Property info template
  templates.push({
    id: "property_info",
    label: "物業資訊",
    category: "property_info",
    template: listing
      ? `物業資訊：
${listing.address ? `📍 地址：${listing.address}` : ""}
${listing.bedrooms ? `🛏️ 房間：${listing.bedrooms} 房` : ""}${listing.bathrooms ? ` ${listing.bathrooms} 衛` : ""}${listing.parking ? ` ${listing.parking} 車位` : ""}
${listing.strataFee ? `💰 管理費：${listing.strataFee}` : ""}
${listing.floorplanUrl ? `📐 平面圖：${listing.floorplanUrl}` : ""}

如需更多資訊，歡迎詢問！`.trim()
      : "感謝您的詢問！請問您想了解哪方面的物業資訊呢？我可以為您提供詳細說明。",
  });

  // Contract template
  templates.push({
    id: "contract",
    label: "合約文件",
    category: "contract",
    template: listing?.contractLink
      ? `您可以在這裡查看合約文件：${listing.contractLink}\n\n如有任何問題，歡迎隨時詢問！`
      : "合約文件我可以為您準備，請提供您的電子郵件，我會盡快發送給您。",
  });

  // Info pack template
  templates.push({
    id: "info_pack",
    label: "完整資料包",
    category: "general",
    template: listing?.infoPackLink
      ? `完整的物業資訊包在這裡：${listing.infoPackLink}\n\n包含了所有您需要的資訊，如有問題歡迎詢問！`
      : "我可以為您準備完整的資訊包，包含物業詳情、合約、平面圖等。請問您方便留下電子郵件嗎？",
  });

  // Agent contact template
  if (listing?.agentName || listing?.agentMobile) {
    templates.push({
      id: "agent_contact",
      label: "經紀聯繫方式",
      category: "general",
      template: `如需進一步了解，歡迎直接聯繫：
${listing.agentName ? `👤 ${listing.agentName}` : ""}
${listing.agentMobile ? `📱 ${listing.agentMobile}` : ""}

期待為您服務！`,
    });
  }

  return templates;
}

// Generate a quick reply message based on category and listing
export function generateQuickReply(category: FAQCategory | string, listing?: Listing): string {
  const templates = getQuickReplyTemplates(listing);
  
  // Find matching template
  const template = templates.find(t => t.category === category || t.id === category);
  
  if (template) {
    return template.template;
  }

  // Default response
  return "感謝您的詢問！請問您想了解什麼資訊呢？我很樂意為您解答。";
}
