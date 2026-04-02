"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletControl } from "@/components/protocol/wallet-control";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/auctions/metropolitan-core-office-complex", label: "Auction Details" },
  { href: "/issuer", label: "Issuer Terminal" },
  { href: "/dashboard", label: "User Dashboard" },
];

function isActive(pathname: string, href: string) {
  if (href === "/marketplace" && pathname === "/") {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { cluster, protocolMode } = useValoremApp();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center border border-line bg-surface">
                <span className="h-3 w-3 bg-copper" />
              </span>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.36em] text-muted">
                  Institutional Auction Exchange
                </p>
                <p className="text-base font-semibold uppercase tracking-[0.28em] text-ink">
                  Valorem
                </p>
              </div>
            </Link>
            <div className="hidden h-10 w-px bg-line lg:block" />
            <div className="hidden text-[10px] uppercase tracking-[0.34em] text-muted lg:block">
              Closed network / invitation only / rwa settlement desk
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="rounded-full border border-line bg-surface px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              {`Env / ${protocolMode} / ${cluster}`}
            </div>
            <Link
              href="/issuer"
              className="inline-flex items-center justify-center border border-copper bg-copper px-4 py-2 text-[10px] font-medium uppercase tracking-[0.3em] text-white transition-colors hover:bg-copper-soft"
            >
              Issuer Desk
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <nav className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-2">
            {navigationItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center border px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-colors",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-surface/75 text-muted hover:border-copper hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            </div>
          </nav>
          <div className="xl:justify-self-end">
            <WalletControl />
          </div>
        </div>
      </div>
    </header>
  );
}
