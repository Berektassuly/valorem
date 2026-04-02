"use client";

import type { ReactNode } from "react";
import { ValoremAppProvider } from "@/components/providers/valorem-app-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <ValoremAppProvider>{children}</ValoremAppProvider>;
}
