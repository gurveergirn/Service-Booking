"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function StarRating({ value, className, size = "size-4" }: { value: number; className?: string; size?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(size, i <= Math.round(value) ? "fill-rating text-rating" : "fill-muted text-muted-foreground/30")}
        />
      ))}
    </span>
  );
}

export function RatingSummary({ average, count, className }: { average: number; count: number; className?: string }) {
  if (!count) return <span className={cn("text-sm text-muted-foreground", className)}>New · no reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-rating text-rating" />
      <span className="font-semibold">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
          >
            <Star className={cn("size-7 transition-colors", i <= (hover || value) ? "fill-rating text-rating" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{labels[hover || value]}</span>
    </div>
  );
}
