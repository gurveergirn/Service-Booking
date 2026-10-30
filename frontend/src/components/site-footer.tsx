import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container-page flex flex-col gap-3 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} BookWell. Book local services without the back-and-forth.</p>
        <div className="flex gap-4">
          <Link href="/providers" className="hover:text-foreground">
            Browse providers
          </Link>
          <Link href="/register?role=PROVIDER" className="hover:text-foreground">
            Become a provider
          </Link>
        </div>
      </div>
    </footer>
  );
}
