"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useConnect, useDisconnect, type UiWallet } from "@wallet-standard/react";
import { ActionButton, Tag } from "@/components/ui";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import { cn } from "@/lib/utils";

function usePopoverDismiss(
  isOpen: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, isOpen, onDismiss]);
}

function WalletConnectAction({
  wallet,
  onSelect,
}: {
  wallet: UiWallet;
  onSelect?: () => void;
}) {
  const [isConnecting, connect] = useConnect(wallet);

  return (
    <ActionButton
      tone="ghost"
      disabled={isConnecting}
      onClick={() => {
        onSelect?.();
        void connect();
      }}
      className="w-full justify-between"
    >
      <span>{wallet.name}</span>
      <span>{isConnecting ? "Connecting" : "Connect"}</span>
    </ActionButton>
  );
}

function WalletDisconnectAction({
  wallet,
  onSelect,
}: {
  wallet: UiWallet;
  onSelect?: () => void;
}) {
  const [isDisconnecting, disconnect] = useDisconnect(wallet);

  return (
    <ActionButton
      tone="ghost"
      disabled={isDisconnecting}
      onClick={() => {
        onSelect?.();
        void disconnect();
      }}
      className="w-full justify-between"
    >
      <span>{wallet.name}</span>
      <span>{isDisconnecting ? "Disconnecting" : "Disconnect"}</span>
    </ActionButton>
  );
}

function formatAddress(value: string | null) {
  if (!value) {
    return "No wallet";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function StatusRow({
  tag,
  tone,
  value,
}: {
  tag: string;
  tone: "default" | "copper" | "dark";
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Tag tone={tone}>{tag}</Tag>
      <p className="max-w-[12rem] truncate text-right font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
        {value}
      </p>
    </div>
  );
}

export function WalletControl() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    activeAddress,
    authSession,
    authenticate,
    connectedWallet,
    feedback,
    isAuthenticating,
    signOut,
    walletMode,
    wallets,
  } = useValoremApp();

  const sessionMatchesWallet =
    authSession && activeAddress ? authSession.walletAddress === activeAddress : false;
  const hasAuthenticatedWallet = Boolean(connectedWallet && sessionMatchesWallet);
  const triggerLabel = activeAddress
    ? formatAddress(activeAddress)
    : connectedWallet
      ? connectedWallet.name
      : "Connect Wallet";

  usePopoverDismiss(isOpen, containerRef, () => {
    setIsOpen(false);
  });

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        className={cn(
          "inline-flex min-h-10 items-center gap-3 border bg-surface px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-ink transition-colors",
          isOpen || hasAuthenticatedWallet
            ? "border-copper/40"
            : "border-line hover:border-copper",
        )}
      >
        <span className="flex items-center gap-2">
          <span className="max-w-[11rem] truncate">{triggerLabel}</span>
          {hasAuthenticatedWallet ? (
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-copper" aria-hidden="true" />
              <span className="sr-only">Authenticated</span>
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "h-2.5 w-2.5 shrink-0 border-r border-b border-muted transition-transform",
            isOpen ? "-rotate-135" : "rotate-45",
          )}
        />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Wallet controls"
          className="hairline panel-shadow absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] border border-line bg-surface p-5"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-line/70 pb-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-copper">
                  Wallet Control
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
                  Solana session controls
                </p>
              </div>
              {hasAuthenticatedWallet ? <Tag tone="copper">Auth</Tag> : null}
            </div>

            <div className="space-y-3">
              <StatusRow
                tag={walletMode === "wallet-standard" ? "Wallet" : "Disconnected"}
                tone={walletMode === "wallet-standard" ? "dark" : "default"}
                value={formatAddress(activeAddress)}
              />
              <StatusRow
                tag={authSession ? "Authenticated" : "Session idle"}
                tone={authSession ? (sessionMatchesWallet ? "copper" : "default") : "default"}
                value={authSession ? formatAddress(authSession.walletAddress) : "Sign-in required"}
              />
            </div>

            {connectedWallet ? (
              <WalletDisconnectAction
                wallet={connectedWallet}
                onSelect={() => {
                  setIsOpen(false);
                }}
              />
            ) : (
              <div className="space-y-2">
                {wallets.length > 0 ? (
                  wallets.map((wallet) => (
                    <WalletConnectAction
                      key={wallet.name}
                      wallet={wallet}
                      onSelect={() => {
                        setIsOpen(false);
                      }}
                    />
                  ))
                ) : (
                  <div className="border border-line bg-surface-muted p-4 text-sm leading-6 text-muted">
                    No Wallet Standard wallets were detected in this browser.
                  </div>
                )}
              </div>
            )}

            {authSession ? (
              <ActionButton
                tone="ink"
                onClick={() => {
                  setIsOpen(false);
                  void signOut();
                }}
                className="w-full justify-between"
              >
                <span>Sign out</span>
                <span>Session</span>
              </ActionButton>
            ) : connectedWallet ? (
              <ActionButton
                onClick={() => {
                  setIsOpen(false);
                  void authenticate();
                }}
                disabled={isAuthenticating}
                className="w-full justify-between"
              >
                <span>{isAuthenticating ? "Signing in" : "Sign In With Solana"}</span>
                <span>Cookie auth</span>
              </ActionButton>
            ) : null}

            {feedback.message ? (
              <p
                className={`text-xs leading-6 ${
                  feedback.status === "error" ? "text-alert" : "text-muted"
                }`}
              >
                {feedback.message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
