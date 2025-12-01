import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  content: string;
  role: "buyer" | "agent" | "system";
  timestamp?: string;
  platform?: string;
}

export default function ChatMessage({ content, role, timestamp, platform }: ChatMessageProps) {
  const isBuyer = role === "buyer";
  const isSystem = role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 mb-6",
        isBuyer ? "justify-start" : "justify-end"
      )}
      data-testid={`message-${role}`}
    >
      {isBuyer && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col gap-1 max-w-[75%]", !isBuyer && "items-end")}>
        <span className="text-xs font-medium text-muted-foreground px-2">
          {isBuyer ? "買家" : "您"}
        </span>
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-base leading-relaxed",
            isBuyer
              ? "bg-muted text-foreground rounded-tl-sm"
              : "bg-primary text-primary-foreground rounded-tr-sm"
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <span className="text-xs text-muted-foreground px-2">
            {timestamp}
            {platform && isBuyer && ` • ${platform}`}
          </span>
        )}
      </div>

      {!isBuyer && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
