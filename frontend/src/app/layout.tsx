import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AppProviders } from "@/components/app-providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "BookWell — Book local services", template: "%s · BookWell" },
  description: "Find and book barbers, tutors, cleaners, trainers and more. Real-time availability, no phone calls.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh antialiased">
        <AppProviders session={session}>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader session={session} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
