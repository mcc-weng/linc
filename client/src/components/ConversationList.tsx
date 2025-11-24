import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Conversation {
  id: string;
  buyerName: string;
  lastMessage: string;
  timestamp: string;
  platform: "LINE" | "WhatsApp" | "Messenger" | "Instagram" | "Email";
  unreadCount?: number;
  leadScore?: "hot" | "warm" | "cold";
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const platformColors = {
  LINE: "bg-green-500",
  WhatsApp: "bg-green-600",
  Messenger: "bg-blue-500",
  Instagram: "bg-pink-500",
  Email: "bg-gray-500",
};

const leadScoreColors = {
  hot: "bg-destructive",
  warm: "bg-primary",
  cold: "bg-muted",
};

export default function ConversationList({ conversations, selectedId, onSelect, onClose }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(conv =>
    conv.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">對話列表</h2>
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
            placeholder="搜尋買家或訊息..."
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
              {searchQuery ? "找不到相關對話" : "尚無對話"}
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
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{conv.buyerName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{conv.timestamp}</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {conv.lastMessage}
                  </p>

                  <div className="flex items-center gap-2">
                    {/* Platform Badge */}
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {conv.platform}
                    </Badge>

                    {/* Lead Score Indicator */}
                    {conv.leadScore && (
                      <div className={cn("w-2 h-2 rounded-full", leadScoreColors[conv.leadScore])} />
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
