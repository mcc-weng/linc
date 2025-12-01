import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles } from "lucide-react";
import type { LeadAnalysisResponse } from "@shared/schema";

interface ChatInputProps {
  onSend: (message: string, platform: string) => void;
  onAnalyze: () => void;
  isLoading?: boolean;
  hasMessages?: boolean;
  analysis: LeadAnalysisResponse | null;
}

export default function ChatInput({ onSend, onAnalyze, isLoading = false, hasMessages = false, analysis }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message, "Messenger");
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSelectReply = (reply: string) => {
    setMessage(reply);
  };

  return (
    <div className="border-t bg-background flex-shrink-0">
      {/* Analysis Summary & Reply Carousel */}
      {analysis && (
        <div className="border-b p-4 space-y-3">
          {/* 2-line Analysis Summary */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">AI 分析摘要</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-analysis-summary">
              {analysis.leadReason}
            </p>
          </div>

          {/* Reply Suggestions Carousel */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">建議回覆</span>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3 pb-2" data-testid="carousel-replies">
                {analysis.replies.map((reply, index) => (
                  <Card
                    key={index}
                    className="flex-shrink-0 w-[320px] cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => handleSelectReply(reply)}
                    data-testid={`card-reply-${index + 1}`}
                  >
                    <CardContent className="p-3 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">選項 {index + 1}</div>
                      <p className="text-sm line-clamp-3 leading-relaxed">{reply}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 space-y-3">
        {hasMessages && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAnalyze}
              disabled={isLoading}
              className="ml-auto"
              data-testid="button-analyze"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              分析對話
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入買家訊息... (Enter 送出，Shift+Enter 換行)"
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isLoading}
            className="self-end h-[60px] w-[60px]"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
