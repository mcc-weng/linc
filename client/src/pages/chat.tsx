import { useState, useRef, useEffect } from "react";
import { MessageSquare, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import AnalysisPanel from "@/components/AnalysisPanel";
import ConversationList from "@/components/ConversationList";
import LoadingOverlay from "@/components/LoadingOverlay";
import type { LeadAnalysisResponse } from "@shared/schema";

interface Message {
  id: string;
  content: string;
  role: "buyer" | "agent" | "system";
  timestamp: string;
  platform?: "LINE" | "WhatsApp" | "Messenger" | "Instagram" | "Email";
}

interface Conversation {
  id: string;
  buyerName: string;
  lastMessage: string;
  timestamp: string;
  platform: "LINE" | "WhatsApp" | "Messenger" | "Instagram" | "Email";
  unreadCount?: number;
  leadScore?: "hot" | "warm" | "cold";
  messages: Message[];
}

// Mock conversations data
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    buyerName: "王小明",
    lastMessage: "你好，我想在 Chatswood 或 North Sydney 找 2 房公寓，預算大概 80-100 萬",
    timestamp: "2:30 PM",
    platform: "LINE",
    unreadCount: 2,
    leadScore: "hot",
    messages: [
      {
        id: "m1",
        content: "你好，我想在 Chatswood 或 North Sydney 找 2 房公寓，預算大概 80-100 萬，有推薦的嗎？",
        role: "buyer",
        timestamp: "下午 2:30",
        platform: "LINE",
      },
    ],
  },
  {
    id: "2",
    buyerName: "李美華",
    lastMessage: "Hi，我在找 Bondi 附近的 3 房 house，預算 150 萬以內",
    timestamp: "1:45 PM",
    platform: "WhatsApp",
    leadScore: "warm",
    messages: [
      {
        id: "m2",
        content: "Hi，我在找 Bondi 附近的 3 房 house，預算 150 萬以內，最好有花園",
        role: "buyer",
        timestamp: "下午 1:45",
        platform: "WhatsApp",
      },
    ],
  },
  {
    id: "3",
    buyerName: "張大衛",
    lastMessage: "請問 Parramatta 現在的公寓市場怎麼樣？",
    timestamp: "昨天",
    platform: "Messenger",
    leadScore: "cold",
    messages: [
      {
        id: "m3",
        content: "請問 Parramatta 現在的公寓市場怎麼樣？我想投資一間 1 房的",
        role: "buyer",
        timestamp: "昨天 3:20",
        platform: "Messenger",
      },
    ],
  },
];

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>("1");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<LeadAnalysisResponse | null>(null);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(true);
  const [isConversationListOpen, setIsConversationListOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const messages = selectedConversation?.messages || [];

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (content: string, platform: string) => {
    if (!selectedConversationId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "buyer",
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      platform: platform as any,
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === selectedConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: content,
          timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        };
      }
      return conv;
    }));
  };

  const handleAnalyze = async () => {
    if (!selectedConversationId) return;
    
    setIsLoading(true);
    
    // Add system message
    const systemMessage: Message = {
      id: Date.now().toString(),
      content: "AI 正在分析買家訊息...",
      role: "system",
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    };
    
    setConversations(prev => prev.map(conv => {
      if (conv.id === selectedConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, systemMessage],
        };
      }
      return conv;
    }));

    // TODO: Replace with actual API call
    setTimeout(() => {
      const mockAnalysis: LeadAnalysisResponse = {
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
        ],
      };

      setAnalysis(mockAnalysis);
      setIsLoading(false);
      setIsAnalysisPanelOpen(true);

      // Update conversation with lead score
      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedConversationId) {
          const filtered = conv.messages.filter(m => m.role !== "system");
          return {
            ...conv,
            leadScore: mockAnalysis.leadScore,
            messages: [
              ...filtered,
              {
                id: Date.now().toString(),
                content: "✨ AI 分析完成",
                role: "system",
                timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          };
        }
        return conv;
      }));
    }, 2000);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setAnalysis(null); // Clear analysis when switching conversations
  };


  return (
    <div className="h-screen flex flex-col bg-background">
      {isLoading && <LoadingOverlay message="AI 正在分析對話..." />}

      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsConversationListOpen(!isConversationListOpen)}
            data-testid="button-toggle-conversations"
          >
            {isConversationListOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" />
            )}
          </Button>
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">
            {selectedConversation ? selectedConversation.buyerName : "AI 房地產詢問助理"}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsAnalysisPanelOpen(!isAnalysisPanelOpen)}
          data-testid="button-toggle-analysis"
        >
          {isAnalysisPanelOpen ? (
            <PanelRightClose className="w-5 h-5" />
          ) : (
            <PanelRightOpen className="w-5 h-5" />
          )}
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div
          className={`border-r bg-card transition-all duration-300 flex-shrink-0 ${
            isConversationListOpen ? "w-full md:w-[320px]" : "w-0"
          } overflow-hidden`}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            onClose={() => setIsConversationListOpen(false)}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
              {!selectedConversation ? (
                <div className="h-full flex items-center justify-center text-center py-12">
                  <div className="space-y-3">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h2 className="text-lg font-semibold mb-1">選擇對話</h2>
                      <p className="text-sm text-muted-foreground">
                        從左側選擇一個買家對話開始
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      content={message.content}
                      role={message.role}
                      timestamp={message.timestamp}
                      platform={message.platform}
                    />
                  ))}
                  <div ref={scrollRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {selectedConversation && (
            <ChatInput
              onSend={handleSendMessage}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              hasMessages={messages.filter(m => m.role !== "system").length > 0}
              analysis={analysis}
            />
          )}
        </div>

        {/* Analysis Panel */}
        <div
          className={`border-l bg-card transition-all duration-300 flex-shrink-0 ${
            isAnalysisPanelOpen ? "w-full md:w-[380px]" : "w-0"
          } overflow-hidden`}
        >
          <AnalysisPanel
            analysis={analysis}
            onClose={() => setIsAnalysisPanelOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
