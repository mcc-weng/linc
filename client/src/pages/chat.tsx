import { useState, useRef, useEffect } from "react";
import { MessageSquare, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose, Wifi, WifiOff, RefreshCw, LayoutDashboard, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import AnalysisPanel from "@/components/AnalysisPanel";
import ConversationList from "@/components/ConversationList";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import type { LeadAnalysisResponse, Conversation, Message } from "@shared/schema";

interface FacebookStatus {
  configured: boolean;
  pageTokenSet: boolean;
  verifyTokenSet: boolean;
  appSecretSet: boolean;
  webhookUrl: string;
}

export default function Chat() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(1);
  const [analysis, setAnalysis] = useState<LeadAnalysisResponse | null>(null);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(true);
  const [isConversationListOpen, setIsConversationListOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: facebookStatus } = useQuery<FacebookStatus>({
    queryKey: ["/api/facebook/status"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    queryFn: () => 
      selectedConversationId 
        ? fetch(`/api/conversations/${selectedConversationId}/messages`).then(r => r.json())
        : Promise.resolve([]),
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  // Sync Facebook conversations
  const syncFacebookMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/facebook/sync", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "同步完成",
        description: "已從 Facebook 同步對話",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "同步失敗",
        description: error.message || "無法同步 Facebook 對話",
      });
    },
  });

  // Send message - server automatically forwards to Facebook for Messenger conversations
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: number; content: string; role: string; platform?: string }) => {
      await apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, {
        content: data.content,
        role: data.role,
        conversationId: data.conversationId,
        platform: data.platform,
      });
    },
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
    mutationFn: async (conversationId: number) => {
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

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

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
      role: "agent",
      platform,
    });
  };

  const handleAnalyze = async () => {
    if (!selectedConversationId) return;
    analyzeMutation.mutate(selectedConversationId);
  };

  const handleSelectConversation = (id: number) => {
    setSelectedConversationId(id);
    setAnalysis(null);
    // Only collapse panels on small screens (< md breakpoint)
    if (window.innerWidth < 768) {
      setIsConversationListOpen(false);
      setIsAnalysisPanelOpen(false);
    }
  };

  const formatTimestamp = (timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  const isLoading = analyzeMutation.isPending || sendMessageMutation.isPending || syncFacebookMutation.isPending;

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
            {selectedConversation ? selectedConversation.buyerName : t("ai_assistant")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Dashboard Link */}
          <Link href="/dashboard">
            <Button variant="outline" size="sm" data-testid="button-dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("dashboard")}</span>
            </Button>
          </Link>

          {/* Sync Facebook Button */}
          {facebookStatus?.configured && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncFacebookMutation.mutate()}
              disabled={syncFacebookMutation.isPending}
              data-testid="button-sync-facebook"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncFacebookMutation.isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("sync_facebook")}</span>
            </Button>
          )}
          
          {/* Facebook Status Indicator */}
          <Badge 
            variant={facebookStatus?.configured ? "default" : "secondary"}
            className="gap-1"
            data-testid="badge-facebook-status"
          >
            {facebookStatus?.configured ? (
              <>
                <Wifi className="w-3 h-3" />
                <span className="hidden sm:inline">{t("facebook_connected")}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">{t("facebook_not_connected")}</span>
              </>
            )}
          </Badge>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            data-testid="button-toggle-language"
            title={language === "zh" ? "Switch to English" : "切換中文"}
          >
            <Globe className="w-5 h-5" />
          </Button>

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
        </div>
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
                      <h2 className="text-lg font-semibold mb-1">{t("select_conversation")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {t("select_from_left")}
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
                      role={message.role as "buyer" | "agent" | "system"}
                      timestamp={formatTimestamp(message.timestamp)}
                      platform={message.platform || undefined}
                      buyerName={message.role === "buyer" ? selectedConversation?.buyerName : undefined}
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
            conversation={selectedConversation}
            onClose={() => setIsAnalysisPanelOpen(false)}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}
