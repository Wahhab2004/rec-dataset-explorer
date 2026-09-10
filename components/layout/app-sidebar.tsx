"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
  { label: "Datasets", href: "/datasets", icon: Database },
  { label: "Upload Dataset", href: "/upload", icon: Upload },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  collapsed,
  onCollapsedChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      id="application-sidebar"
      aria-label="Application sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border px-3",
          collapsed && "justify-center px-2",
        )}
      >
        <Link
          href="/"
          aria-label="REC Dataset Explorer home"
          title={collapsed ? "REC Dataset Explorer" : undefined}
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            collapsed && "justify-center",
          )}
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
          >
            <Database className="size-4" strokeWidth={1.8} />
          </span>
          <span
            className={cn(
              "truncate text-[13px] font-semibold tracking-tight",
              collapsed && "sr-only",
            )}
          >
            REC Dataset Explorer
          </span>
        </Link>
      </div>

      <button
        type="button"
        aria-controls="application-sidebar"
        aria-expanded={!collapsed}
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute top-3 right-0 grid size-7 translate-x-1/2 place-items-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xs outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
      >
        {collapsed ? (
          <PanelLeftOpen aria-hidden="true" className="size-3.5" />
        ) : (
          <PanelLeftClose aria-hidden="true" className="size-3.5" />
        )}
      </button>

      <nav
        id="primary-navigation"
        aria-label="Primary navigation"
        className="flex flex-1 flex-col gap-1 p-2"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-9 items-center rounded-md text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
              <span className={cn("truncate", collapsed && "sr-only")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
