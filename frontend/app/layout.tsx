import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Valorem",
    template: "%s | Valorem",
  },
  description:
    "Valorem is a premium auction terminal for high-value real-world asset offerings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${ibmPlexMono.variable} h-full scroll-smooth`}
    >
      <body className="min-h-full bg-paper text-ink antialiased">
        <div className="relative isolate min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(164,87,38,0.08),transparent_54%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.52),rgba(255,255,255,0.52)),linear-gradient(90deg,rgba(19,17,15,0.04)_1px,transparent_1px),linear-gradient(rgba(19,17,15,0.04)_1px,transparent_1px)] bg-[length:100%_100%,96px_96px,96px_96px] [mask-image:linear-gradient(to_bottom,white,rgba(255,255,255,0.15))]" />
          <SiteHeader />
          <main className="relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pb-20 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="relative border-t border-line/70 bg-paper/70">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-5 text-[10px] uppercase tracking-[0.34em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <span>Valorem / Institutional mock environment</span>
              <span>Design implementation only. No live market connectivity.</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
