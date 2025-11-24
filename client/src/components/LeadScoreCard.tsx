import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Clock } from "lucide-react";
import { useState } from "react";

interface LeadScoreCardProps {
  leadScore: "hot" | "warm" | "cold";
  leadReason: string;
  followUpInDays: number;
  followUpMessage: string;
}

const leadScoreConfig = {
  hot: {
    label: "HOT",
    className: "bg-destructive text-destructive-foreground border-destructive-border",
  },
  warm: {
    label: "WARM",
    className: "bg-primary text-primary-foreground border-primary-border",
  },
  cold: {
    label: "COLD",
    className: "bg-muted text-muted-foreground border-muted-border",
  },
};

export default function LeadScoreCard({
  leadScore,
  leadReason,
  followUpInDays,
  followUpMessage,
}: LeadScoreCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(followUpMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = leadScoreConfig[leadScore];

  return (
    <Card className="rounded-xl" data-testid="card-lead-score">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">客戶評分</CardTitle>
        <Badge
          className={`text-xs font-bold uppercase px-3 py-1 ${config.className}`}
          data-testid={`badge-lead-score-${leadScore}`}
        >
          {config.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">原因</p>
          <p className="text-base" data-testid="text-lead-reason">{leadReason}</p>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">建議跟進時間：</span>
          <span data-testid="text-follow-up-days">{followUpInDays} 天後</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">跟進訊息</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-10 px-4"
              data-testid="button-copy-followup"
            >
              {copied ? (
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
          <div className="p-4 rounded-lg border bg-muted/50" data-testid="text-follow-up-message">
            <p className="text-base leading-relaxed">{followUpMessage}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
