"use client";

import { LayoutDashboard, LogOut, Settings, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";
import { logout } from "@/lib/logout";
import type { Session } from "@/types";

export function UserMenu({ session }: { session: Session }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Account menu">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(session.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate font-semibold text-foreground">{session.name}</span>
            <span className="truncate text-xs font-normal">{session.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
          <LayoutDashboard /> Dashboard
        </DropdownMenuItem>
        {session.role === "PROVIDER" && (
          <>
            <DropdownMenuItem onClick={() => router.push("/provider/reviews")}>
              <Star /> Reviews
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/provider/profile")}>
              <Settings /> Profile settings
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
