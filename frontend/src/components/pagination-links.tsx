import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { pageWindow } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export function PaginationLinks({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  const nav = (target: number, disabled: boolean, children: React.ReactNode, label: string) =>
    disabled ? (
      <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "pointer-events-none opacity-50")}>
        {children}
      </span>
    ) : (
      <Link href={hrefFor(target)} aria-label={label} className={buttonVariants({ variant: "outline", size: "icon-lg" })}>
        {children}
      </Link>
    );

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {nav(page - 1, page <= 1, <ChevronLeft />, "Previous page")}
      {pageWindow(page, pages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={buttonVariants({ variant: p === page ? "default" : "ghost", size: "icon-lg" })}
          >
            {p}
          </Link>
        ),
      )}
      {nav(page + 1, page >= pages, <ChevronRight />, "Next page")}
    </nav>
  );
}
