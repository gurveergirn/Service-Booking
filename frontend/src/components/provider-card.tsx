import { MapPin } from "lucide-react";
import Link from "next/link";

import { ProviderAvatar } from "@/components/provider-avatar";
import { RatingSummary } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import type { ProviderSummary } from "@/types";

export function ProviderCard({ provider }: { provider: ProviderSummary }) {
  return (
    <Link
      href={`/providers/${provider.id}`}
      className="group flex flex-col rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <ProviderAvatar name={provider.name} url={provider.avatar_url} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover:text-primary">{provider.name}</p>
          <Badge variant="secondary" className="mt-1">
            {provider.category}
          </Badge>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 flex-1 text-sm text-muted-foreground">{provider.bio || "No description yet."}</p>
      <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{provider.location}</span>
        </span>
        <RatingSummary average={provider.avg_rating} count={provider.review_count} />
      </div>
      <p className="mt-2 text-sm">
        From <span className="font-semibold">{formatPrice(provider.starting_price)}</span>
      </p>
    </Link>
  );
}
