"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/provider/services", label: "Services" },
  { href: "/provider/availability", label: "Availability" },
  { href: "/provider/reviews", label: "Reviews" },
  { href: "/provider/profile", label: "Profile" },
];

export function ProviderNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/provider/onboarding")) return null;
  return (
    <nav aria-label="Provider" className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b pb-px">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            pathname === link.href ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
