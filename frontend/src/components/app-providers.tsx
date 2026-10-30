"use client";

import { ThemeProvider } from "next-themes";
import { createContext, useContext } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Session } from "@/types";

const SessionContext = createContext<Session | null>(null);

export function useSession() {
  return useContext(SessionContext);
}

export function AppProviders({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionContext.Provider value={session}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </SessionContext.Provider>
    </ThemeProvider>
  );
}
