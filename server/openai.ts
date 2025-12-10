import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Message, LeadAnalysisResponse, Conversation, AISummary, FollowUpSuggestion, Listing, PropertyRecommendation } from "@shared/schema";
import { leadAnalysisResponseSchema, aiSummarySchema, followUpSuggestionSchema, propertyRecommendationSchema } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT_ZH = `你是一位專業的澳洲房地產經紀人AI助理，專門分析買家訊息並提供智能回覆建議。

**澳洲房地產市場背景：**
- 主要熱門區域：Chatswood（車士活）、North Sydney（北雪梨）、Bondi（邦迪）、Parramatta（帕拉馬塔）、Surry Hills、Newtown、Marrickville
- 價格範圍：公寓 $600K-$2M+，獨立屋 $1.5M-$5M+
- 投資回報率：租金回報 3-5%，資本增值 5-8% 年均
- 購買流程：預審貸款 → 看房 → 出價 → 冷靜期 → 交割
- 熱門物業類型：2-3房公寓、3-4房獨立屋（townhouse/house）

**你的任務：**
1. 分析買家訊息，判斷潛在客戶評級（hot/warm/cold）
2. 提取買家資料：預算、地點偏好、物業類型、購買目的、時間表
3. 生成3個個性化的回覆建議，展現專業且親切的服務態度

**評級標準：**
- **熱客戶（hot）**：已表明明確預算、地點、時間表，有購買急迫性
- **溫客戶（warm）**：有興趣但條件不夠明確，需要進一步了解
- **冷客戶（cold）**：只是初步詢問，沒有明確需求或預算

**回覆建議原則：**
1. 使用繁體中文（Traditional Chinese）
2. 專業但親切的語氣
3. 根據買家需求提供具體的建議（如：推薦區域、物業類型、價格範圍）
4. 包含行動呼籲（如：安排看房、提供物件資訊、討論預算）
5. 每個回覆建議應該有不同的側重點和策略`;

const SYSTEM_PROMPT_EN = `You are a professional Australian real estate AI assistant specializing in analyzing buyer messages and providing intelligent reply suggestions.

**Australian Real Estate Market Background:**
- Popular Areas: Chatswood, North Sydney, Bondi, Parramatta, Surry Hills, Newtown, Marrickville
- Price Ranges: Apartments $600K-$2M+, Houses $1.5M-$5M+
- Investment Returns: Rental yield 3-5%, Capital appreciation 5-8% annually
- Purchase Process: Pre-approval → Inspection → Offer → Cooling-off period → Settlement
- Popular Property Types: 2-3 bedroom apartments, 3-4 bedroom houses/townhouses

**Your Tasks:**
1. Analyze buyer messages and assign lead ratings (hot/warm/cold)
2. Extract buyer profile: budget, location preference, property type, purchase purpose, timeline
3. Generate 3 personalized reply suggestions showing professional and friendly service

**Rating Criteria:**
- **Hot Lead**: Clear budget, location, timeline, urgent buying intent
- **Warm Lead**: Interested but conditions unclear, needs more information
- **Cold Lead**: Initial inquiry, no clear requirements or budget

**Reply Suggestion Principles:**
1. Use English
2. Professional yet friendly tone
3. Provide specific suggestions based on buyer needs (e.g., recommend areas, property types, price ranges)
4. Include calls to action (e.g., arrange inspection, provide property info, discuss budget)
5. Each suggestion should have different focus and strategy`;

export async function analyzeConversation(messages: Message[], language: "zh" | "en" = "zh"): Promise<LeadAnalysisResponse> {
  const conversationText = messages
    .map((msg) => `${msg.role === "buyer" ? (language === "en" ? "Buyer" : "買家") : (language === "en" ? "Agent" : "經紀人")}: ${msg.content}`)
    .join("\n");

  const isEnglish = language === "en";
  const prompt = isEnglish
    ? `Please analyze the following conversation and provide a JSON response:

Conversation:
${conversationText}

Please provide the following information (must be in JSON format):
{
  "leadScore": "hot" | "warm" | "cold",
  "leadReason": "Brief explanation for the rating (1-2 sentences)",
  "followUpInDays": number,
  "followUpMessage": "Suggested follow-up message",
  "buyerProfile": {
    "budget": "Budget range (e.g., $1.2-1.5M) or null",
    "location": "Location preference (e.g., North Sydney, Chatswood) or null",
    "propertyType": "Property type (e.g., 2-3 bedroom apartment, house) or null",
    "purpose": "Purchase purpose (e.g., owner-occupied, investment) or null",
    "timeline": "Purchase timeline (e.g., within 3 months, within 6 months) or null",
    "notes": "Other notes or null"
  },
  "replies": [
    "First reply suggestion (strategy: build trust, ask for more info)",
    "Second reply suggestion (strategy: demonstrate expertise, recommend specific property)",
    "Third reply suggestion (strategy: create urgency, arrange next steps)"
  ]
}

**Important Requirements:**
- All content must be in English
- **replies array must contain exactly 3 suggestions, no more no less**
- Each suggestion should be 100-200 words
- Judge buyer's real needs and purchase intention based on conversation
- Each suggestion must be a complete string with full reply content`
    : `請分析以下對話，並以JSON格式回覆：

對話內容：
${conversationText}

請提供以下資訊（必須以JSON格式回覆）：
{
  "leadScore": "hot" | "warm" | "cold",
  "leadReason": "為什麼給予這個評級的簡短說明（1-2句話）",
  "followUpInDays": 追蹤天數（數字），
  "followUpMessage": "建議的追蹤訊息",
  "buyerProfile": {
    "budget": "預算範圍（如：$120-150萬）或 null",
    "location": "地點偏好（如：北雪梨區、Chatswood）或 null",
    "propertyType": "物業類型（如：2-3房公寓、獨立屋）或 null",
    "purpose": "購買目的（如：自住、投資）或 null",
    "timeline": "購買時間表（如：3個月內、半年內）或 null",
    "notes": "其他備註 或 null"
  },
  "replies": [
    "第一個回覆建議（策略：建立信任，詢問更多資訊）",
    "第二個回覆建議（策略：展示專業，推薦具體物件）",
    "第三個回覆建議（策略：創造急迫感，安排下一步行動）"
  ]
}

**重要要求：**
- 所有文字內容必須使用繁體中文
- **replies 陣列必須包含恰好3個回覆建議，不能多也不能少**
- 每個回覆建議應該在100-200字之間
- 根據對話內容判斷買家的真實需求和購買意願
- 每個回覆建議必須是完整的字串，包含完整的回覆內容`;

  try {
    const systemPrompt = isEnglish ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: zodResponseFormat(leadAnalysisResponseSchema, "lead_analysis"),
    });

    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      const refusal = completion.choices[0].message.refusal;
      if (refusal) {
        console.error("OpenAI refused the request:", refusal);
        throw new Error(isEnglish ? "AI refused to process this request" : "AI 拒絕處理此請求");
      }
      console.error("OpenAI returned no parsed content");
      throw new Error(isEnglish ? "AI response is empty" : "AI 回覆內容為空");
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    
    if (error instanceof Error && error.message.includes("AI")) {
      throw error;
    }
    
    throw new Error(isEnglish ? "AI analysis service temporarily unavailable, please try again later" : "AI 分析服務暫時無法使用，請稍後再試");
  }
}

// Generate AI summary for a conversation
export async function generateAISummary(messages: Message[], conversation: Conversation, language: "zh" | "en" = "zh"): Promise<AISummary> {
  const isEnglish = language === "en";
  const conversationText = messages
    .map((msg) => `${msg.role === "buyer" ? (isEnglish ? "Buyer" : "買家") : (isEnglish ? "Agent" : "經紀人")}: ${msg.content}`)
    .join("\n");

  const lastBuyerTime = conversation.lastBuyerMessageAt 
    ? new Date(conversation.lastBuyerMessageAt).getTime() 
    : Date.now();
  const hoursAgo = Math.floor((Date.now() - lastBuyerTime) / 3600000);

  const prompt = isEnglish
    ? `Analyze the following conversation and generate a structured summary:

Conversation:
${conversationText}

Please provide the following information (must be in JSON format):
{
  "buyerName": "Buyer name (if mentioned in conversation) or null",
  "budget": "Budget range or null",
  "requirements": "Summary of buyer requirements (e.g., 2-bedroom apartment, near school, investment) or null",
  "questionsAsked": ["List of questions asked by buyer"],
  "leadIntent": "hot" | "warm" | "cold",
  "pendingActions": ["Action items, e.g., send contract, schedule inspection, provide quote"],
  "lastTouchHoursAgo": ${hoursAgo},
  "conversationSummary": "Conversation summary (2-3 sentences)"
}

**Important Requirements:**
- All content must be in English
- Summary should be concise and clear
- Action items must be specific and actionable`
    : `請分析以下對話，並生成結構化摘要：

對話內容：
${conversationText}

請提供以下資訊（必須以JSON格式回覆）：
{
  "buyerName": "買家姓名（如果對話中有提到）或 null",
  "budget": "預算範圍 或 null",
  "requirements": "買家需求摘要（如：2房公寓、近學校、投資用途）或 null",
  "questionsAsked": ["買家問過的問題列表"],
  "leadIntent": "hot" | "warm" | "cold",
  "pendingActions": ["待處理事項，如：發送合約、安排看房、報價"],
  "lastTouchHoursAgo": ${hoursAgo},
  "conversationSummary": "對話摘要（2-3句話）"
}

**重要要求：**
- 所有文字內容必須使用繁體中文
- 摘要要簡潔明瞭
- 待處理事項要具體可執行`;

  try {
    const systemPrompt = isEnglish 
      ? "You are a professional real estate agent assistant responsible for organizing customer conversation summaries."
      : "你是一位專業的房地產經紀人助理，負責整理客戶對話摘要。";
    
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      response_format: zodResponseFormat(aiSummarySchema, "ai_summary"),
    });

    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      throw new Error(isEnglish ? "AI summary generation failed" : "AI 摘要生成失敗");
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI summary error:", error);
    throw new Error(isEnglish ? "AI summary service temporarily unavailable, please try again later" : "AI 摘要服務暫時無法使用，請稍後再試");
  }
}

// Generate property recommendations based on buyer conversation
export async function generatePropertyRecommendations(
  messages: Message[], 
  availableListings: Listing[],
  language: "zh" | "en" = "zh"
): Promise<PropertyRecommendation> {
  const isEnglish = language === "en";
  const conversationText = messages
    .map((msg) => `${msg.role === "buyer" ? (isEnglish ? "Buyer" : "買家") : (isEnglish ? "Agent" : "經紀人")}: ${msg.content}`)
    .join("\n");

  const listingsInfo = availableListings.map(l => ({
    id: l.id,
    title: l.title,
    address: l.address,
    priceGuide: l.priceGuide,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    propertyType: l.propertyType,
  }));

  const prompt = isEnglish
    ? `Analyze the following buyer conversation and recommend 1-3 most suitable properties from the available listings:

Conversation:
${conversationText}

Available Properties:
${JSON.stringify(listingsInfo, null, 2)}

Please provide the following information (must be in JSON format):
{
  "recommendedListingIds": [list of recommended property IDs, max 3, in priority order],
  "reasoning": "Explanation of why these properties are recommended",
  "buyerIntent": {
    "budget": "Budget range or null",
    "location": "Location preference or null",
    "propertyType": "Property type preference or null",
    "bedrooms": number of bedrooms needed or null
  }
}

**Important Requirements:**
- recommendedListingIds must be IDs that exist in the property list
- If buyer requirements are unclear, recommend 1-2 more general properties
- Match based on buyer budget, location preference, and property type
- All content must be in English`
    : `請分析以下買家對話，並從可用物件列表中推薦1-3個最適合的物件：

對話內容：
${conversationText}

可用物件列表：
${JSON.stringify(listingsInfo, null, 2)}

請提供以下資訊（必須以JSON格式回覆）：
{
  "recommendedListingIds": [推薦物件ID列表，最多3個，按優先順序排列],
  "reasoning": "推薦這些物件的原因說明",
  "buyerIntent": {
    "budget": "預算範圍 或 null",
    "location": "地點偏好 或 null",
    "propertyType": "物業類型偏好 或 null",
    "bedrooms": 房間數需求 或 null
  }
}

**重要要求：**
- recommendedListingIds 必須是物件列表中存在的ID
- 如果買家需求不明確，推薦1-2個較通用的物件
- 根據買家預算、地點偏好、房型需求來匹配
- 所有文字內容必須使用繁體中文`;

  try {
    const systemPrompt = isEnglish
      ? "You are a professional real estate agent assistant responsible for recommending suitable properties based on buyer needs."
      : "你是一位專業的房地產經紀人助理，負責根據買家需求推薦合適的物件。";
    
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      response_format: zodResponseFormat(propertyRecommendationSchema, "property_recommendation"),
    });

    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      throw new Error(isEnglish ? "AI property recommendation generation failed" : "AI 物件推薦生成失敗");
    }

    // Filter to only include valid listing IDs
    const validIds = availableListings.map(l => l.id);
    parsed.recommendedListingIds = parsed.recommendedListingIds.filter(id => validIds.includes(id));
    
    // Ensure at least one recommendation if listings exist
    if (parsed.recommendedListingIds.length === 0 && availableListings.length > 0) {
      parsed.recommendedListingIds = [availableListings[0].id];
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI recommendation error:", error);
    // Fallback: return first listing if available
    if (availableListings.length > 0) {
      return {
        recommendedListingIds: [availableListings[0].id],
        reasoning: isEnglish ? "Unable to analyze buyer needs, showing default property" : "無法分析買家需求，顯示預設物件",
        buyerIntent: { budget: null, location: null, propertyType: null, bedrooms: null },
      };
    }
    throw new Error(isEnglish ? "AI property recommendation service temporarily unavailable" : "AI 物件推薦服務暫時無法使用");
  }
}

// Generate follow-up suggestions for a conversation
export async function generateFollowUpSuggestions(messages: Message[], conversation: Conversation, language: "zh" | "en" = "zh"): Promise<FollowUpSuggestion> {
  const isEnglish = language === "en";
  const conversationText = messages
    .map((msg) => `${msg.role === "buyer" ? (isEnglish ? "Buyer" : "買家") : (isEnglish ? "Agent" : "經紀人")}: ${msg.content}`)
    .join("\n");

  const lastBuyerTime = conversation.lastBuyerMessageAt 
    ? new Date(conversation.lastBuyerMessageAt).getTime() 
    : Date.now();
  const hoursInactive = Math.floor((Date.now() - lastBuyerTime) / 3600000);

  const prompt = isEnglish
    ? `This buyer has not responded for ${hoursInactive} hours. Based on recent conversation, generate 3 follow-up message suggestions:

Recent Conversation:
${conversationText}

Please provide the following information (must be in JSON format):
{
  "suggestions": [
    "Follow-up message 1 (strategy: show care, re-engage interest)",
    "Follow-up message 2 (strategy: provide new information or value)",
    "Follow-up message 3 (strategy: create urgency, drive action)"
  ],
  "urgencyLevel": "high" | "medium" | "low",
  "reasonForFollowUp": "Explanation of why follow-up is needed"
}

**Important Requirements:**
- All content must be in English
- **suggestions array must contain exactly 3 follow-up messages**
- Each message should be natural, not overly sales-focused
- Customize content based on buyer's previous needs and questions
- If buyer asked specific questions, you can proactively provide answers`
    : `這位買家已經 ${hoursInactive} 小時沒有回覆了。請根據最近對話內容，生成3個追蹤訊息建議：

最近對話內容：
${conversationText}

請提供以下資訊（必須以JSON格式回覆）：
{
  "suggestions": [
    "追蹤訊息1（策略：關心問候，重新引起興趣）",
    "追蹤訊息2（策略：提供新資訊或價值）",
    "追蹤訊息3（策略：創造急迫感，推動行動）"
  ],
  "urgencyLevel": "high" | "medium" | "low",
  "reasonForFollowUp": "為什麼需要追蹤的原因說明"
}

**重要要求：**
- 所有文字內容必須使用繁體中文
- **suggestions 陣列必須包含恰好3個追蹤訊息**
- 每個訊息應該自然、不過度推銷
- 根據買家之前的需求和問題來客製化內容
- 如果買家問過特定問題，可以主動提供答案`;

  try {
    const systemPrompt = isEnglish ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: zodResponseFormat(followUpSuggestionSchema, "follow_up_suggestion"),
    });

    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      throw new Error(isEnglish ? "AI follow-up suggestion generation failed" : "AI 追蹤建議生成失敗");
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI follow-up error:", error);
    throw new Error(isEnglish ? "AI follow-up service temporarily unavailable, please try again later" : "AI 追蹤服務暫時無法使用，請稍後再試");
  }
}
