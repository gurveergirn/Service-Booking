import { CalendarCheck2 } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarCheck2 className="size-4.5" />
      </span>
      BookWell
    </Link>
  );
}
