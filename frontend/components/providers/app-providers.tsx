"use client";

import type { ReactNode } from "react";
import type { AuthSession } from "@/lib/marketplace/types";
import { ValoremAppProvider } from "@/components/providers/valorem-app-provider";

export function AppProviders({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: AuthSession | null;
}) {
  return (
    <ValoremAppProvider initialSession={initialSession}>
      {children}
    </ValoremAppProvider>
  );
}
