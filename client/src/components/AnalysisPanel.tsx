import { useState, useRef, useEffect } from "react";
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
  MessageSquare,
  Plus,
  Sparkles,
  ListFilter, // Added for the new select listing button
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import PropertyCarousel from "@/components/PropertyCarousel";
import CreateListingModal from "@/components/CreateListingModal";
import ListingSelectPopover from "@/components/ListingSelectPopover"; // Import the new component
import type { LeadAnalysisResponse, AISummary, Conversation, Listing, FAQCategory, PropertyRecommendation } from "@shared/schema";

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

interface RecommendationsResponse extends PropertyRecommendation {
  recommendedListings: Listing[];
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

export default function AnalysisPanel({ analysis, conversation, onClose, onSendMessage }: AnalysisPanelProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSelectListingModalOpen, setIsSelectListingModalOpen] = useState(false); // State for the new modal
  const [carouselListings, setCarouselListings] = useState<Listing[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null); // Updated type
  const lastFetchedConversationId = useRef<number | null>(null);
  const hasListingsLoaded = useRef(false);

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

  // Fetch all listings
  const { data: allListings = [], isSuccess: listingsLoaded } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  // Track when listings have loaded (using useEffect to comply with React rules)
  useEffect(() => {
    if (listingsLoaded) {
      hasListingsLoaded.current = true;
    }
  }, [listingsLoaded]);

  // Fetch AI recommendations - use mutation to control when it fires
  const recommendationsMutation = useMutation({
    mutationFn: async (conversationId: number): Promise<RecommendationsResponse> => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/recommendations`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setRecommendations(data);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: language === "zh" ? "推薦失敗" : "Recommendation Failed",
        description: language === "zh" ? "無法獲取 AI 推薦" : "Unable to get AI recommendations",
      });
    },
  });

  // Auto-fetch recommendations when both conversation and listings are ready
  const conversationId = conversation?.id;
  useEffect(() => {
    // Only fetch if: we have a conversation, listings have loaded, guard is not set for this conversation, and not already pending
    if (conversationId && listingsLoaded && lastFetchedConversationId.current !== conversationId && !recommendationsMutation.isPending) {
      lastFetchedConversationId.current = conversationId;
      setRecommendations(null);
      recommendationsMutation.mutate(conversationId);
    }
  }, [conversationId, listingsLoaded]); // Watch both conversation changes and listings readiness

  // Trigger re-fetch when listings change and guard is reset (via handleListingCreated)
  useEffect(() => {
    if (conversationId && listingsLoaded && lastFetchedConversationId.current === null && !recommendationsMutation.isPending) {
      lastFetchedConversationId.current = conversationId;
      recommendationsMutation.mutate(conversationId);
    }
  }, [allListings.length, conversationId, listingsLoaded]); // Watch listings changes

  const isLoadingRecommendations = recommendationsMutation.isPending;

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

  // Generate follow-up suggestions
  const followUpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/conversations/${conversation?.id}/followup/suggestions`, {});
      return response.json() as Promise<FollowUpSuggestions>;
    },
    onSuccess: (data) => {
      const urgencyLabels = {
        high: language === "zh" ? "高" : "High",
        medium: language === "zh" ? "中" : "Medium",
        low: language === "zh" ? "低" : "Low",
      };
      toast({
        title: language === "zh" ? "追蹤建議已生成" : "Follow-up Suggestions Generated",
        description: `${language === "zh" ? "緊急程度" : "Urgency"}：${urgencyLabels[data.urgencyLevel]}`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: language === "zh" ? "生成失敗" : "Generation Failed",
        description: language === "zh" ? "無法生成追蹤建議" : "Unable to generate follow-up suggestions",
      });
    },
  });

  // Manually trigger refresh of recommendations (with debounce protection)
  const handleRefreshRecommendations = () => {
    if (!conversation?.id) return;
    recommendationsMutation.mutate(conversation.id);
  };

  const handleManualListingSelect = (listing: Listing) => {
    // Add the selected listing to the carousel if not already there
    setCarouselListings((prev) => {
      const exists = prev.some(l => l.id === listing.id);
      if (exists) {
        toast({
          title: language === "zh" ? "物件已存在" : "Listing Already Added",
          description: language === "zh" ? "此物件已在推薦列表中" : "This listing is already in the recommendations",
        });
        return prev;
      }
      return [...prev, listing];
    });
    setIsSelectListingModalOpen(false);
  };

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
        title: language === "zh" ? "摘要已更新" : "Summary Updated",
        description: language === "zh" ? "AI 對話摘要已重新生成" : "AI conversation summary has been regenerated",
      });
    },
  });

  // Handle quick reply from property card
  const handleQuickReply = async (category: FAQCategory, listingId: number) => {
    try {
      const response = await fetch("/api/quick-replies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, listingId }),
      });
      const { message } = await response.json();
      onSendMessage(message);
    } catch (error) {
      toast({
        variant: "destructive",
        title: language === "zh" ? "發送失敗" : "Send Failed",
        description: language === "zh" ? "無法生成快速回覆" : "Unable to generate quick reply",
      });
    }
  };

  // Handle listing created - invalidate listings and trigger a new recommendations fetch
  const handleListingCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    // Reset the guard to allow a new fetch after listing is created
    if (conversation?.id && !recommendationsMutation.isPending) {
      lastFetchedConversationId.current = null;
    }
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">{t("select_conversation")}</p>
          <p className="text-sm text-muted-foreground">{language === "zh" ? "查看 AI 分析和快速回覆" : "View AI analysis and quick replies"}</p>
        </div>
      </div>
    );
  }

  const config = analysis ? leadScoreConfig[analysis.leadScore] : null;
  // Show recommended listings if available, otherwise show all listings (but only after recommendations have been fetched)
  const displayListings = recommendations?.recommendedListings?.length 
    ? recommendations.recommendedListings 
    : (recommendations ? [] : allListings.slice(0, 3)); // Empty if recommendations returned nothing, fallback only if never fetched

  return (
    <div className="h-full flex flex-col" data-testid="analysis-panel">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{t("ai_assistant_panel")}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            data-testid="button-add-property"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t("add_listing")}
          </Button>
          <Button
            variant="outline" // Changed to outline for better visibility
            size="sm"
            onClick={() => setIsSelectListingModalOpen(true)} // Open the new modal
            data-testid="button-select-listing"
          >
            <ListFilter className="w-4 h-4 mr-1" />
            {t("select_listing")}
          </Button>
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
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Property Carousel Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {t("recommended_properties")}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRefreshRecommendations}
                  disabled={isLoadingRecommendations}
                  data-testid="button-refresh-recommendations"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingRecommendations ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PropertyCarousel
                listings={displayListings}
                onQuickReply={handleQuickReply}
                isLoading={isLoadingRecommendations}
                reasoning={recommendations?.reasoning}
              />
            </CardContent>
          </Card>

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
                  {t("generate_followup")}
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
                      <p className="text-muted-foreground text-xs mb-1">{language === "zh" ? "問過的問題：" : "Questions Asked:"}</p>
                      <ul className="text-xs space-y-1 pl-4">
                        {aiSummary.questionsAsked.map((q, i) => (
                          <li key={i} className="list-disc">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiSummary.pendingActions?.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">{language === "zh" ? "待處理：" : "Pending Actions:"}</p>
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

      {/* Create Listing Modal */}
      <CreateListingModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        conversationId={conversation?.id}
        onListingCreated={handleListingCreated}
      />

      {/* Listing Select Modal */}
      <ListingSelectPopover
        open={isSelectListingModalOpen}
        onOpenChange={setIsSelectListingModalOpen}
        listings={allListings || []}
        primaryListingId={null}
        onSelect={handleManualListingSelect}
        title={language === "zh" ? "選擇推薦物件" : "Select Listing to Recommend"}
      />
    </div>
  );
}