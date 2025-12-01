import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import type { Conversation } from "@shared/schema";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}

const leadScoreColors: Record<string, string> = {
  hot: "bg-destructive",
  warm: "bg-primary",
  cold: "bg-muted",
};

function formatTimeAgo(timestamp: Date | string, language: "zh" | "en"): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (language === "zh") {
    if (diffMins < 1) return "剛剛";
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  } else {
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default function ConversationList({ conversations, selectedId, onSelect, onClose }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);

  const filteredConversations = conversations.filter(conv =>
    conv.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{language === "zh" ? "對話列表" : "Conversations"}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
            data-testid="button-close-conversations"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === "zh" ? "搜尋買家或訊息..." : "Search buyer or message..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? (language === "zh" ? "找不到相關對話" : "No matching conversations") : (language === "zh" ? "尚無對話" : "No conversations")}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg cursor-pointer hover-elevate active-elevate-2 mb-1",
                  selectedId === conv.id && "bg-muted"
                )}
                data-testid={`conversation-${conv.id}`}
              >
                {/* Avatar */}
                <Avatar className="w-10 h-10 flex-shrink-0">
                  {conv.profilePictureUrl ? (
                    <AvatarImage src={conv.profilePictureUrl} alt={conv.buyerName} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{conv.buyerName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTimeAgo(conv.timestamp, language)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {conv.lastMessage || (language === "zh" ? "尚無訊息" : "No messages")}
                  </p>

                  <div className="flex items-center gap-2">
                    {/* Platform Badge */}
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {conv.platform}
                    </Badge>

                    {/* Lead Score Indicator */}
                    {conv.leadScore && (
                      <div className={cn("w-2 h-2 rounded-full", leadScoreColors[conv.leadScore] || "bg-muted")} />
                    )}

                    {/* Unread Count */}
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground ml-auto">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
