import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Message, LeadAnalysisResponse, Conversation, AISummary, FollowUpSuggestion } from "@shared/schema";
import { leadAnalysisResponseSchema, aiSummarySchema, followUpSuggestionSchema } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你是一位專業的澳洲房地產經紀人AI助理，專門分析買家訊息並提供智能回覆建議。

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


export async function analyzeConversation(messages: Message[]): Promise<LeadAnalysisResponse> {
  const conversationText = messages
    .map((msg) => `${msg.role === "buyer" ? "買家" : "經紀人"}: ${msg.content}`)
    .join("\n");

  const prompt = `請分析以下對話，並以JSON格式回覆：

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
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
        throw new Error("AI 拒絕處理此請求");
      }
      console.error("OpenAI returned no parsed content");
      throw new Error("AI 回覆內容為空");
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    
    if (error instanceof Error && error.message.includes("AI")) {
      throw error;
    }
    
    throw new Error("AI 分析服務暫時無法使用，請稍後再試");
  }
}

// Generate AI summary for a conversation
export async function generateAISummary(messages: Message[], conversation: Conversation): Promise<AISummary> {
  const conversationText = messages
    .map((msg) => `${msg.role === "buyer" ? "買家" : "經紀人"}: ${msg.content}`)
    .join("\n");

  const lastBuyerTime = conversation.lastBuyerMessageAt 
    ? new Date(conversation.lastBuyerMessageAt).getTime() 
    : Date.now();
  const hoursAgo = Math.floor((Date.now() - lastBuyerTime) / 3600000);

  const prompt = `請分析以下對話，並生成結構化摘要：

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
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: "你是一位專業的房地產經紀人助理，負責整理客戶對話摘要。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      response_format: zodResponseFormat(aiSummarySchema, "ai_summary"),
    });

    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      throw new Error("AI 摘要生成失敗");
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI summary error:", error);
    throw new Error("AI 摘要服務暫時無法使用，請稍後再試");
  }
}

// Generate follow-up suggestions for a conversation
export async function generateFollowUpSuggestions(messages: Message[], conversation: Conversation): Promise<FollowUpSuggestion> {
  const conversationText = messages
    .map((msg) => `${msg.role === "buyer" ? "買家" : "經紀人"}: ${msg.content}`)
    .join("\n");

  const lastBuyerTime = conversation.lastBuyerMessageAt 
    ? new Date(conversation.lastBuyerMessageAt).getTime() 
    : Date.now();
  const hoursInactive = Math.floor((Date.now() - lastBuyerTime) / 3600000);

  const prompt = `這位買家已經 ${hoursInactive} 小時沒有回覆了。請根據最近對話內容，生成3個追蹤訊息建議：

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
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: zodResponseFormat(followUpSuggestionSchema, "follow_up_suggestion"),
    });

    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      throw new Error("AI 追蹤建議生成失敗");
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI follow-up error:", error);
    throw new Error("AI 追蹤服務暫時無法使用，請稍後再試");
  }
}
