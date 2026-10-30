"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/categories";

const ANY = "any";
const categoryItems = [{ value: ANY, label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.name, label: c.name }))];
const ratingItems = [
  { value: ANY, label: "Any rating" },
  { value: "4.5", label: "4.5+ stars" },
  { value: "4", label: "4+ stars" },
  { value: "3", label: "3+ stars" },
];
export const sortItems = [
  { value: "rating", label: "Top rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

type FilterState = { q: string; category: string; location: string; min_rating: string; min_price: string; max_price: string };
const KEYS: (keyof FilterState)[] = ["q", "category", "location", "min_rating", "min_price", "max_price"];

function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== ANY) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return { params, update, pending };
}

function FilterFields({ onApplied }: { onApplied?: () => void }) {
  const { params, update, pending } = useUpdateParams();
  const fromParams = (): FilterState => Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ""])) as FilterState;
  const [state, setState] = useState<FilterState>(fromParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setState(fromParams()), [params]);

  const set = (key: keyof FilterState) => (value: string) => setState((s) => ({ ...s, [key]: value }));

  function apply(event?: React.FormEvent) {
    event?.preventDefault();
    update(state);
    onApplied?.();
  }

  function clear() {
    update(Object.fromEntries(KEYS.map((k) => [k, ""])));
    onApplied?.();
  }

  return (
    <form onSubmit={apply} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="q">Keyword</Label>
        <Input id="q" value={state.q} onChange={(e) => set("q")(e.target.value)} placeholder="Name or service" className="h-9" />
      </div>
      <div className="grid gap-2">
        <Label>Category</Label>
        <Select items={categoryItems} value={state.category || ANY} onValueChange={(v) => set("category")(String(v ?? ""))}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" value={state.location} onChange={(e) => set("location")(e.target.value)} placeholder="City" className="h-9" />
      </div>
      <div className="grid gap-2">
        <Label>Minimum rating</Label>
        <Select items={ratingItems} value={state.min_rating || ANY} onValueChange={(v) => set("min_rating")(String(v ?? ""))}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ratingItems.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Starting price ($)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" min={0} inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={state.min_price} onChange={(e) => set("min_price")(e.target.value)} className="h-9" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" min={0} inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={state.max_price} onChange={(e) => set("max_price")(e.target.value)} className="h-9" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
          Apply filters
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={clear} disabled={pending}>
          <X /> Clear
        </Button>
      </div>
    </form>
  );
}

export function FiltersSidebar() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-xl border bg-card p-5">
        <p className="mb-4 font-semibold">Filters</p>
        <FilterFields />
      </div>
    </aside>
  );
}

export function FiltersSheet({ activeCount }: { activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="lg" className="lg:hidden" />}>
        <SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <FilterFields onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SortSelect() {
  const { params, update } = useUpdateParams();
  return (
    <Select items={sortItems} value={params.get("sort") ?? "rating"} onValueChange={(v) => update({ sort: v === "rating" ? "" : String(v) })}>
      <SelectTrigger className="h-9 w-48" aria-label="Sort by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortItems.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
