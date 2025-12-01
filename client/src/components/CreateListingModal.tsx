import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import type { Listing } from "@shared/schema";

interface CreateListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: number;
  onListingCreated?: (listing: Listing) => void;
}

export default function CreateListingModal({
  open,
  onOpenChange,
  conversationId,
  onListingCreated,
}: CreateListingModalProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);

  const [formData, setFormData] = useState({
    title: "",
    address: "",
    priceGuide: "",
    contractLink: "",
    inspectionAvailableDate: "",
    inspectionAvailableTime: "",
    bedrooms: "",
    bathrooms: "",
    parking: "",
    strataFee: "",
    agentName: "",
    agentMobile: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      address: "",
      priceGuide: "",
      contractLink: "",
      inspectionAvailableDate: "",
      inspectionAvailableTime: "",
      bedrooms: "",
      bathrooms: "",
      parking: "",
      strataFee: "",
      agentName: "",
      agentMobile: "",
    });
  };

  const createListingMutation = useMutation({
    mutationFn: async (): Promise<Listing> => {
      const payload = {
        title: formData.title.trim(),
        address: formData.address.trim() || undefined,
        priceGuide: formData.priceGuide.trim() || undefined,
        contractLink: formData.contractLink.trim() || undefined,
        inspectionAvailableDate: formData.inspectionAvailableDate.trim() || undefined,
        inspectionAvailableTime: formData.inspectionAvailableTime.trim() || undefined,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms, 10) : undefined,
        parking: formData.parking ? parseInt(formData.parking, 10) : undefined,
        strataFee: formData.strataFee.trim() || undefined,
        agentName: formData.agentName.trim() || undefined,
        agentMobile: formData.agentMobile.trim() || undefined,
      };
      const res = await apiRequest("POST", "/api/listings", payload);
      return res.json();
    },
    onSuccess: async (newListing: Listing) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      
      if (conversationId) {
        try {
          await apiRequest("POST", `/api/conversations/${conversationId}/listings`, {
            listingId: newListing.id,
            setPrimary: true,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "listings"] });
        } catch (error) {
          console.error("Failed to link listing to conversation:", error);
        }
      }
      
      toast({
        title: t("listing_created"),
      });
      
      onListingCreated?.(newListing);
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: language === "zh" ? "建立失敗" : "Creation Failed",
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    createListingMutation.mutate();
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t("create_new_listing")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="listing-title">{t("listing_title")} *</Label>
              <Input
                id="listing-title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g., Chatswood 精品公寓"
                data-testid="input-listing-title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="listing-address">{t("listing_address")}</Label>
              <Input
                id="listing-address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="e.g., 123 Victoria Avenue, Chatswood NSW"
                data-testid="input-listing-address"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="listing-price">{t("listing_price")}</Label>
              <Input
                id="listing-price"
                value={formData.priceGuide}
                onChange={(e) => handleChange("priceGuide", e.target.value)}
                placeholder="e.g., $1,200,000 - $1,350,000"
                data-testid="input-listing-price"
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="contract-link">{t("contract_link")}</Label>
              <Input
                id="contract-link"
                type="url"
                value={formData.contractLink}
                onChange={(e) => handleChange("contractLink", e.target.value)}
                placeholder={t("contract_link_placeholder")}
                data-testid="input-contract-link"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inspection-date">{t("inspection_available_date")}</Label>
                <Input
                  id="inspection-date"
                  type="date"
                  value={formData.inspectionAvailableDate}
                  onChange={(e) => handleChange("inspectionAvailableDate", e.target.value)}
                  data-testid="input-inspection-date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inspection-time">{t("inspection_available_time")}</Label>
                <Input
                  id="inspection-time"
                  value={formData.inspectionAvailableTime}
                  onChange={(e) => handleChange("inspectionAvailableTime", e.target.value)}
                  placeholder={t("inspection_time_placeholder")}
                  data-testid="input-inspection-time"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bedrooms">{t("bedrooms")}</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => handleChange("bedrooms", e.target.value)}
                  data-testid="input-bedrooms"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bathrooms">{t("bathrooms")}</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => handleChange("bathrooms", e.target.value)}
                  data-testid="input-bathrooms"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parking">{t("parking")}</Label>
                <Input
                  id="parking"
                  type="number"
                  min="0"
                  value={formData.parking}
                  onChange={(e) => handleChange("parking", e.target.value)}
                  data-testid="input-parking"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="strata-fee">{t("strata_fee")}</Label>
              <Input
                id="strata-fee"
                value={formData.strataFee}
                onChange={(e) => handleChange("strataFee", e.target.value)}
                placeholder="e.g., $1,200/季"
                data-testid="input-strata-fee"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="agent-name">{t("agent_name")}</Label>
                <Input
                  id="agent-name"
                  value={formData.agentName}
                  onChange={(e) => handleChange("agentName", e.target.value)}
                  placeholder="e.g., 王經紀"
                  data-testid="input-agent-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-mobile">{t("agent_mobile")}</Label>
                <Input
                  id="agent-mobile"
                  value={formData.agentMobile}
                  onChange={(e) => handleChange("agentMobile", e.target.value)}
                  placeholder="e.g., 0412 345 678"
                  data-testid="input-agent-mobile"
                />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            data-testid="button-cancel-create-listing"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || createListingMutation.isPending}
            data-testid="button-save-listing"
          >
            {createListingMutation.isPending ? "..." : t("save_listing")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
