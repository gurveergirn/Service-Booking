"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { Page, Review } from "@/types";

export function ReviewItem({ review }: { review: Review }) {
  return (
    <article className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <StarRating value={review.rating} />
          <span className="font-medium">{review.customer_name}</span>
        </div>
        <time className="text-xs text-muted-foreground" dateTime={review.created_at}>
          {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </time>
      </div>
      {review.comment && <p className="mt-2 text-sm leading-relaxed">{review.comment}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{review.service_name}</p>
    </article>
  );
}

export function ReviewList({ providerId, initial, path }: { providerId: string; initial: Page<Review>; path?: string }) {
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const next = await api.get<Page<Review>>(path ?? `/providers/${providerId}/reviews`, { page: page + 1, page_size: initial.page_size });
      setItems((prev) => [...prev, ...next.items]);
      setPage(next.page);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews appear here after completed appointments." />;
  }
  return (
    <div>
      <div className="divide-y">
        {items.map((r) => (
          <ReviewItem key={r.id} review={r} />
        ))}
      </div>
      {items.length < initial.total && (
        <Button variant="outline" onClick={loadMore} disabled={loading} className="mt-2">
          {loading ? "Loading…" : "Show more reviews"}
        </Button>
      )}
    </div>
  );
}
