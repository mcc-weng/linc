import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { Message, LeadAnalysisResponse } from "@shared/schema";
import { leadAnalysisResponseSchema } from "@shared/schema";

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

注意：
- 所有文字內容必須使用繁體中文
- replies 必須是包含恰好3個字串的陣列
- 每個回覆建議應該在100-200字之間
- 根據對話內容判斷買家的真實需求和購買意願`;

  try {
    const completion = await (openai.beta as any).chat.completions.parse({
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
