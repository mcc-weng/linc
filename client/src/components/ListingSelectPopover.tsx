import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, Star, Check } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import type { Listing } from "@shared/schema";

interface ListingSelectPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: Listing[];
  primaryListingId: number | null;
  onSelect: (listing: Listing) => void;
  title?: string;
}

export default function ListingSelectPopover({
  open,
  onOpenChange,
  listings,
  primaryListingId,
  onSelect,
  title,
}: ListingSelectPopoverProps) {
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);
  
  const [selectedId, setSelectedId] = useState<number | null>(primaryListingId);

  const handleSelect = (listing: Listing) => {
    setSelectedId(listing.id);
  };

  const handleConfirm = () => {
    const selected = listings.find(l => l.id === selectedId);
    if (selected) {
      onSelect(selected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title || t("select_listing")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {t("which_property")}
        </p>
        <ScrollArea className="h-[250px] pr-4">
          <div className="space-y-2">
            {listings.map((listing) => (
              <button
                key={listing.id}
                onClick={() => handleSelect(listing)}
                className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                  selectedId === listing.id
                    ? "bg-primary/10 border border-primary"
                    : "hover-elevate border border-transparent"
                }`}
                data-testid={`button-select-listing-${listing.id}`}
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{listing.title}</span>
                    {listing.id === primaryListingId && (
                      <Star className="w-3 h-3 fill-current text-primary shrink-0" />
                    )}
                  </div>
                  {listing.address && (
                    <div className="text-xs text-muted-foreground truncate">
                      {listing.address}
                    </div>
                  )}
                  {listing.priceGuide && (
                    <div className="text-xs text-muted-foreground">
                      {listing.priceGuide}
                    </div>
                  )}
                </div>
                {selectedId === listing.id && (
                  <Check className="w-5 h-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-select-listing"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId}
            data-testid="button-confirm-select-listing"
          >
            {t("select_listing")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
