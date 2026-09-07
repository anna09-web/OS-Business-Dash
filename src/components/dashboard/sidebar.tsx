"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Lock, Wallet, ListChecks, Settings } from "lucide-react";

import { BUSINESS_AREA_META, isAreaUnlocked, type BusinessArea } from "@/lib/business-areas";
import { cn } from "@/lib/utils";

const TOP_ITEMS = [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
const BOTTOM_ITEMS = [
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ areas }: { areas: BusinessArea[] }) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
        <span className="text-sm font-semibold tracking-wide text-sidebar-foreground">
          BUSINESS OS
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {TOP_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}

        <p className="mt-3 mb-1 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Business
        </p>
        {areas.map((area) => {
          const href = `/business/${area.slug}`;
          const unlocked = isAreaUnlocked(area);
          const Icon = BUSINESS_AREA_META[area.slug]?.icon ?? Lock;
          return (
            <Link
              key={area.slug}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1 truncate">{area.name}</span>
              {!unlocked && <Lock className="size-3.5 shrink-0" />}
            </Link>
          );
        })}

        <div className="my-2 border-t border-sidebar-border" />

        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
        Your business, one dashboard.
      </div>
    </aside>
  );
}
