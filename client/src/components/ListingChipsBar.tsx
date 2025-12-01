import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Plus, 
  Star, 
  X, 
  Check,
  ChevronDown
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import type { Listing } from "@shared/schema";

interface ListingChipsBarProps {
  conversationId: number;
}

interface ConversationListingsResponse {
  listings: Listing[];
  primaryListingId: number | null;
}

export default function ListingChipsBar({ conversationId }: ListingChipsBarProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);
  
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListingTitle, setNewListingTitle] = useState("");
  const [newListingAddress, setNewListingAddress] = useState("");
  const [newListingPrice, setNewListingPrice] = useState("");

  const { data: conversationListings } = useQuery<ConversationListingsResponse>({
    queryKey: ["/api/conversations", conversationId, "listings"],
    queryFn: () => fetch(`/api/conversations/${conversationId}/listings`).then(r => r.json()),
    enabled: !!conversationId,
  });

  const { data: allListings } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  const linkListingMutation = useMutation({
    mutationFn: (data: { listingId: number; setPrimary?: boolean }) => 
      apiRequest(`/api/conversations/${conversationId}/listings`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "listings"] });
      toast({
        title: t("listing_linked"),
      });
      setIsAddPopoverOpen(false);
    },
  });

  const unlinkListingMutation = useMutation({
    mutationFn: (listingId: number) => 
      apiRequest(`/api/conversations/${conversationId}/listings/${listingId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "listings"] });
      toast({
        title: t("listing_unlinked"),
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (listingId: number) => 
      apiRequest(`/api/conversations/${conversationId}/listings/${listingId}/primary`, {
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "listings"] });
    },
  });

  const createListingMutation = useMutation({
    mutationFn: (data: { title: string; address?: string; priceGuide?: string }) => 
      apiRequest("/api/listings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: async (newListing: Listing) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      await linkListingMutation.mutateAsync({ listingId: newListing.id, setPrimary: true });
      toast({
        title: t("listing_created"),
      });
      setIsCreateModalOpen(false);
      setNewListingTitle("");
      setNewListingAddress("");
      setNewListingPrice("");
    },
  });

  const linkedListings = conversationListings?.listings || [];
  const primaryListingId = conversationListings?.primaryListingId;

  const availableListings = allListings?.filter(
    listing => !linkedListings.some(l => l.id === listing.id)
  ) || [];

  const handleCreateListing = () => {
    if (!newListingTitle.trim()) return;
    createListingMutation.mutate({
      title: newListingTitle.trim(),
      address: newListingAddress.trim() || undefined,
      priceGuide: newListingPrice.trim() || undefined,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="listing-chips-bar">
      {linkedListings.map((listing) => (
        <Badge
          key={listing.id}
          variant={listing.id === primaryListingId ? "default" : "secondary"}
          className="flex items-center gap-1 px-2 py-1 cursor-pointer group"
          data-testid={`listing-chip-${listing.id}`}
        >
          <Home className="w-3 h-3" />
          <span className="max-w-[120px] truncate">{listing.title}</span>
          {listing.id === primaryListingId && (
            <Star className="w-3 h-3 fill-current" />
          )}
          {listing.id !== primaryListingId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPrimaryMutation.mutate(listing.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title={t("set_as_primary")}
              data-testid={`button-set-primary-${listing.id}`}
            >
              <Star className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              unlinkListingMutation.mutate(listing.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            title={t("remove_listing")}
            data-testid={`button-remove-listing-${listing.id}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 px-2 text-xs"
            data-testid="button-add-listing"
          >
            <Plus className="w-3 h-3 mr-1" />
            {linkedListings.length === 0 ? t("add_listing") : <ChevronDown className="w-3 h-3" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("select_listing")}</div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {availableListings.length === 0 && linkedListings.length > 0 && (
                  <div className="text-sm text-muted-foreground py-2 text-center">
                    {t("no_results")}
                  </div>
                )}
                {availableListings.map((listing) => (
                  <button
                    key={listing.id}
                    onClick={() => linkListingMutation.mutate({ 
                      listingId: listing.id,
                      setPrimary: linkedListings.length === 0
                    })}
                    className="w-full flex items-center gap-2 p-2 rounded-md hover-elevate text-left text-sm"
                    data-testid={`button-link-listing-${listing.id}`}
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{listing.title}</div>
                      {listing.address && (
                        <div className="truncate text-xs text-muted-foreground">{listing.address}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setIsAddPopoverOpen(false);
                  setIsCreateModalOpen(true);
                }}
                data-testid="button-create-new-listing"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("create_new_listing")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("create_new_listing")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="listing-title">{t("listing_title")} *</Label>
              <Input
                id="listing-title"
                value={newListingTitle}
                onChange={(e) => setNewListingTitle(e.target.value)}
                placeholder="e.g., Chatswood 精品公寓"
                data-testid="input-listing-title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="listing-address">{t("listing_address")}</Label>
              <Input
                id="listing-address"
                value={newListingAddress}
                onChange={(e) => setNewListingAddress(e.target.value)}
                placeholder="e.g., 123 Victoria Avenue, Chatswood NSW"
                data-testid="input-listing-address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="listing-price">{t("listing_price")}</Label>
              <Input
                id="listing-price"
                value={newListingPrice}
                onChange={(e) => setNewListingPrice(e.target.value)}
                placeholder="e.g., $1,200,000 - $1,350,000"
                data-testid="input-listing-price"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              data-testid="button-cancel-create-listing"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreateListing}
              disabled={!newListingTitle.trim() || createListingMutation.isPending}
              data-testid="button-save-listing"
            >
              {createListingMutation.isPending ? "..." : t("save_listing")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
