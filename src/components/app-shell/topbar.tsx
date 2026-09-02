import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SyncButton } from "./sync-button";
import { LogoutMenuItem } from "./logout-menu-item";
import { EmailAlertsCard } from "@/app/(app)/dashboard/email-alerts-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { canMutate, ROLE_LABELS, type AppRole } from "@/lib/authz";

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
}

export async function Topbar() {
  const session = await auth();
  const user = session?.user;
  // Sync now is a write-ish, platform-wide action — same bar as every
  // other mutation (Admin + Manager, not plain User), not Admin-only.
  const canSync = canMutate(user?.role);

  // Global (every page under the (app) layout, not just /dashboard) since
  // this now lives in the Topbar rather than the dashboard's own filter
  // bar — a small, capped-at-20-rows query, cheap enough to run on every
  // page load.
  const emailRecipients = await prisma.emailAlertRecipient.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-border bg-background/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {canSync ? <SyncButton /> : null}
        <EmailAlertsCard recipients={emailRecipients} canEdit={canSync} />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-[13px] font-medium text-foreground">{user?.name ?? "User"}</span>
              <span className="text-[11px] text-muted-foreground">
                {user?.role && user.role in ROLE_LABELS ? ROLE_LABELS[user.role as AppRole] : user?.role}
              </span>
            </div>
            <Avatar className="size-8">
              <AvatarFallback className="bg-accent text-[12px] font-semibold text-accent-foreground">
                {initials(user?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">{user?.name ?? "User"}</span>
              <span className="truncate text-[12px] font-normal text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <LogoutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
