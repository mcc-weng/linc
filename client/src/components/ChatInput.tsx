import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Wand2 } from "lucide-react";
import type { LeadAnalysisResponse } from "@shared/schema";

interface ChatInputProps {
  onSend: (message: string, platform: string) => void;
  onAnalyze: () => void;
  isLoading?: boolean;
  hasMessages?: boolean;
  analysis: LeadAnalysisResponse | null;
}

const FAKE_MESSAGES = [
  "你好，我想在 Chatswood 或 North Sydney 找 2 房公寓，預算大概 80-100 萬，有推薦的嗎？",
  "Hi，我在找 Bondi 附近的 3 房 house，預算 150 萬以內，最好有花園",
  "請問 Parramatta 現在的公寓市場怎麼樣？我想投資一間 1 房的",
  "我要賣掉我在 Newtown 的房子，2 房 apartment，大概能賣多少？",
  "有沒有 Sydney CBD 的 studio，預算 60 萬左右，要給女兒住的",
];

export default function ChatInput({ onSend, onAnalyze, isLoading = false, hasMessages = false, analysis }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<string>("LINE");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message, platform);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleGenerateFake = () => {
    const randomMessage = FAKE_MESSAGES[Math.floor(Math.random() * FAKE_MESSAGES.length)];
    setMessage(randomMessage);
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
        <div className="flex items-center gap-2">
          <Select value={platform} onValueChange={setPlatform} disabled={isLoading}>
            <SelectTrigger className="w-[140px] h-9" data-testid="select-platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LINE">LINE</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Messenger">Messenger</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateFake}
            disabled={isLoading}
            data-testid="button-generate-fake"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            測試訊息
          </Button>

          {hasMessages && (
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
          )}
        </div>

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
