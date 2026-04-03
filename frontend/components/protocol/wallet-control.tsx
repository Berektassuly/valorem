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
    disableDemoWallet,
    enableDemoWallet,
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
        <Tag tone={walletMode === "wallet-standard" ? "dark" : walletMode === "demo" ? "copper" : "default"}>
          {walletMode === "wallet-standard"
            ? "Wallet"
            : walletMode === "demo"
              ? "Demo wallet"
              : "Disconnected"}
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

      {walletMode === "demo" ? (
        <ActionButton tone="ghost" onClick={disableDemoWallet} className="w-full justify-between">
          <span>Disable demo wallet</span>
          <span>Close</span>
        </ActionButton>
      ) : connectedWallet ? (
        <WalletDisconnectAction wallet={connectedWallet} />
      ) : (
        <div className="space-y-2">
          {wallets.map((wallet) => (
            <WalletConnectAction key={wallet.name} wallet={wallet} />
          ))}
          <ActionButton tone="ink" onClick={enableDemoWallet} className="w-full justify-between">
            <span>Use demo wallet</span>
            <span>Instant</span>
          </ActionButton>
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
      ) : connectedWallet && walletMode !== "demo" ? (
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
