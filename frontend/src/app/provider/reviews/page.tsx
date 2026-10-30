import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { StarRating } from "@/components/star-rating";
import { Card, CardContent } from "@/components/ui/card";
import { serverApi } from "@/lib/api-server";
import { ApiError } from "@/lib/errors";
import type { Page, ProviderSummary, Review } from "@/types";

import { ReviewList } from "../../providers/[id]/review-list";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  let profile: ProviderSummary;
  try {
    profile = await serverApi<ProviderSummary>("/providers/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) redirect("/provider/onboarding");
    throw e;
  }
  const reviews = await serverApi<Page<Review>>("/providers/me/reviews?page_size=10");

  return (
    <>
      <PageHeader title="Reviews" description="What customers say after their appointments." />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Card className="self-start">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <p className="font-heading text-5xl font-bold">{profile.review_count ? profile.avg_rating.toFixed(1) : "—"}</p>
            <StarRating value={profile.avg_rating} className="mt-2" size="size-5" />
            <p className="mt-2 text-sm text-muted-foreground">
              {profile.review_count} review{profile.review_count === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ReviewList providerId={profile.id} initial={reviews} path="/providers/me/reviews" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
