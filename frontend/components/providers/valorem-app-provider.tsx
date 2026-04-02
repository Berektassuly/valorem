"use client";

import bs58 from "bs58";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getWalletFeature,
  useWallets,
  type UiWallet,
} from "@wallet-standard/react";
import {
  SolanaSignAndSendTransaction,
  SolanaSignTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import {
  ValoremProtocolClient,
  buildAdvanceToRevealInstruction,
  buildBidCommitment,
  buildClaimRefundInstruction,
  buildCloseRevealInstruction,
  buildRecordComplianceInstruction,
  buildRevealBidInstruction,
  buildSettleCandidateInstruction,
  buildSlashCandidateAndAdvanceInstruction,
  buildSlashUnrevealedInstruction,
  buildSubmitCommitmentInstruction,
  buildWithdrawProceedsInstruction,
  createRevealSecret,
  deriveBidderStatePda,
  deriveComplianceRecordPda,
} from "@valorem/sdk";
import { catalogAuctions } from "@/lib/catalog";
import {
  auctionProgramId,
  protocolChain,
  protocolCluster,
  protocolMode,
  protocolRpcUrl,
} from "@/lib/protocol/config";
import { DEMO_WALLET_ADDRESS, createInitialMockProtocolState } from "@/lib/protocol/mock-state";
import {
  advanceMockAuctionToReveal,
  claimMockRefund,
  closeMockReveal,
  getWalletAuctionState,
  recordMockCompliance,
  revealMockBid,
  settleMockCandidate,
  slashMockCandidateAndAdvance,
  slashMockUnrevealed,
  submitMockCommitment,
  withdrawMockProceeds,
} from "@/lib/protocol/mock-transitions";
import { loadRevealSecret, saveRevealSecret } from "@/lib/protocol/secrets";
import type {
  AuctionRuntimeState,
  ProtocolMode,
  TransactionFeedback,
  WalletAuctionState,
  WalletMode,
} from "@/lib/protocol/types";

type ValoremAppContextValue = {
  protocolMode: ProtocolMode;
  cluster: string;
  rpcUrl: string;
  walletMode: WalletMode;
  activeAddress: string | null;
  wallets: readonly UiWallet[];
  connectedWallet: UiWallet | null;
  auctions: AuctionRuntimeState[];
  feedback: TransactionFeedback;
  refresh: () => Promise<void>;
  enableDemoWallet: () => void;
  disableDemoWallet: () => void;
  getAuction: (slug: string) => AuctionRuntimeState | null;
  getWalletAuctionState: (slug: string) => WalletAuctionState;
  submitCommitment: (slug: string, bidAmount: bigint) => Promise<void>;
  revealBid: (slug: string) => Promise<void>;
  settleCandidate: (slug: string) => Promise<void>;
  claimRefund: (slug: string) => Promise<void>;
  advanceToReveal: (slug: string) => Promise<void>;
  closeReveal: (slug: string) => Promise<void>;
  recordCompliance: (slug: string, walletAddress: string, approved: boolean) => Promise<void>;
  slashCandidate: (slug: string, walletAddress: string) => Promise<void>;
  slashUnrevealed: (slug: string, walletAddress: string) => Promise<void>;
  withdrawProceeds: (slug: string, amount: bigint) => Promise<void>;
};

const ValoremAppContext = createContext<ValoremAppContextValue | null>(null);

function getPrimaryConnectedWallet(wallets: readonly UiWallet[]): UiWallet | null {
  return wallets.find((wallet) => wallet.accounts.length > 0) ?? null;
}

function getFirstEligibleCandidateState(state: AuctionRuntimeState): PublicKey {
  const candidate =
    state.auction.rankedBidders[state.auction.currentSettlementIndex] ??
    state.auction.rankedBidders[0];

  if (!candidate) {
    return SystemProgram.programId;
  }

  return deriveBidderStatePda(
    new PublicKey(state.auctionAddress),
    candidate.bidder,
  )[0];
}

function getNextEligibleCandidateState(state: AuctionRuntimeState): PublicKey {
  const currentIndex = state.auction.currentSettlementIndex;
  const nextCandidate = state.auction.rankedBidders.find(
    (bid, index) =>
      index > currentIndex &&
      !bid.disqualified &&
      !bid.settled &&
      bid.amount >= state.auction.reservePrice,
  );

  if (!nextCandidate) {
    return SystemProgram.programId;
  }

  return deriveBidderStatePda(
    new PublicKey(state.auctionAddress),
    nextCandidate.bidder,
  )[0];
}

async function sendWalletTransaction(params: {
  wallet: UiWallet;
  accountAddress: string;
  connection: Connection;
  instructions: TransactionInstruction[];
}) {
  const transaction = new Transaction();
  for (const instruction of params.instructions) {
    transaction.add(instruction);
  }
  transaction.feePayer = new PublicKey(params.accountAddress);
  const { blockhash, lastValidBlockHeight } = await params.connection.getLatestBlockhash(
    "confirmed",
  );
  transaction.recentBlockhash = blockhash;
  const account = params.wallet.accounts.find(
    (walletAccount) => walletAccount.address === params.accountAddress,
  );
  if (!account) {
    throw new Error("Connected wallet account is unavailable.");
  }

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  if (params.wallet.features.includes(SolanaSignAndSendTransaction)) {
    const feature = getWalletFeature(
      params.wallet,
      SolanaSignAndSendTransaction,
    ) as SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction];
    const [result] = await feature.signAndSendTransaction({
      account,
      chain: protocolChain,
      transaction: serialized,
      options: {
        commitment: "confirmed",
      },
    });

    return bs58.encode(result.signature);
  }

  if (params.wallet.features.includes(SolanaSignTransaction)) {
    const feature = getWalletFeature(
      params.wallet,
      SolanaSignTransaction,
    ) as SolanaSignTransactionFeature[typeof SolanaSignTransaction];
    const [result] = await feature.signTransaction({
      account,
      chain: protocolChain,
      transaction: serialized,
    });
    const signature = await params.connection.sendRawTransaction(result.signedTransaction, {
      preflightCommitment: "confirmed",
    });
    await params.connection.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature,
      },
      "confirmed",
    );
    return signature;
  }

  throw new Error("Connected wallet does not expose a compatible Solana signing feature.");
}

export function ValoremAppProvider({ children }: { children: ReactNode }) {
  const wallets = useWallets();
  const connectedWallet = useMemo(() => getPrimaryConnectedWallet(wallets), [wallets]);
  const connectedAddress = connectedWallet?.accounts[0]?.address ?? null;
  const [demoWalletEnabled, setDemoWalletEnabled] = useState(false);
  const [mockState, setMockState] = useState<Record<string, AuctionRuntimeState>>(
    createInitialMockProtocolState,
  );
  const [rpcState, setRpcState] = useState<Record<string, AuctionRuntimeState>>({});
  const [feedback, setFeedback] = useState<TransactionFeedback>({ status: "idle" });

  const walletMode: WalletMode = demoWalletEnabled
    ? "demo"
    : connectedAddress
      ? "wallet-standard"
      : "disconnected";
  const activeAddress = walletMode === "demo" ? DEMO_WALLET_ADDRESS : connectedAddress;
  const connection = useMemo(() => new Connection(protocolRpcUrl, "confirmed"), []);
  const protocolClient = useMemo(() => new ValoremProtocolClient(connection, "confirmed"), [connection]);

  const refresh = useCallback(async () => {
    if (protocolMode !== "rpc") {
      return;
    }

    const nextRpcState: Record<string, AuctionRuntimeState> = {};
    for (const catalog of catalogAuctions) {
      const fallback = mockState[catalog.slug];
      try {
        const snapshot = await protocolClient.fetchAuctionSnapshot(
          new PublicKey(catalog.protocol.auctionAddress),
          activeAddress ? new PublicKey(activeAddress) : undefined,
        );
        if (!snapshot) {
          nextRpcState[catalog.slug] = fallback;
          continue;
        }

        nextRpcState[catalog.slug] = {
          ...fallback,
          auctionAddress: catalog.protocol.auctionAddress,
          auction: snapshot.auction,
          bidderStates:
            snapshot.bidderState && activeAddress
              ? { [activeAddress]: snapshot.bidderState }
              : {},
          complianceRecords:
            snapshot.complianceRecord && activeAddress
              ? { [activeAddress]: snapshot.complianceRecord }
              : {},
        };
      } catch {
        nextRpcState[catalog.slug] = fallback;
      }
    }

    startTransition(() => {
      setRpcState(nextRpcState);
    });
  }, [activeAddress, mockState, protocolClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const auctions = useMemo(() => {
    const source = protocolMode === "rpc" ? rpcState : mockState;
    return catalogAuctions.map((catalog) => source[catalog.slug] ?? mockState[catalog.slug]);
  }, [mockState, rpcState]);

  const getAuction = useCallback(
    (slug: string) => auctions.find((auction) => auction.catalog.slug === slug) ?? null,
    [auctions],
  );

  const getWalletStateForSlug = useCallback(
    (slug: string) => {
      const auction = getAuction(slug);
      if (!auction) {
        return {
          bidderState: null,
          complianceRecord: null,
          actions: ["connect"],
          isLeadingCandidate: false,
          isRefundEligible: false,
          currentBid: null,
        } satisfies WalletAuctionState;
      }

      return getWalletAuctionState(auction, activeAddress);
    },
    [activeAddress, getAuction],
  );

  const updateMockAuction = useCallback((slug: string, next: AuctionRuntimeState) => {
    setMockState((current) => ({
      ...current,
      [slug]: next,
    }));
  }, []);

  const runAction = useCallback(
    async (message: string, handler: () => Promise<string | void>) => {
      try {
        const signature = await handler();
        setFeedback({
          status: "success",
          message,
          signature: signature ?? undefined,
        });
      } catch (error) {
        setFeedback({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown protocol error.",
        });
      }
    },
    [],
  );

  const sendOrSimulate = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (walletMode === "demo") {
        return `demo-${Date.now().toString(36)}`;
      }

      if (!connectedWallet || !activeAddress) {
        throw new Error("Connect a wallet or enable the demo wallet first.");
      }

      return sendWalletTransaction({
        wallet: connectedWallet,
        accountAddress: activeAddress,
        connection,
        instructions,
      });
    },
    [activeAddress, connectedWallet, connection, walletMode],
  );

  const submitCommitment = useCallback(
    async (slug: string, bidAmount: bigint) =>
      runAction(`Commitment submitted for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet or enable the demo wallet to bid.");
        }

        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        const revealSecret = createRevealSecret(bidAmount);
        const commitment = buildBidCommitment({
          auction: auction.auctionAddress,
          bidder: activeAddress,
          bidAmount,
          salt: revealSecret.salt,
        });

        saveRevealSecret({
          cluster: protocolCluster,
          programId: auctionProgramId,
          auctionAddress: auction.auctionAddress,
          walletAddress: activeAddress,
          bidAmount: bidAmount.toString(),
          salt: revealSecret.salt,
          createdAt: Date.now(),
        });

        if (protocolMode === "mock") {
          updateMockAuction(
            slug,
            submitMockCommitment({
              state: auction,
              walletAddress: activeAddress,
              commitment,
              committedAt: BigInt(Math.floor(Date.now() / 1000)),
            }),
          );
          return;
        }

        return sendOrSimulate([
          buildSubmitCommitmentInstruction({
            bidder: new PublicKey(activeAddress),
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            commitment,
            paymentVault: auction.auction.paymentVault,
            bidderPaymentAccount: getAssociatedTokenAddressSync(
              auction.auction.paymentMint,
              new PublicKey(activeAddress),
              false,
              TOKEN_2022_PROGRAM_ID,
            ),
          }),
        ]);
      }),
    [activeAddress, getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const revealBid = useCallback(
    async (slug: string) =>
      runAction(`Bid revealed for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet or enable the demo wallet first.");
        }

        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        const secret = loadRevealSecret({
          cluster: protocolCluster,
          programId: auctionProgramId,
          auctionAddress: auction.auctionAddress,
          walletAddress: activeAddress,
        });
        if (!secret) {
          throw new Error("No locally stored reveal secret for this auction.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(
            slug,
            revealMockBid({
              state: auction,
              walletAddress: activeAddress,
              bidAmount: secret.bidAmount,
              salt: secret.salt,
              revealedAt: BigInt(Math.floor(Date.now() / 1000)),
            }),
          );
          return;
        }

        return sendOrSimulate([
          buildRevealBidInstruction({
            bidder: new PublicKey(activeAddress),
            auction: new PublicKey(auction.auctionAddress),
            bidAmount: secret.bidAmount,
            salt: secret.salt,
          }),
        ]);
      }),
    [activeAddress, getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const settleCandidate = useCallback(
    async (slug: string) =>
      runAction(`Settlement completed for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet or enable the demo wallet first.");
        }

        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(slug, settleMockCandidate(auction, activeAddress));
          return;
        }

        return sendOrSimulate([
          buildSettleCandidateInstruction({
            bidder: new PublicKey(activeAddress),
            assetMint: auction.auction.assetMint,
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            paymentVault: auction.auction.paymentVault,
            bidderPaymentAccount: getAssociatedTokenAddressSync(
              auction.auction.paymentMint,
              new PublicKey(activeAddress),
              false,
              TOKEN_2022_PROGRAM_ID,
            ),
            assetVault: auction.auction.assetVault,
          }),
        ]);
      }),
    [activeAddress, getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const claimRefund = useCallback(
    async (slug: string) =>
      runAction(`Refund claimed for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet or enable the demo wallet first.");
        }

        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(slug, claimMockRefund(auction, activeAddress));
          return;
        }

        return sendOrSimulate([
          buildClaimRefundInstruction({
            bidder: new PublicKey(activeAddress),
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            paymentVault: auction.auction.paymentVault,
            bidderPaymentAccount: getAssociatedTokenAddressSync(
              auction.auction.paymentMint,
              new PublicKey(activeAddress),
              false,
              TOKEN_2022_PROGRAM_ID,
            ),
          }),
        ]);
      }),
    [activeAddress, getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const advanceToReveal = useCallback(
    async (slug: string) =>
      runAction(`Auction advanced to reveal for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(slug, advanceMockAuctionToReveal(auction));
          return;
        }

        return sendOrSimulate([
          buildAdvanceToRevealInstruction({
            admin: auction.auction.issuer,
            auction: new PublicKey(auction.auctionAddress),
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const closeReveal = useCallback(
    async (slug: string) =>
      runAction(`Reveal closed for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(
            slug,
            closeMockReveal(auction, BigInt(Math.floor(Date.now() / 1000))),
          );
          return;
        }

        return sendOrSimulate([
          buildCloseRevealInstruction({
            admin: auction.auction.issuer,
            auction: new PublicKey(auction.auctionAddress),
            currentCandidateState: getFirstEligibleCandidateState(auction),
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const recordCompliance = useCallback(
    async (slug: string, walletAddress: string, approved: boolean) =>
      runAction(`Compliance ${approved ? "approved" : "rejected"} for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        await fetch("/api/compliance/cases/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auctionSlug: slug,
            auctionAddress: auction.auctionAddress,
            bidderAddress: walletAddress,
            reviewerAddress: auction.catalog.protocol.reviewer,
            status: approved ? "approved" : "rejected",
            note: approved ? "Eligibility confirmed." : "Eligibility rejected.",
          }),
        });

        if (protocolMode === "mock") {
          updateMockAuction(
            slug,
            recordMockCompliance({
              state: auction,
              walletAddress,
              approved,
              reviewedAt: BigInt(Math.floor(Date.now() / 1000)),
              expiresAt: BigInt(Math.floor(Date.now() / 1000) + 24 * 3600),
            }),
          );
          return;
        }

        return sendOrSimulate([
          buildRecordComplianceInstruction({
            reviewer: auction.auction.reviewerAuthority,
            bidder: new PublicKey(walletAddress),
            auction: new PublicKey(auction.auctionAddress),
            status: approved ? "approved" : "rejected",
            attestationDigest: new Uint8Array(32).fill(approved ? 9 : 1),
            expiresAt: BigInt(Math.floor(Date.now() / 1000) + 24 * 3600),
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const slashCandidate = useCallback(
    async (slug: string, walletAddress: string) =>
      runAction(`Settlement candidate slashed for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(
            slug,
            slashMockCandidateAndAdvance(
              auction,
              walletAddress,
              BigInt(Math.floor(Date.now() / 1000)),
            ),
          );
          return;
        }

        return sendOrSimulate([
          buildSlashCandidateAndAdvanceInstruction({
            admin: auction.auction.issuer,
            auction: new PublicKey(auction.auctionAddress),
            currentBidderState: deriveBidderStatePda(
              new PublicKey(auction.auctionAddress),
              new PublicKey(walletAddress),
            )[0],
            complianceRecord: deriveComplianceRecordPda(
              new PublicKey(auction.auctionAddress),
              new PublicKey(walletAddress),
            )[0],
            nextCandidateState: getNextEligibleCandidateState(auction),
            reason: "rejectedCompliance",
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const slashUnrevealed = useCallback(
    async (slug: string, walletAddress: string) =>
      runAction(`Unrevealed bidder slashed for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(slug, slashMockUnrevealed(auction, walletAddress));
          return;
        }

        return sendOrSimulate([
          buildSlashUnrevealedInstruction({
            admin: auction.auction.issuer,
            auction: new PublicKey(auction.auctionAddress),
            bidderState: deriveBidderStatePda(
              new PublicKey(auction.auctionAddress),
              new PublicKey(walletAddress),
            )[0],
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const withdrawProceeds = useCallback(
    async (slug: string, amount: bigint) =>
      runAction(`Proceeds withdrawn for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        if (protocolMode === "mock") {
          updateMockAuction(slug, withdrawMockProceeds(auction, amount));
          return;
        }

        return sendOrSimulate([
          buildWithdrawProceedsInstruction({
            issuer: auction.auction.issuer,
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            paymentVault: auction.auction.paymentVault,
            issuerPaymentDestination: auction.auction.issuerPaymentDestination,
            amount,
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate, updateMockAuction],
  );

  const value = useMemo<ValoremAppContextValue>(
    () => ({
      protocolMode,
      cluster: protocolCluster,
      rpcUrl: protocolRpcUrl,
      walletMode,
      activeAddress,
      wallets,
      connectedWallet,
      auctions,
      feedback,
      refresh,
      enableDemoWallet: () => setDemoWalletEnabled(true),
      disableDemoWallet: () => setDemoWalletEnabled(false),
      getAuction,
      getWalletAuctionState: getWalletStateForSlug,
      submitCommitment,
      revealBid,
      settleCandidate,
      claimRefund,
      advanceToReveal,
      closeReveal,
      recordCompliance,
      slashCandidate,
      slashUnrevealed,
      withdrawProceeds,
    }),
    [
      activeAddress,
      advanceToReveal,
      auctions,
      claimRefund,
      closeReveal,
      connectedWallet,
      feedback,
      getAuction,
      getWalletStateForSlug,
      recordCompliance,
      refresh,
      revealBid,
      settleCandidate,
      slashCandidate,
      slashUnrevealed,
      submitCommitment,
      wallets,
      walletMode,
      withdrawProceeds,
    ],
  );

  return <ValoremAppContext.Provider value={value}>{children}</ValoremAppContext.Provider>;
}

export function useValoremApp() {
  const context = useContext(ValoremAppContext);
  if (!context) {
    throw new Error("useValoremApp must be used inside ValoremAppProvider.");
  }

  return context;
}
