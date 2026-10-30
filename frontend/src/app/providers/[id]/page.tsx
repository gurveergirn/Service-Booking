import { Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProviderAvatar } from "@/components/provider-avatar";
import { RatingSummary } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverApi } from "@/lib/api-server";
import { ApiError } from "@/lib/errors";
import { formatDuration, formatPrice, summarizeHours } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { Page, ProviderDetail, Review } from "@/types";

import { BookingWidget } from "./booking-widget";
import { ReviewList } from "./review-list";

type Params = Promise<{ id: string }>;

async function loadProvider(id: string) {
  try {
    return await serverApi<ProviderDetail>(`/providers/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await serverApi<ProviderDetail>(`/providers/${encodeURIComponent(id)}`);
    return { title: `${p.name} · ${p.category}`, description: p.bio.slice(0, 160) };
  } catch {
    return { title: "Provider" };
  }
}

export default async function ProviderPage({ params }: { params: Params }) {
  const { id } = await params;
  const [provider, reviews, session] = await Promise.all([
    loadProvider(id),
    serverApi<Page<Review>>(`/providers/${encodeURIComponent(id)}/reviews?page_size=5`),
    getSession(),
  ]);
  const hours = summarizeHours(provider.availability);

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-8">
          <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProviderAvatar name={provider.name} url={provider.avatar_url} className="size-24" />
            <div>
              <Badge variant="secondary">{provider.category}</Badge>
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight">{provider.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" /> {provider.location}
                </span>
                <RatingSummary average={provider.avg_rating} count={provider.review_count} />
              </div>
            </div>
          </section>

          {provider.bio && <p className="leading-relaxed text-pretty whitespace-pre-line">{provider.bio}</p>}

          <section>
            <h2 className="mb-4 font-heading text-xl font-semibold">Services</h2>
            {provider.services.length === 0 ? (
              <p className="text-muted-foreground">This provider hasn&apos;t listed any services yet.</p>
            ) : (
              <div className="divide-y rounded-xl border bg-card">
                {provider.services.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.description && <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>}
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" /> {formatDuration(s.duration_minutes)}
                      </p>
                    </div>
                    <p className="font-semibold whitespace-nowrap">{formatPrice(s.price)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 flex items-baseline gap-3 font-heading text-xl font-semibold">
              Reviews
              <RatingSummary average={provider.avg_rating} count={provider.review_count} className="font-sans text-base font-normal" />
            </h2>
            <ReviewList providerId={provider.id} initial={reviews} />
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <BookingWidget provider={provider} session={session} />
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Opening hours</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[3rem_1fr] gap-y-1.5 text-sm">
                {hours.map((h) => (
                  <div key={h.day} className="contents">
                    <dt className="font-medium">{h.day}</dt>
                    <dd className={h.hours === "Closed" ? "text-muted-foreground" : ""}>{h.hours}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
