"use client";

import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-svh w-full bg-background">
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform duration-200 focus-visible:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
      >
        Skip to main content
      </a>

      <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "min-h-svh min-w-0 transition-[padding] duration-200 focus:outline-none motion-reduce:transition-none",
          collapsed ? "pl-16" : "pl-60",
        )}
      >
        {children}
      </main>
    </div>
  );
}
