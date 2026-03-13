"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, RefreshCw } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AppHeader({ onRefresh, isRefreshing }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-foreground no-underline">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">Finanzas</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Navegación principal">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-muted text-card-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/inversiones"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/inversiones"
                ? "bg-muted text-card-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
            Inversiones
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              )}
              aria-label="Refrescar datos"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
