import { useState, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  DollarSign,
  Calendar,
  FileText,
  Info,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Car,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { getTranslation, translations } from "@/lib/language";
import type { Listing, FAQCategory } from "@shared/schema";

interface PropertyCarouselProps {
  listings: Listing[];
  onQuickReply: (category: FAQCategory, listingId: number) => void;
  isLoading?: boolean;
  reasoning?: string;
}

export default function PropertyCarousel({
  listings,
  onQuickReply,
  isLoading = false,
  reasoning,
}: PropertyCarouselProps) {
  const { language } = useLanguage();
  const t = (key: keyof typeof translations.zh) => getTranslation(language, key);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setDragStart(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - dragStart) * 1;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const quickReplyButtons: { category: FAQCategory; icon: typeof DollarSign; labelKey: keyof typeof translations.zh }[] = [
    { category: "price", icon: DollarSign, labelKey: "quick_reply_price" },
    { category: "inspection", icon: Calendar, labelKey: "quick_reply_inspection" },
    { category: "property_info", icon: Info, labelKey: "quick_reply_property_info" },
    { category: "contract", icon: FileText, labelKey: "quick_reply_contract" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse text-primary" />
          <span className="text-sm text-muted-foreground">{t("loading_recommendations")}</span>
        </div>
        <div className="flex gap-3">
          {[1, 2].map((i) => (
            <Card key={i} className="flex-shrink-0 w-[280px]">
              <CardHeader className="p-3 pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full mt-1" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="p-3 pt-0">
                <div className="flex gap-1 flex-wrap">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <Home className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">{t("no_properties_yet")}</p>
        <p className="text-xs mt-1">{t("add_property_to_start")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-full overflow-hidden">
      {reasoning && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/10 w-full">
          <Sparkles className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed break-words">{reasoning}</p>
        </div>
      )}
      
      <div 
        ref={carouselRef}
        className="flex gap-3 pb-2 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        data-testid="carousel-properties"
      >
        {listings.map((listing) => (
            <Card 
            key={listing.id} 
            className="flex-shrink-0 w-[280px] overflow-hidden select-none"
            data-testid={`property-card-${listing.id}`}
          >
              <CardHeader className="p-3 pb-2 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm leading-tight line-clamp-2">
                    {listing.title}
                  </h4>
                  {listing.bedrooms && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {listing.bedrooms}{t("bedrooms_short")}
                    </Badge>
                  )}
                </div>
                {listing.address && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{listing.address}</span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="p-3 pt-0 space-y-2">
                {listing.priceGuide && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{listing.priceGuide}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {listing.bedrooms && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-3 h-3" /> {listing.bedrooms}
                    </span>
                  )}
                  {listing.bathrooms && (
                    <span className="flex items-center gap-1">
                      <Bath className="w-3 h-3" /> {listing.bathrooms}
                    </span>
                  )}
                  {listing.parking && (
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" /> {listing.parking}
                    </span>
                  )}
                </div>

                {(listing.inspectionAvailableDate || listing.inspectionAvailableTime) && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">{t("available_inspection")}</div>
                      {listing.inspectionAvailableDate && <div>{listing.inspectionAvailableDate}</div>}
                      {listing.inspectionAvailableTime && <div>{listing.inspectionAvailableTime}</div>}
                    </div>
                  </div>
                )}

                {listing.contractLink && (
                  <a
                    href={listing.contractLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid={`link-contract-${listing.id}`}
                  >
                    <FileText className="w-3 h-3" />
                    {t("view_contract")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
              
              <CardFooter className="p-3 pt-0">
                <div className="w-full space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">{t("quick_actions")}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {quickReplyButtons.map(({ category, icon: Icon, labelKey }) => (
                      <Button
                        key={category}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs justify-start px-2"
                        onClick={() => onQuickReply(category, listing.id)}
                        data-testid={`button-quick-reply-${category}-${listing.id}`}
                      >
                        <Icon className="w-3 h-3 mr-1.5 shrink-0" />
                        <span className="truncate">{t(labelKey)}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardFooter>
            </Card>
        ))}
      </div>
    </div>
  );
}
