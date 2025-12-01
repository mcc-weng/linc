import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Clock, 
  Flame, 
  MessageSquare, 
  AlertTriangle,
  User,
  ChevronRight,
  RefreshCw,
  ThermometerSun,
  Snowflake
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Conversation } from "@shared/schema";

interface DashboardData {
  needsFollowUp: Conversation[];
  hotLeads: Conversation[];
  unread: Conversation[];
  stats: {
    totalConversations: number;
    hotLeadsCount: number;
    warmLeadsCount: number;
    coldLeadsCount: number;
    avgResponseTimeHours: number;
  };
}

const leadScoreConfig = {
  hot: {
    label: "熱",
    icon: Flame,
    className: "bg-destructive text-destructive-foreground",
  },
  warm: {
    label: "溫",
    icon: ThermometerSun,
    className: "bg-primary text-primary-foreground",
  },
  cold: {
    label: "冷",
    icon: Snowflake,
    className: "bg-muted text-muted-foreground",
  },
};

function ConversationCard({ conversation, showFollowUp = false }: { conversation: Conversation; showFollowUp?: boolean }) {
  const score = conversation.leadScore as "hot" | "warm" | "cold" | null;
  const config = score ? leadScoreConfig[score] : null;
  
  const getInactiveHours = () => {
    if (!conversation.lastBuyerMessageAt) return 0;
    const lastTime = new Date(conversation.lastBuyerMessageAt).getTime();
    return Math.floor((Date.now() - lastTime) / 3600000);
  };

  return (
    <Link href="/" className="block">
      <Card className="hover-elevate cursor-pointer" data-testid={`card-conversation-${conversation.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium truncate">{conversation.buyerName}</span>
                {config && (
                  <Badge className={`${config.className} gap-1`} data-testid={`badge-lead-${conversation.id}`}>
                    <config.icon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {conversation.lastMessage || "無訊息"}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {conversation.platform || "messenger"}
                </span>
                {showFollowUp && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Clock className="w-3 h-3" />
                    {getInactiveHours()}h 未回覆
                  </span>
                )}
                {(conversation.unreadCount ?? 0) > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5">
                    {conversation.unreadCount} 未讀
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const { data: dashboardData, isLoading, refetch, isRefetching } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">行動儀表板</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>總對話數</CardDescription>
              <CardTitle className="text-2xl" data-testid="stat-total">
                {dashboardData?.stats?.totalConversations || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-destructive" />
                熱客戶
              </CardDescription>
              <CardTitle className="text-2xl" data-testid="stat-hot">
                {dashboardData?.stats?.hotLeadsCount || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <ThermometerSun className="w-3 h-3 text-primary" />
                溫客戶
              </CardDescription>
              <CardTitle className="text-2xl" data-testid="stat-warm">
                {dashboardData?.stats?.warmLeadsCount || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                平均回覆
              </CardDescription>
              <CardTitle className="text-2xl" data-testid="stat-response-time">
                {dashboardData?.stats?.avgResponseTimeHours?.toFixed(1) || "0"}h
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Action Tabs */}
        <Tabs defaultValue="followup" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="followup" className="gap-2" data-testid="tab-followup">
              <AlertTriangle className="w-4 h-4" />
              需追蹤
              {(dashboardData?.needsFollowUp?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {dashboardData?.needsFollowUp?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="hot" className="gap-2" data-testid="tab-hot">
              <Flame className="w-4 h-4" />
              熱客戶
              {(dashboardData?.hotLeads?.length || 0) > 0 && (
                <Badge className="bg-destructive text-destructive-foreground ml-1 h-5 px-1.5">
                  {dashboardData?.hotLeads?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2" data-testid="tab-unread">
              <MessageSquare className="w-4 h-4" />
              未讀
              {(dashboardData?.unread?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {dashboardData?.unread?.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followup" className="space-y-3">
            {!dashboardData?.needsFollowUp?.length ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">沒有需要追蹤的對話</p>
                  <p className="text-sm text-muted-foreground">所有對話都在跟進中</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {dashboardData.needsFollowUp.map((conversation) => (
                    <ConversationCard 
                      key={conversation.id} 
                      conversation={conversation} 
                      showFollowUp={true}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="hot" className="space-y-3">
            {!dashboardData?.hotLeads?.length ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">沒有熱客戶</p>
                  <p className="text-sm text-muted-foreground">分析對話以識別熱客戶</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {dashboardData.hotLeads.map((conversation) => (
                    <ConversationCard 
                      key={conversation.id} 
                      conversation={conversation}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-3">
            {!dashboardData?.unread?.length ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">沒有未讀訊息</p>
                  <p className="text-sm text-muted-foreground">所有訊息都已讀取</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {dashboardData.unread.map((conversation) => (
                    <ConversationCard 
                      key={conversation.id} 
                      conversation={conversation}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
