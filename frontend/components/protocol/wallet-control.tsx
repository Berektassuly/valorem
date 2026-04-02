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

export function WalletControl() {
  const {
    activeAddress,
    connectedWallet,
    disableDemoWallet,
    enableDemoWallet,
    feedback,
    walletMode,
    wallets,
  } = useValoremApp();

  const addressLabel = activeAddress
    ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}`
    : "No wallet";

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
          {addressLabel}
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
