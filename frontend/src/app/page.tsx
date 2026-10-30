import { CalendarCheck, CalendarClock, MapPin, Search, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Search, title: "Find the right pro", text: "Filter by category, location, rating and price." },
  { icon: CalendarClock, title: "Pick a real open slot", text: "See live availability — no calls, no back-and-forth." },
  { icon: CalendarCheck, title: "Get confirmed", text: "Your provider accepts and you both get an email." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_70%_-10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
        <div className="container-page py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" /> Free to book · Pay your provider directly
            </p>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Book trusted local services in a few taps
            </h1>
            <p className="mt-5 text-lg text-muted-foreground text-pretty">
              Barbers, tutors, cleaners, trainers and more — see real-time availability and lock in a time that works for you.
            </p>
          </div>

          <form action="/providers" className="mt-8 flex max-w-3xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row">
            <label className="flex flex-1 items-center gap-2 px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input name="q" placeholder="What do you need? e.g. haircut, math tutor" className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent" />
            </label>
            <label className="flex flex-1 items-center gap-2 border-t px-3 sm:border-t-0 sm:border-l">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <Input name="location" placeholder="City" className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent" />
            </label>
            <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-11 px-6")}>
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Browse by category</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <Link
              key={name}
              href={`/providers?category=${encodeURIComponent(name)}`}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-medium">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="container-page py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <Icon className="size-4 text-primary" /> {title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="font-heading text-2xl font-bold">Are you a service provider?</h2>
            <p className="mt-2 max-w-xl opacity-90">
              Publish your hours, accept bookings and track your schedule — free. <Star className="inline size-4 fill-current" /> Build your reputation with reviews.
            </p>
          </div>
          <Link href="/register?role=PROVIDER" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11 px-6")}>
            List your services
          </Link>
        </div>
      </section>
    </>
  );
}
