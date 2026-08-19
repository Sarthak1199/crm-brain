"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(app)/actions";

export function LogoutMenuItem() {
  return (
    <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
      <LogOut className="size-4" />
      Sign out
    </DropdownMenuItem>
  );
}
