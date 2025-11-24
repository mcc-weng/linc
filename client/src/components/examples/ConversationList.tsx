import ConversationList from '../ConversationList';
import { useState } from 'react';

export default function ConversationListExample() {
  const [selectedId, setSelectedId] = useState<string | null>("1");

  const mockConversations = [
    {
      id: "1",
      buyerName: "王小明",
      lastMessage: "你好，我想在 Chatswood 或 North Sydney 找 2 房公寓，預算大概 80-100 萬",
      timestamp: "2:30 PM",
      platform: "LINE" as const,
      unreadCount: 2,
      leadScore: "hot" as const,
    },
    {
      id: "2",
      buyerName: "李美華",
      lastMessage: "Hi，我在找 Bondi 附近的 3 房 house，預算 150 萬以內",
      timestamp: "1:45 PM",
      platform: "WhatsApp" as const,
      leadScore: "warm" as const,
    },
    {
      id: "3",
      buyerName: "張大衛",
      lastMessage: "請問 Parramatta 現在的公寓市場怎麼樣？",
      timestamp: "昨天",
      platform: "Messenger" as const,
      leadScore: "cold" as const,
    },
  ];

  return (
    <div className="h-[600px] border rounded-lg">
      <ConversationList
        conversations={mockConversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onClose={() => console.log('Close panel')}
      />
    </div>
  );
}
