import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { PaginationLinks } from "@/components/pagination-links";
import { ProviderCard } from "@/components/provider-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { serverApi } from "@/lib/api-server";
import { errorMessage } from "@/lib/errors";
import type { Page, ProviderSummary } from "@/types";

import { FiltersSheet, FiltersSidebar, SortSelect } from "./filters";

export const metadata: Metadata = { title: "Find services" };

const FILTER_KEYS = ["q", "category", "location", "min_rating", "min_price", "max_price"];
const PARAM_KEYS = [...FILTER_KEYS, "sort", "page"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProvidersPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  query.set("page_size", "12");

  let results: Page<ProviderSummary> | null = null;
  let error: string | null = null;
  try {
    results = await serverApi<Page<ProviderSummary>>(`/providers?${query.toString()}`);
  } catch (e) {
    error = errorMessage(e);
  }

  const activeCount = FILTER_KEYS.filter((k) => query.has(k)).length;
  const hrefFor = (page: number) => {
    const next = new URLSearchParams(query);
    next.delete("page_size");
    next.set("page", String(page));
    return `/providers?${next.toString()}`;
  };
  const heading = typeof raw.category === "string" && raw.category ? raw.category : "All services";

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
          {results && (
            <p className="mt-1 text-muted-foreground">
              {results.total} provider{results.total === 1 ? "" : "s"}
              {typeof raw.location === "string" && raw.location ? ` near ${raw.location}` : ""}
            </p>
          )}
        </div>
        <Suspense>
          <div className="flex gap-2">
            <FiltersSheet activeCount={activeCount} />
            <SortSelect />
          </div>
        </Suspense>
      </div>

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <Suspense>
          <FiltersSidebar />
        </Suspense>
        <div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>Couldn&apos;t load providers: {error}</AlertDescription>
            </Alert>
          )}
          {results && results.items.length === 0 && (
            <EmptyState icon={SearchX} title="No providers match your filters" description="Try widening your search or clearing some filters.">
              <Link href="/providers" className={buttonVariants({ variant: "outline" })}>
                Clear all filters
              </Link>
            </EmptyState>
          )}
          {results && results.items.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.items.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
              <PaginationLinks page={results.page} pages={results.pages} hrefFor={hrefFor} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
