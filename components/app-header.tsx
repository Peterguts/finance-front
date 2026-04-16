"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  RefreshCw,
  PieChart,
  BarChart3,
  FileText,
  Menu,
  X,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";

function FinanceLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fg" x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="bg" x1="10" y1="44" x2="44" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" stopOpacity="0.22" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="11" fill="url(#bg)" />
      <rect x="5" y="5" width="38" height="38" rx="11" stroke="url(#fg)" strokeWidth="2" />
      <path
        d="M24 14c-4.1 0-7.4 2.4-7.4 5.8 0 3.2 2.6 4.5 6.1 5.3l1.2.3c2.6.6 3.6 1.2 3.6 2.4 0 1.5-1.7 2.5-4 2.5-2.5 0-4.8-1.2-6.3-2.6l-2.3 2.3c1.7 1.7 4.2 3.1 7.2 3.4V37h3v-2.9c4.2-.6 7-3.2 7-6.4 0-3.3-2.5-4.9-6.7-5.9l-1.2-.3c-2.4-.6-3.1-1.1-3.1-2.1 0-1.2 1.4-2.1 3.7-2.1 2.1 0 3.9.8 5.3 2l2.1-2.4c-1.6-1.4-3.6-2.4-6.1-2.7V14h-3z"
        fill="url(#fg)"
      />
    </svg>
  );
}

interface AppHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  fxRateLabel?: string;
}

export function AppHeader({ onRefresh, isRefreshing, fxRateLabel }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = useMemo(
    () => [
      { href: "/#resumen", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/#distribucion", label: "Distribución", icon: <PieChart className="h-4 w-4" /> },
      { href: "/simulador", label: "Simulador", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/#inversiones", label: "Inversiones", icon: <List className="h-4 w-4" /> },
      { href: "/#reportes", label: "Reportes", icon: <FileText className="h-4 w-4" /> },
      { href: "/depositos", label: "Depósitos", icon: <PiggyBank className="h-4 w-4" /> },
    ],
    []
  );

  return (
    <header className="border-b border-border bg-card">
      <div className="h-1 w-full bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-5)] to-[var(--chart-3)]" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex w-full items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 text-foreground no-underline">
            <FinanceLogo className="h-9 w-9 shrink-0" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              Finanzas Fifis
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted sm:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4" />
            </button>
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
          </div>
        </div>

        <nav className="hidden sm:flex w-full items-center gap-1 overflow-x-auto sm:w-auto" aria-label="Navegación principal">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-[15px] font-semibold transition-colors",
                "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {s.icon}
              {s.label}
            </Link>
          ))}
        </nav>
        {fxRateLabel ? (
          <div className="hidden sm:block text-xs text-muted-foreground">
            USD/GTQ: <span className="font-mono">{fxRateLabel}</span>
          </div>
        ) : null}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
            <div className="absolute right-0 top-0 h-full w-[86%] max-w-xs bg-card shadow-xl border-l border-border">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                  <FinanceLogo className="h-9 w-9 shrink-0" />
                <div>
                    <p className="text-base font-bold text-foreground leading-tight">Finanzas Fifis</p>
                    <p className="text-sm text-muted-foreground leading-tight">Secciones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {sections.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold",
                    "border border-border bg-card hover:bg-muted"
                  )}
                >
                  <span className="text-foreground">{s.icon}</span>
                  <span className="text-foreground">{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
