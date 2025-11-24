import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadAnalysisRequestSchema, type LeadAnalysisRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface MessageInputFormProps {
  onSubmit: (data: LeadAnalysisRequest) => void;
  isLoading?: boolean;
}

export default function MessageInputForm({ onSubmit, isLoading = false }: MessageInputFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LeadAnalysisRequest>({
    resolver: zodResolver(leadAnalysisRequestSchema),
    defaultValues: {
      message: "",
      source: "LINE",
      customerType: "買家",
      replyLanguage: "中文",
      notes: "",
    },
  });

  const source = watch("source");
  const customerType = watch("customerType");
  const replyLanguage = watch("replyLanguage");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="message" className="text-sm font-medium">
          買家訊息
        </Label>
        <Textarea
          id="message"
          data-testid="input-message"
          placeholder="請貼上來自 LINE / FB / IG / WhatsApp 的訊息…"
          className="min-h-[180px] font-mono text-base resize-none"
          {...register("message")}
          disabled={isLoading}
        />
        {errors.message && (
          <p className="text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source" className="text-sm font-medium">
            訊息來源
          </Label>
          <Select
            value={source}
            onValueChange={(value) => setValue("source", value as any)}
            disabled={isLoading}
          >
            <SelectTrigger id="source" data-testid="select-source" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LINE">LINE</SelectItem>
              <SelectItem value="Messenger">Messenger</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerType" className="text-sm font-medium">
            客戶類型
          </Label>
          <Select
            value={customerType}
            onValueChange={(value) => setValue("customerType", value as any)}
            disabled={isLoading}
          >
            <SelectTrigger id="customerType" data-testid="select-customer-type" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="買家">買家</SelectItem>
              <SelectItem value="投資客">投資客</SelectItem>
              <SelectItem value="租客">租客</SelectItem>
              <SelectItem value="其他">其他</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="replyLanguage" className="text-sm font-medium">
            回覆語言
          </Label>
          <Select
            value={replyLanguage}
            onValueChange={(value) => setValue("replyLanguage", value as any)}
            disabled={isLoading}
          >
            <SelectTrigger id="replyLanguage" data-testid="select-reply-language" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="中文">中文</SelectItem>
              <SelectItem value="英文">英文</SelectItem>
              <SelectItem value="雙語">雙語</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            備註（選填）
          </Label>
          <Textarea
            id="notes"
            data-testid="input-notes"
            placeholder="自訂說明…"
            className="h-12 resize-none text-base"
            {...register("notes")}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto md:min-w-xs h-14 text-base"
          disabled={isLoading}
          data-testid="button-analyze"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          分析買家並產生回覆
        </Button>
      </div>
    </form>
  );
}
