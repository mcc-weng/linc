import { useState, useRef, useEffect } from "react";
import { MessageSquare, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import AnalysisPanel from "@/components/AnalysisPanel";
import ConversationList from "@/components/ConversationList";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LeadAnalysisResponse, Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>("1");
  const [analysis, setAnalysis] = useState<LeadAnalysisResponse | null>(null);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(true);
  const [isConversationListOpen, setIsConversationListOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    queryFn: () => 
      selectedConversationId 
        ? fetch(`/api/conversations/${selectedConversationId}/messages`).then(r => r.json())
        : Promise.resolve([]),
    enabled: !!selectedConversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: string; content: string; role: string; platform?: string }) =>
      apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, {
        content: data.content,
        role: data.role,
        conversationId: data.conversationId,
        platform: data.platform,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId, "messages"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "發送訊息失敗",
        description: error.message || "無法發送訊息，請稍後再試",
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/analyze`, { conversationId });
      return response.json() as Promise<LeadAnalysisResponse>;
    },
    onSuccess: (data: LeadAnalysisResponse) => {
      setAnalysis(data);
      setIsAnalysisPanelOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "AI 分析完成",
        description: `客戶評級：${data.leadScore === "hot" ? "熱客戶" : data.leadScore === "warm" ? "溫客戶" : "冷客戶"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "AI 分析失敗",
        description: error.message || "無法分析對話，請稍後再試",
      });
    },
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

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

    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content,
      role: "buyer",
      platform,
    });
  };

  const handleAnalyze = async () => {
    if (!selectedConversationId) return;
    analyzeMutation.mutate(selectedConversationId);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setAnalysis(null);
  };


  const isLoading = analyzeMutation.isPending || sendMessageMutation.isPending;

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
