import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThermometerSun, Flame, Snowflake, X } from "lucide-react";
import type { LeadAnalysisResponse } from "@shared/schema";

interface AnalysisPanelProps {
  analysis: LeadAnalysisResponse | null;
  onClose: () => void;
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

export default function AnalysisPanel({ analysis, onClose }: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">選擇一則買家訊息</p>
          <p className="text-sm text-muted-foreground">AI 將自動分析並提供建議</p>
        </div>
      </div>
    );
  }

  const config = leadScoreConfig[analysis.leadScore];
  const Icon = config.icon;

  return (
    <div className="h-full flex flex-col" data-testid="analysis-panel">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">AI 分析</h3>
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

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Lead Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">客戶熱度</CardTitle>
                <Badge className={`${config.className} gap-1`} data-testid="badge-lead-score">
                  <Icon className="w-3 h-3" />
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">原因</p>
                <p className="text-sm" data-testid="text-lead-reason">{analysis.leadReason}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  建議跟進：<span className="text-foreground" data-testid="text-follow-up-days">{analysis.followUpInDays} 天後</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Buyer Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">買家資料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {analysis.buyerProfile.budget && (
                <div>
                  <span className="text-muted-foreground">預算：</span>
                  <span className="ml-2" data-testid="text-budget">{analysis.buyerProfile.budget}</span>
                </div>
              )}
              {analysis.buyerProfile.location && (
                <div>
                  <span className="text-muted-foreground">地區：</span>
                  <span className="ml-2" data-testid="text-location">{analysis.buyerProfile.location}</span>
                </div>
              )}
              {analysis.buyerProfile.propertyType && (
                <div>
                  <span className="text-muted-foreground">房型：</span>
                  <span className="ml-2" data-testid="text-property-type">{analysis.buyerProfile.propertyType}</span>
                </div>
              )}
              {analysis.buyerProfile.purpose && (
                <div>
                  <span className="text-muted-foreground">目的：</span>
                  <span className="ml-2" data-testid="text-purpose">{analysis.buyerProfile.purpose}</span>
                </div>
              )}
              {analysis.buyerProfile.timeline && (
                <div>
                  <span className="text-muted-foreground">時間：</span>
                  <span className="ml-2" data-testid="text-timeline">{analysis.buyerProfile.timeline}</span>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </div>
  );
}
