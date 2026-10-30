import Link from "next/link";

import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import type { Session } from "@/types";

export function navLinks(session: Session | null) {
  const links = [{ href: "/providers", label: "Find services" }];
  if (session) links.push({ href: "/dashboard", label: "Dashboard" });
  if (session?.role === "PROVIDER") {
    links.push({ href: "/provider/services", label: "Services" }, { href: "/provider/availability", label: "Availability" });
  }
  return links;
}

export function SiteHeader({ session }: { session: Session | null }) {
  const links = navLinks(session);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={buttonVariants({ variant: "ghost", size: "lg" })}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <UserMenu session={session} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                Log in
              </Link>
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Sign up
              </Link>
            </div>
          )}
          <MobileNav session={session} links={links} />
        </div>
      </div>
    </header>
  );
}
