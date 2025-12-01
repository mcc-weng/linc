import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  ThermometerSun, 
  Flame, 
  Snowflake, 
  X, 
  Clock, 
  AlertTriangle,
  FileText,
  Home,
  DollarSign,
  Calendar,
  RefreshCw,
  CheckCircle,
  User,
  MapPin,
  Target,
  MessageSquare
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import type { LeadAnalysisResponse, AISummary, Conversation, Listing, QuickReplyTemplate } from "@shared/schema";

interface FollowUpStatus {
  needsFollowUp: boolean;
  hoursInactive: number;
  autoFollowUpEnabled: boolean;
  followUpSentCount: number;
}

interface FollowUpSuggestions {
  suggestions: string[];
  urgencyLevel: "high" | "medium" | "low";
  reasonForFollowUp: string;
}

interface AnalysisPanelProps {
  analysis: LeadAnalysisResponse | null;
  conversation: Conversation | null;
  onClose: () => void;
  onSendMessage: (message: string) => void;
}

const leadScoreConfig = {
  hot: {
    label: "熱",
    icon: Flame,
    className: "bg-destructive text-destructive-foreground border-destructive-border",
  },
  warm: {
    label: "溫",
    icon: ThermometerSun,
    className: "bg-primary text-primary-foreground border-primary-border",
  },
  cold: {
    label: "冷",
    icon: Snowflake,
    className: "bg-muted text-muted-foreground border-muted-border",
  },
};

const quickReplyIcons: Record<string, typeof DollarSign> = {
  price: DollarSign,
  inspection: Calendar,
  property_info: Home,
  contract: FileText,
  general: MessageSquare,
};

export default function AnalysisPanel({ analysis, conversation, onClose, onSendMessage }: AnalysisPanelProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setDragStart(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - dragStart) * 1;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Fetch follow-up status
  const { data: followUpStatus } = useQuery<FollowUpStatus>({
    queryKey: ["/api/conversations", conversation?.id, "followup"],
    queryFn: () => 
      conversation?.id 
        ? fetch(`/api/conversations/${conversation.id}/followup`).then(r => r.json())
        : Promise.resolve(null),
    enabled: !!conversation?.id,
    refetchInterval: 30000,
  });

  // Fetch AI summary
  const { data: aiSummary } = useQuery<AISummary>({
    queryKey: ["/api/conversations", conversation?.id, "summary"],
    queryFn: () => 
      conversation?.id 
        ? fetch(`/api/conversations/${conversation.id}/summary`).then(r => r.json())
        : Promise.resolve(null),
    enabled: !!conversation?.id,
  });

  // Fetch quick reply templates
  const { data: quickReplies = [] } = useQuery<QuickReplyTemplate[]>({
    queryKey: ["/api/quick-replies", conversation?.listingId],
    queryFn: () => 
      fetch(`/api/quick-replies${conversation?.listingId ? `?listingId=${conversation.listingId}` : ""}`).then(r => r.json()),
    enabled: !!conversation,
  });

  // Generate follow-up suggestions
  const followUpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/conversations/${conversation?.id}/followup/suggestions`, {});
      return response.json() as Promise<FollowUpSuggestions>;
    },
    onSuccess: (data) => {
      toast({
        title: "追蹤建議已生成",
        description: `緊急程度：${data.urgencyLevel === "high" ? "高" : data.urgencyLevel === "medium" ? "中" : "低"}`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "生成失敗",
        description: "無法生成追蹤建議",
      });
    },
  });

  // Toggle auto follow-up
  const toggleAutoFollowUp = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", `/api/conversations/${conversation?.id}/followup/toggle`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation?.id, "followup"] });
    },
  });

  // Generate AI summary
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/conversations/${conversation?.id}/summary`, {});
      return response.json() as Promise<AISummary>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation?.id, "summary"] });
      toast({
        title: "摘要已更新",
        description: "AI 對話摘要已重新生成",
      });
    },
  });

  // Handle quick reply click
  const handleQuickReply = async (template: QuickReplyTemplate) => {
    try {
      const response = await fetch("/api/quick-replies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          category: template.category,
          listingId: conversation?.listingId,
        }),
      });
      const { message } = await response.json();
      onSendMessage(message);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "發送失敗",
        description: "無法生成快速回覆",
      });
    }
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">選擇一個對話</p>
          <p className="text-sm text-muted-foreground">查看 AI 分析和快速回覆</p>
        </div>
      </div>
    );
  }

  const config = analysis ? leadScoreConfig[analysis.leadScore] : null;

  return (
    <div className="h-full flex flex-col" data-testid="analysis-panel">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{t("ai_assistant_panel")}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="md:hidden"
          data-testid="button-close-panel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Follow-Up Alert Banner */}
          {followUpStatus?.needsFollowUp && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium text-sm">{t("needs_followup")}</span>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  {t("buyer_inactive")} {followUpStatus.hoursInactive} {t("hours_inactive")}
                </p>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => followUpMutation.mutate()}
                  disabled={followUpMutation.isPending}
                  data-testid="button-generate-followup"
                >
                  {followUpMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-2" />
                  )}
                  生成追蹤建議
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Suggestions */}
          {followUpMutation.data && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("followup_suggestions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={carouselRef}
                  className="flex gap-2 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  data-testid="carousel-suggestions"
                >
                  {followUpMutation.data.suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="flex-shrink-0 min-w-max p-2 bg-muted rounded-md text-sm cursor-pointer hover-elevate max-w-xs select-none"
                      onClick={() => onSendMessage(suggestion)}
                      data-testid={`followup-suggestion-${index}`}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Reply Buttons */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("quick_reply")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {quickReplies.slice(0, 6).map((template) => {
                  const Icon = quickReplyIcons[template.category] || MessageSquare;
                  return (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs"
                      onClick={() => handleQuickReply(template)}
                      data-testid={`quick-reply-${template.id}`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {template.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t("conversation_summary")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => generateSummaryMutation.mutate()}
                  disabled={generateSummaryMutation.isPending}
                  data-testid="button-refresh-summary"
                >
                  <RefreshCw className={`w-3 h-3 ${generateSummaryMutation.isPending ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {aiSummary ? (
                <>
                  {aiSummary.buyerName && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span>{aiSummary.buyerName}</span>
                    </div>
                  )}
                  {aiSummary.budget && (
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span>{aiSummary.budget}</span>
                    </div>
                  )}
                  {aiSummary.requirements && (
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span>{aiSummary.requirements}</span>
                    </div>
                  )}
                  {aiSummary.questionsAsked?.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">問過的問題：</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {aiSummary.questionsAsked.map((q, i) => (
                          <li key={i} className="list-disc">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiSummary.pendingActions?.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">待處理：</p>
                      <ul className="space-y-1">
                        {aiSummary.pendingActions.map((action, i) => (
                          <li key={i} className="flex items-center gap-1 text-xs">
                            <CheckCircle className="w-3 h-3 text-primary" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    {aiSummary.conversationSummary}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t("generate_summary")}
                </p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Lead Score & Analysis */}
          {analysis && config && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t("customer_hotness")}</CardTitle>
                  <Badge className={`${config.className} gap-1`} data-testid="badge-lead-score">
                    <config.icon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("reason")}</p>
                  <p data-testid="text-lead-reason">{analysis.leadReason}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("suggested_followup")}<span className="text-foreground" data-testid="text-follow-up-days">{analysis.followUpInDays} {t("days_later")}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buyer Profile */}
          {analysis && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("buyer_info")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {analysis.buyerProfile.budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span data-testid="text-budget">{analysis.buyerProfile.budget}</span>
                  </div>
                )}
                {analysis.buyerProfile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span data-testid="text-location">{analysis.buyerProfile.location}</span>
                  </div>
                )}
                {analysis.buyerProfile.propertyType && (
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span data-testid="text-property-type">{analysis.buyerProfile.propertyType}</span>
                  </div>
                )}
                {analysis.buyerProfile.purpose && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span data-testid="text-purpose">{analysis.buyerProfile.purpose}</span>
                  </div>
                )}
                {analysis.buyerProfile.timeline && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span data-testid="text-timeline">{analysis.buyerProfile.timeline}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Auto Follow-Up Toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("auto_followup")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("auto_followup_desc")}
                  </p>
                </div>
                <Switch
                  checked={followUpStatus?.autoFollowUpEnabled || false}
                  onCheckedChange={(checked) => toggleAutoFollowUp.mutate(checked)}
                  data-testid="switch-auto-followup"
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </div>
  );
}
