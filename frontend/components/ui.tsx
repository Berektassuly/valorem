import type { ReactNode } from "react";
import Link from "next/link";
import { AssetArtwork } from "@/components/asset-artwork";
import type { AuctionLot, MetricItem } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type Tone = "surface" | "muted" | "dark";

const panelToneClasses: Record<Tone, string> = {
  surface: "border-line bg-surface text-ink",
  muted: "border-line bg-surface-muted text-ink",
  dark: "border-black bg-ink text-white",
};

const buttonToneClasses = {
  copper:
    "border-copper bg-copper text-white hover:bg-copper-soft hover:border-copper-soft",
  ink: "border-ink bg-ink text-white hover:bg-black",
  ghost: "border-line bg-transparent text-ink hover:border-copper hover:text-copper",
} as const;

type ButtonTone = keyof typeof buttonToneClasses;

const tagToneClasses = {
  default: "border-line bg-surface text-muted",
  copper: "border-copper/20 bg-copper/8 text-copper",
  dark: "border-black bg-ink text-white",
  alert: "border-alert/20 bg-alert/10 text-alert",
} as const;

type TagTone = keyof typeof tagToneClasses;

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.34em] text-copper",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Tag({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
}) {
      return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.24em]",
        tagToneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ActionLink({
  href,
  children,
  tone = "copper",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: ButtonTone;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] transition-colors",
        buttonToneClasses[tone],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Panel({
  children,
  className,
  tone = "surface",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <section
      className={cn(
        "hairline panel-shadow border p-5 sm:p-6",
        panelToneClasses[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rise-in border-b border-line/70 pb-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-start">
        <div className="space-y-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="max-w-4xl text-4xl font-semibold uppercase leading-[0.96] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[64px]">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
            {description}
          </p>
        </div>
        {aside ? <div className="xl:justify-self-end">{aside}</div> : null}
      </div>
    </section>
  );
}

export function MetricGrid({
  items,
  className,
  columns = 4,
}: {
  items: MetricItem[];
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  const columnClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 xl:grid-cols-3"
        : "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={cn("grid gap-px bg-line/70", columnClass, className)}>
      {items.map((item) => (
        <div key={item.label} className="bg-surface p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-muted">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-3 text-lg font-semibold uppercase tracking-[-0.04em] sm:text-xl",
              item.accent ? "text-copper" : "text-ink",
            )}
          >
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-2xl font-semibold uppercase tracking-[-0.04em] text-ink sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-7 text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

type TableRow = Record<string, ReactNode> & { id: string };

export function DataTable({
  columns,
  rows,
}: {
  columns: TableColumn[];
  rows: TableRow[];
}) {
  return (
    <div className="overflow-hidden border border-line">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "border-b border-line px-4 py-3 text-[10px] font-medium uppercase tracking-[0.28em] text-muted",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="bg-surface">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-b border-line px-4 py-4 text-sm text-ink",
                      column.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MarketplaceCard({ lot }: { lot: AuctionLot }) {
  return (
    <Panel className="flex h-full flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Tag tone="copper">{lot.lot}</Tag>
        <Tag>{lot.status}</Tag>
      </div>

      <AssetArtwork
        variant={lot.artwork}
        label={lot.category}
        className="h-56 sm:h-60"
      />

      <div className="space-y-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
            {lot.location}
          </p>
          <Link
            href={`/auctions/${lot.slug}`}
            className="mt-2 block text-xl font-semibold leading-tight tracking-[-0.04em] text-ink transition-colors hover:text-copper"
          >
            {lot.title}
          </Link>
        </div>
        <p className="text-sm leading-6 text-muted">{lot.description}</p>
      </div>

      <MetricGrid items={lot.marketMetrics} columns={2} />

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/70 pt-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
            Issuer
          </p>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-ink">
            {lot.issuer}
          </p>
        </div>
        <ActionLink href={`/auctions/${lot.slug}`}>Enter Auction</ActionLink>
      </div>
    </Panel>
  );
}
