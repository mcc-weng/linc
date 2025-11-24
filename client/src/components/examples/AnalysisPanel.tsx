import AnalysisPanel from '../AnalysisPanel';

export default function AnalysisPanelExample() {
  const mockAnalysis = {
    leadScore: "hot" as const,
    leadReason: "客戶預算明確（80-100萬）、地點需求清楚（Chatswood或North Sydney）、且表示需要盡快購買，顯示強烈購買意願。",
    followUpInDays: 2,
    followUpMessage: "您好！關於您想在 Chatswood 或 North Sydney 找 2 房公寓的需求...",
    buyerProfile: {
      budget: "AUD 80-100 萬",
      location: "Chatswood 或 North Sydney",
      propertyType: "2 房公寓",
      purpose: "自住",
      timeline: "3 個月內",
      notes: null,
    },
    replies: [
      "您好！感謝您的詢問。我看到您想在 Chatswood 或 North Sydney 找 2 房公寓，預算在 80-100 萬之間...",
      "Hi！您的需求我都記下了～Chatswood 和 North Sydney 都是很棒的區域，交通超方便！",
      "您好！很高興收到您的訊息。根據您的需求，我這邊有幾個非常適合的物件可以推薦給您...",
    ],
  };

  return (
    <div className="h-[600px] border rounded-lg">
      <AnalysisPanel
        analysis={mockAnalysis}
        onClose={() => console.log('Close panel')}
        onSelectReply={(reply) => console.log('Selected reply:', reply)}
      />
    </div>
  );
}
