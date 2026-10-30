"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/logout";
import type { Session } from "@/types";

export function MobileNav({ session, links }: { session: Session | null; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const all = session?.role === "PROVIDER" ? [...links, { href: "/provider/reviews", label: "Reviews" }, { href: "/provider/profile", label: "Profile settings" }] : links;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Open menu" />}>
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle render={<div />}>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {all.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "justify-start")}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 border-t pt-4">
            {session ? (
              <Button variant="outline" size="lg" className="w-full" onClick={() => void logout()}>
                Log out
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Log in
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className={buttonVariants({ size: "lg" })}>
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
