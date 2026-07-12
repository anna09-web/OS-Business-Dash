"use client";

import { LogOut, User as UserIcon } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/types/database";

export function UserMenu({ email, role }: { email: string; role: UserRole }) {
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-accent">
        <Avatar className="size-7">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <Badge variant={role === "owner" ? "default" : "secondary"} className="capitalize">
          {role}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <UserIcon className="size-4" />
          <span className="truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
