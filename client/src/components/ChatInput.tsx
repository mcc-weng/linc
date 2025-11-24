import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Sparkles } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, platform: string) => void;
  onAnalyze: () => void;
  isLoading?: boolean;
  hasMessages?: boolean;
}

export default function ChatInput({ onSend, onAnalyze, isLoading = false, hasMessages = false }: ChatInputProps) {
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

  return (
    <div className="border-t bg-background p-4 space-y-3">
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
  );
}
