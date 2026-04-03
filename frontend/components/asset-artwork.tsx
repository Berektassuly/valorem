import { cn } from "@/lib/utils";
import type { ArtworkVariant } from "@/lib/site-data";

const backgrounds: Record<ArtworkVariant, string> = {
  mist: "bg-[radial-gradient(circle_at_24%_28%,rgba(255,255,255,0.24),transparent_20%),radial-gradient(circle_at_71%_20%,rgba(255,255,255,0.15),transparent_18%),radial-gradient(circle_at_52%_54%,rgba(255,255,255,0.13),transparent_26%),linear-gradient(150deg,#070707,#373737)]",
  portrait:
    "bg-[linear-gradient(160deg,#050505,#242424_65%,#3b3b3b)]",
  orbital:
    "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_14%),radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_36%),linear-gradient(135deg,#060606,#1d1d1d_62%,#383838)]",
  tower:
    "bg-[linear-gradient(180deg,#1f1f1f,#2d2d2d_44%,#101010),linear-gradient(90deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_48px)]",
  textile:
    "bg-[linear-gradient(180deg,#090909,#1b1b1b_38%,#363636_100%)]",
  schema:
    "bg-[linear-gradient(135deg,#050505,#212121_62%,#3a3a3a)]",
  statue:
    "bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.2),transparent_16%),linear-gradient(180deg,#050505,#1a1a1a_54%,#303030_100%)]",
  bear: "bg-[linear-gradient(180deg,#080808,#1d1d1d_58%,#333333_100%)]",
};

export function AssetArtwork({
  variant,
  label,
  imageSrc,
  imageAlt,
  className,
}: {
  variant: ArtworkVariant;
  label?: string;
  imageSrc?: string | null;
  imageAlt?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden border border-black/10 bg-black",
        backgrounds[variant],
        className,
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt ?? label ?? "Auction lot image"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),transparent_24%,transparent_72%,rgba(255,255,255,0.04))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:18px_18px] opacity-20" />

      {!imageSrc && variant === "portrait" ? (
        <>
          <div className="absolute left-1/2 top-[18%] h-[42%] w-[28%] -translate-x-1/2 rounded-full bg-white/16 blur-[2px]" />
          <div className="absolute left-1/2 top-[48%] h-[44%] w-[44%] -translate-x-1/2 rounded-t-[48%] rounded-b-[18%] bg-white/11" />
          <div className="absolute left-[30%] top-[55%] h-[24%] w-[8%] rounded-full bg-black/25 blur-md" />
          <div className="absolute right-[30%] top-[55%] h-[24%] w-[8%] rounded-full bg-black/25 blur-md" />
        </>
      ) : null}

      {!imageSrc && variant === "orbital" ? (
        <>
          <div className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/18" />
          <div className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
          <div className="absolute left-1/2 top-1/2 h-[12%] w-[12%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/28 blur-[1px]" />
        </>
      ) : null}

      {!imageSrc && variant === "tower" ? (
        <>
          <div className="absolute left-[12%] bottom-0 h-[72%] w-[18%] border-x border-white/12 bg-white/6" />
          <div className="absolute left-[28%] bottom-0 h-[88%] w-[30%] border-x border-white/12 bg-white/8" />
          <div className="absolute left-[54%] bottom-0 h-[76%] w-[22%] border-x border-white/12 bg-white/6" />
          <div className="absolute inset-x-0 bottom-[24%] h-px bg-white/16" />
        </>
      ) : null}

      {!imageSrc && variant === "textile" ? (
        <>
          <div className="absolute left-1/2 top-[16%] h-[28%] w-[16%] -translate-x-1/2 rounded-full border border-white/14 bg-white/6" />
          <div className="absolute left-1/2 top-[28%] h-[66%] w-[46%] -translate-x-1/2 rounded-t-[24%] bg-white/11" />
          <div className="absolute left-[30%] top-[32%] h-[58%] w-[10%] bg-white/7" />
          <div className="absolute right-[30%] top-[32%] h-[58%] w-[10%] bg-white/7" />
        </>
      ) : null}

      {!imageSrc && variant === "schema" ? (
        <>
          <div className="absolute left-[12%] top-[14%] h-[64%] w-[68%] rotate-6 border border-white/18 bg-white/7" />
          <div className="absolute right-[14%] bottom-[18%] h-[18%] w-[18%] rotate-6 border border-white/18 bg-black/35" />
          <div className="absolute inset-x-[14%] top-[44%] h-px bg-white/16" />
        </>
      ) : null}

      {!imageSrc && variant === "statue" ? (
        <>
          <div className="absolute left-1/2 top-[24%] h-[18%] w-[16%] -translate-x-1/2 rounded-full bg-white/16" />
          <div className="absolute left-1/2 top-[40%] h-[30%] w-[20%] -translate-x-1/2 rounded-[36%] bg-white/12" />
          <div className="absolute left-1/2 bottom-[12%] h-[12%] w-[28%] -translate-x-1/2 border-t border-white/14 bg-white/6" />
        </>
      ) : null}

      {!imageSrc && variant === "bear" ? (
        <>
          <div className="absolute left-1/2 top-[18%] h-[54%] w-[44%] -translate-x-1/2 rounded-[36%] bg-white/12" />
          <div className="absolute left-[30%] top-[22%] h-[18%] w-[16%] rounded-full bg-white/12" />
          <div className="absolute right-[30%] top-[22%] h-[18%] w-[16%] rounded-full bg-white/12" />
          <div className="absolute left-1/2 bottom-[16%] h-[16%] w-[32%] -translate-x-1/2 rounded-full bg-white/7" />
        </>
      ) : null}

      {label ? (
        <span className="absolute left-3 top-3 border border-white/15 bg-black/45 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.28em] text-white/85">
          {label}
        </span>
      ) : null}
    </div>
  );
}
