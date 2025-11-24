import ChatMessage from '../ChatMessage';

export default function ChatMessageExample() {
  return (
    <div className="space-y-4 p-4">
      <ChatMessage
        role="buyer"
        content="你好，我想在 Chatswood 或 North Sydney 找 2 房公寓，預算大概 80-100 萬，有推薦的嗎？"
        timestamp="下午 2:30"
        platform="LINE"
      />
      <ChatMessage
        role="system"
        content="AI 正在分析買家訊息..."
      />
      <ChatMessage
        role="agent"
        content="您好！感謝您的詢問。我看到您想在 Chatswood 或 North Sydney 找 2 房公寓，預算在 80-100 萬之間。這個價位在這兩個區域確實有很多不錯的選擇！"
        timestamp="下午 2:31"
      />
    </div>
  );
}
