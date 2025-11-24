import { useState } from "react";
import { MessageSquare } from "lucide-react";
import MessageInputForm from "@/components/MessageInputForm";
import LeadScoreCard from "@/components/LeadScoreCard";
import BuyerProfileCard from "@/components/BuyerProfileCard";
import ReplySuggestionsCard from "@/components/ReplySuggestionsCard";
import LoadingOverlay from "@/components/LoadingOverlay";
import type { LeadAnalysisRequest, LeadAnalysisResponse } from "@shared/schema";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LeadAnalysisResponse | null>(null);

  const handleSubmit = async (data: LeadAnalysisRequest) => {
    setIsLoading(true);
    console.log('Submitting analysis request:', data);

    // TODO: Replace with actual API call
    // Simulating API call with mock data for design prototype
    setTimeout(() => {
      const mockResult: LeadAnalysisResponse = {
        leadScore: "hot",
        leadReason: "客戶預算明確（80-100萬）、地點需求清楚（Chatswood或North Sydney）、且表示需要盡快購買，顯示強烈購買意願。",
        followUpInDays: 2,
        followUpMessage: "您好！關於您想在 Chatswood 或 North Sydney 找 2 房公寓的需求，我這邊剛好有幾個很適合的物件，預算都在您的範圍內。方便的話，我們這週末可以約個時間帶您看房嗎？",
        buyerProfile: {
          budget: "AUD 80-100 萬",
          location: "Chatswood 或 North Sydney",
          propertyType: "2 房公寓 (Apartment)",
          purpose: "自住",
          timeline: "3 個月內",
          notes: "需要靠近火車站，有停車位",
        },
        replies: [
          "您好！感謝您的詢問。我看到您想在 Chatswood 或 North Sydney 找 2 房公寓，預算在 80-100 萬之間。這個價位在這兩個區域確實有很多不錯的選擇！我手邊剛好有幾個很適合的物件，都有停車位且靠近火車站。方便的話，我們可以約個時間帶您看房嗎？",
          "Hi！您的需求我都記下了～Chatswood 和 North Sydney 都是很棒的區域，交通超方便！您的預算範圍內我有幾個推薦的物件，都符合您要的 2 房、有車位、近火車站。要不要這週末找個時間，我帶您實地看看？順便可以聊聊這些區域的優缺點 😊",
          "您好！很高興收到您的訊息。根據您的需求（2 房公寓、80-100 萬預算、Chatswood 或 North Sydney、近火車站、有停車位），我這邊有幾個非常適合的物件可以推薦給您。這兩個區域目前市場很活躍，好的物件很快就會被搶走。建議我們盡快安排看房，您覺得這週末或下週初有空嗎？",
        ] as [string, string, string],
      };
      setResult(mockResult);
      setIsLoading(false);
      
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {isLoading && <LoadingOverlay />}
      
      <header className="h-16 border-b flex items-center px-4 md:px-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">AI 房地產詢問助理</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <section className="mb-12">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">輸入區塊</h2>
            <p className="text-sm text-muted-foreground">
              貼上買家訊息，AI 將自動分析並產生建議回覆
            </p>
          </div>
          <div className="p-6 rounded-xl border bg-card">
            <MessageInputForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </section>

        {result && (
          <section id="results" className="space-y-6">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">AI 分析結果</h2>
              <p className="text-sm text-muted-foreground">
                以下是 AI 根據買家訊息生成的分析與建議
              </p>
            </div>
            
            <LeadScoreCard
              leadScore={result.leadScore}
              leadReason={result.leadReason}
              followUpInDays={result.followUpInDays}
              followUpMessage={result.followUpMessage}
            />

            <BuyerProfileCard profile={result.buyerProfile} />

            <ReplySuggestionsCard replies={result.replies} />
          </section>
        )}
      </main>
    </div>
  );
}
