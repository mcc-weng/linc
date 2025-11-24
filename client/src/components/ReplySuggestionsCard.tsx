import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ReplySuggestionsCardProps {
  replies: string[];
}

export default function ReplySuggestionsCard({ replies }: ReplySuggestionsCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (reply: string, index: number) => {
    await navigator.clipboard.writeText(reply);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card className="rounded-xl" data-testid="card-reply-suggestions">
      <CardHeader>
        <CardTitle className="text-lg font-medium">AI 建議回覆</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {replies.map((reply, index) => (
          <div
            key={index}
            className="space-y-2"
            data-testid={`reply-option-${index + 1}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                回覆選項 {index + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(reply, index)}
                className="h-10 px-4"
                data-testid={`button-copy-reply-${index + 1}`}
              >
                {copiedIndex === index ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    複製
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-base leading-relaxed" data-testid={`text-reply-${index + 1}`}>
                {reply}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
