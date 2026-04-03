"use client";

import { useConnect, useDisconnect, type UiWallet } from "@wallet-standard/react";
import { ActionButton, Tag } from "@/components/ui";
import { useValoremApp } from "@/components/providers/valorem-app-provider";

function WalletConnectAction({ wallet }: { wallet: UiWallet }) {
  const [isConnecting, connect] = useConnect(wallet);

  return (
    <ActionButton
      tone="ghost"
      disabled={isConnecting}
      onClick={() => {
        void connect();
      }}
      className="w-full justify-between"
    >
      <span>{wallet.name}</span>
      <span>{isConnecting ? "Connecting" : "Connect"}</span>
    </ActionButton>
  );
}

function WalletDisconnectAction({ wallet }: { wallet: UiWallet }) {
  const [isDisconnecting, disconnect] = useDisconnect(wallet);

  return (
    <ActionButton
      tone="ghost"
      disabled={isDisconnecting}
      onClick={() => {
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

export function WalletControl() {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Tag tone={walletMode === "wallet-standard" ? "dark" : "default"}>
          {walletMode === "wallet-standard" ? "Wallet" : "Disconnected"}
        </Tag>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
          {formatAddress(activeAddress)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Tag tone={authSession ? (sessionMatchesWallet ? "copper" : "default") : "default"}>
          {authSession ? "Authenticated" : "Session idle"}
        </Tag>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
          {authSession ? formatAddress(authSession.walletAddress) : "Sign-in required"}
        </p>
      </div>

      {connectedWallet ? (
        <WalletDisconnectAction wallet={connectedWallet} />
      ) : (
        <div className="space-y-2">
          {wallets.length > 0 ? (
            wallets.map((wallet) => (
              <WalletConnectAction key={wallet.name} wallet={wallet} />
            ))
          ) : (
            <div className="border border-line bg-surface p-4 text-sm leading-6 text-muted">
              No Wallet Standard wallets were detected in this browser.
            </div>
          )}
        </div>
      )}

      {authSession ? (
        <ActionButton
          tone="ink"
          onClick={() => {
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
  );
}
