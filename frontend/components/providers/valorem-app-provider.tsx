"use client";

import bs58 from "bs58";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  SolanaSignMessage,
  SolanaSignTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignMessageFeature,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  BIDDER_STATE_ACCOUNT_NAME,
  COMPLIANCE_RECORD_ACCOUNT_NAME,
  ValoremProtocolClient,
  anchorAccountDiscriminator,
  buildAdvanceToRevealInstruction,
  buildBidCommitment,
  buildClaimRefundInstruction,
  buildCloseRevealInstruction,
  decodeBidderStateAccount,
  decodeComplianceRecordAccount,
  buildDepositAssetInstruction,
  buildInitializeAuctionInstruction,
  buildRecordComplianceInstruction,
  buildRevealBidInstruction,
  buildSettleCandidateInstruction,
  buildSlashCandidateAndAdvanceInstruction,
  buildSlashUnrevealedInstruction,
  buildSubmitCommitmentInstruction,
  buildWithdrawProceedsInstruction,
  createRevealSecret,
  deriveAuctionVaultAddress,
  deriveBidderStatePda,
  deriveComplianceRecordPda,
  type BidderStateAccount,
  type ComplianceRecordAccount,
} from "@valorem/sdk";
import { catalogAuctions, type CatalogAuctionEntry } from "@/lib/catalog";
import type { AuctionLot, AuthSession } from "@/lib/marketplace/types";
import {
  auctionProgramId,
  protocolChain,
  protocolCluster,
  protocolMode,
  protocolRpcUrl,
} from "@/lib/protocol/config";
import {
  resolveAssociatedTokenAccount,
  resolveAuctionInitializationAccounts,
  resolveMintAccountMetadata,
} from "@/lib/protocol/auction-init";
import { buildPerLotAssetMintInstructions } from "@/lib/protocol/mint-factory";
import { getWalletAuctionState } from "@/lib/protocol/runtime-state";
import { loadRevealSecret, saveRevealSecret } from "@/lib/protocol/secrets";
import type {
  AuctionLoadState,
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
  authSession: AuthSession | null;
  isAuthenticating: boolean;
  activeAddress: string | null;
  wallets: readonly UiWallet[];
  connectedWallet: UiWallet | null;
  auctions: AuctionRuntimeState[];
  feedback: TransactionFeedback;
  refresh: () => Promise<void>;
  authenticate: () => Promise<void>;
  signOut: () => Promise<void>;
  getAuction: (slug: string) => AuctionRuntimeState | null;
  getAuctionLoadState: (slug: string) => AuctionLoadState;
  getWalletAuctionState: (slug: string) => WalletAuctionState;
  syncAuctionLot: (lot: AuctionLot) => Promise<void>;
  validateAuctionInitialization: (
    params: InitializeAuctionParams,
  ) => Promise<void>;
  initializeAuction: (
    params: InitializeAuctionParams,
  ) => Promise<{ signature: string; contractAddress: string }>;
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

type InitializeAuctionParams = {
  reviewerAddress: string;
  /** Optional. When omitted a fresh per-lot Token-2022 mint is created. */
  assetMintAddress?: string;
  paymentMintAddress: string;
  auctionSeed: Uint8Array;
  depositAmount: bigint;
  reservePrice: bigint;
  assetAmount: bigint;
  biddingWindowSeconds: number;
  revealWindowSeconds: number;
  settlementWindowSeconds: number;
  maxBidders: number;
};

type AuctionSnapshot = NonNullable<
  Awaited<ReturnType<ValoremProtocolClient["fetchAuctionSnapshot"]>>
>;

type LinkedAuctionLot = AuctionLot & {
  contractAddress: string;
};

type CatalogAuctionSource = {
  kind: "catalog";
  slug: string;
  auctionAddress: string;
  catalog: CatalogAuctionEntry;
};

type MarketplaceAuctionSource = {
  kind: "marketplace";
  slug: string;
  auctionAddress: string;
  lot: LinkedAuctionLot;
};

type AuctionRuntimeSource = CatalogAuctionSource | MarketplaceAuctionSource;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function getTransactionLogs(error: unknown): string[] | undefined {
  if (error instanceof SendTransactionError) {
    return error.logs;
  }

  if (!isRecord(error)) {
    return undefined;
  }

  if (isStringArray(error.logs)) {
    return error.logs;
  }

  if (isRecord(error.transactionError) && isStringArray(error.transactionError.logs)) {
    return error.transactionError.logs;
  }

  return undefined;
}

function getTransactionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof SendTransactionError) {
    return error.transactionError.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (isRecord(error) && typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function summarizeTransactionLogs(logs: string[]) {
  const normalizedLogs = logs.map((line) => line.trim()).filter(Boolean);
  if (normalizedLogs.length === 0) {
    return "";
  }

  const relevantLines = normalizedLogs.filter((line) =>
    /custom program error|Program log:|failed:|error:|panicked/i.test(line),
  );
  const summaryLines = (relevantLines.length > 0 ? relevantLines : normalizedLogs).slice(-3);
  return Array.from(new Set(summaryLines)).join("\n");
}

async function formatWalletTransactionError(
  error: unknown,
  connection: Connection,
  fallback: string,
) {
  const baseMessage = getTransactionErrorMessage(error, fallback);
  let logs = getTransactionLogs(error);

  if ((!logs || logs.length === 0) && error instanceof SendTransactionError) {
    try {
      logs = await error.getLogs(connection);
    } catch {
      logs = undefined;
    }
  }

  const logSummary = logs ? summarizeTransactionLogs(logs) : "";
  if (logSummary && !baseMessage.includes(logSummary)) {
    return `${baseMessage}\n${logSummary}`;
  }

  return baseMessage;
}

async function sendWalletTransaction(params: {
  wallet: UiWallet;
  accountAddress: string;
  connection: Connection;
  instructions: TransactionInstruction[];
  /** Keypairs that must sign in addition to the wallet (e.g. new mint accounts). */
  partialSigners?: Keypair[];
}) {
  const transaction = new Transaction().add(...params.instructions);
  transaction.feePayer = new PublicKey(params.accountAddress);

  // Simulation cannot include non-wallet signers, so skip when partial signers
  // are present. The wallet or RPC will still run preflight checks.
  if (!params.partialSigners || params.partialSigners.length === 0) {
    const simulation = await params.connection.simulateTransaction(transaction);
    if (simulation.value.err) {
      const simulationError =
        typeof simulation.value.err === "string"
          ? simulation.value.err
          : JSON.stringify(simulation.value.err);
      const logSummary = simulation.value.logs
        ? summarizeTransactionLogs(simulation.value.logs)
        : "";

      throw new Error(
        logSummary
          ? `Transaction simulation failed before wallet confirmation.\n${logSummary}`
          : `Transaction simulation failed before wallet confirmation.\n${simulationError}`,
      );
    }
  }

  const { blockhash, lastValidBlockHeight } = await params.connection.getLatestBlockhash(
    "confirmed",
  );
  transaction.recentBlockhash = blockhash;

  // Partially sign with any extra keypairs (e.g. a freshly generated mint).
  if (params.partialSigners && params.partialSigners.length > 0) {
    transaction.partialSign(...params.partialSigners);
  }

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
        preflightCommitment: "confirmed",
      },
    });
    const signature = bs58.encode(result.signature);
    const confirmation = await params.connection.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature,
      },
      "confirmed",
    );
    if (confirmation.value.err) {
      throw new Error(
        `Transaction ${signature} failed to confirm: ${JSON.stringify(confirmation.value.err)}`,
      );
    }
    return signature;
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
    const confirmation = await params.connection.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature,
      },
      "confirmed",
    );
    if (confirmation.value.err) {
      throw new Error(
        `Transaction ${signature} failed to confirm: ${JSON.stringify(confirmation.value.err)}`,
      );
    }
    return signature;
  }

  throw new Error("Connected wallet does not expose a compatible Solana signing feature.");
}

function getWalletAccount(wallet: UiWallet, accountAddress: string) {
  const account = wallet.accounts.find(
    (walletAccount) => walletAccount.address === accountAddress,
  );
  if (!account) {
    throw new Error("Connected wallet account is unavailable.");
  }

  return account;
}

async function fetchBidderStatesForAuction(params: {
  connection: Connection;
  programId: PublicKey;
  auctionAddress: PublicKey;
}) {
  const accounts = await params.connection.getProgramAccounts(params.programId, {
    commitment: "confirmed",
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(anchorAccountDiscriminator(BIDDER_STATE_ACCOUNT_NAME)),
        },
      },
      {
        memcmp: {
          offset: 8,
          bytes: params.auctionAddress.toBase58(),
        },
      },
    ],
  });

  const bidderStates: Record<string, BidderStateAccount> = {};
  for (const { account } of accounts) {
    const bidderState = decodeBidderStateAccount(account.data);
    bidderStates[bidderState.bidder.toBase58()] = bidderState;
  }

  return bidderStates;
}

async function fetchComplianceRecordsForAuction(params: {
  connection: Connection;
  programId: PublicKey;
  auctionAddress: PublicKey;
}) {
  const accounts = await params.connection.getProgramAccounts(params.programId, {
    commitment: "confirmed",
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(anchorAccountDiscriminator(COMPLIANCE_RECORD_ACCOUNT_NAME)),
        },
      },
      {
        memcmp: {
          offset: 8,
          bytes: params.auctionAddress.toBase58(),
        },
      },
    ],
  });

  const complianceRecords: Record<string, ComplianceRecordAccount> = {};
  for (const { account } of accounts) {
    const complianceRecord = decodeComplianceRecordAccount(account.data);
    complianceRecords[complianceRecord.bidder.toBase58()] = complianceRecord;
  }

  return complianceRecords;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

function formatCompactAddress(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isLinkedAuctionLot(lot: AuctionLot): lot is LinkedAuctionLot {
  return typeof lot.contractAddress === "string" && lot.contractAddress.length > 0;
}

function buildMarketplaceAuctionCatalog(
  lot: LinkedAuctionLot,
  snapshot: AuctionSnapshot,
): CatalogAuctionEntry {
  return {
    slug: lot.slug,
    lot: `Lot ${lot.id.slice(0, 8).toUpperCase()}`,
    title: lot.title,
    category: "Dynamic marketplace",
    location: "PostgreSQL-backed lot",
    issuerName: formatCompactAddress(lot.issuerWallet),
    description: lot.description,
    artwork: "schema",
    protocol: {
      issuer: snapshot.auction.issuer.toBase58(),
      reviewer: snapshot.auction.reviewerAuthority.toBase58(),
      assetMint: snapshot.auction.assetMint.toBase58(),
      paymentMint: snapshot.auction.paymentMint.toBase58(),
      issuerPaymentDestination: snapshot.auction.issuerPaymentDestination.toBase58(),
      auctionSeedHex: bytesToHex(snapshot.auction.auctionSeed),
      auctionAddress: lot.contractAddress,
    },
    editorial: {
      eyebrow: `Auction dossier / ${lot.id.slice(0, 8)}`,
      summary: lot.description,
      heroLabel: "Stored asset",
      issuerNote:
        "This database-backed lot is hydrated from its linked on-chain contract so participation controls stay aligned with live protocol state.",
      secondaryTitle: "Live participation state",
      secondarySummary:
        "Wallet actions on this lot are derived from the current phase, bidder record, and settlement eligibility.",
      secondaryArtwork: "schema",
      diligence: [
        "The lot record remains sourced from PostgreSQL for marketplace and profile visibility.",
        "The participation rail reads phase and bidder state directly from the linked Solana auction.",
        "Reveal secrets remain local to the connected browser and are never read from the database.",
      ],
    },
  };
}

function buildRuntimeStateFromSource(params: {
  source: AuctionRuntimeSource;
  snapshot: AuctionSnapshot;
  bidderStates: Record<string, BidderStateAccount>;
  complianceRecords: Record<string, ComplianceRecordAccount>;
}): AuctionRuntimeState {
  const catalog =
    params.source.kind === "catalog"
      ? params.source.catalog
      : buildMarketplaceAuctionCatalog(params.source.lot, params.snapshot);

  return {
    catalog,
    auctionAddress: params.source.auctionAddress,
    auction: params.snapshot.auction,
    bidderStates: params.bidderStates,
    complianceRecords: params.complianceRecords,
    minIncrement: 0n,
    paymentSymbol: "USDC",
    assetSymbol: "RWA",
  };
}

async function signWalletMessage(params: {
  wallet: UiWallet;
  accountAddress: string;
  message: Uint8Array;
}) {
  if (!params.wallet.features.includes(SolanaSignMessage)) {
    throw new Error("Connected wallet does not support message signing.");
  }

  const feature = getWalletFeature(
    params.wallet,
    SolanaSignMessage,
  ) as SolanaSignMessageFeature[typeof SolanaSignMessage];
  const [result] = await feature.signMessage({
    account: getWalletAccount(params.wallet, params.accountAddress),
    message: params.message,
  });

  return result;
}

export function ValoremAppProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode;
  initialSession?: AuthSession | null;
}) {
  const wallets = useWallets();
  const connectedWallet = useMemo(() => getPrimaryConnectedWallet(wallets), [wallets]);
  const connectedAddress = connectedWallet?.accounts[0]?.address ?? null;
  const [authSession, setAuthSession] = useState<AuthSession | null>(initialSession);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [rpcState, setRpcState] = useState<Record<string, AuctionRuntimeState>>({});
  const [auctionLoadState, setAuctionLoadState] = useState<Record<string, AuctionLoadState>>({});
  const [feedback, setFeedback] = useState<TransactionFeedback>({ status: "idle" });
  const trackedAuctionLotsRef = useRef<Record<string, LinkedAuctionLot>>({});

  const walletMode: WalletMode = connectedAddress ? "wallet-standard" : "disconnected";
  const activeAddress = connectedAddress;
  const connection = useMemo(() => new Connection(protocolRpcUrl, "confirmed"), []);
  const auctionProgramPublicKey = useMemo(() => new PublicKey(auctionProgramId), []);
  const protocolClient = useMemo(() => new ValoremProtocolClient(connection, "confirmed"), [connection]);

  const catalogAuctionSources = useMemo<CatalogAuctionSource[]>(
    () =>
      catalogAuctions.map((catalog) => ({
        kind: "catalog",
        slug: catalog.slug,
        auctionAddress: catalog.protocol.auctionAddress,
        catalog,
      })),
    [],
  );

  const getTrackedAuctionSources = useCallback(
    () =>
      [
        ...catalogAuctionSources,
        ...Object.values(trackedAuctionLotsRef.current).map(
          (lot) =>
            ({
              kind: "marketplace",
              slug: lot.slug,
              auctionAddress: lot.contractAddress,
              lot,
            }) satisfies MarketplaceAuctionSource,
        ),
      ] satisfies AuctionRuntimeSource[],
    [catalogAuctionSources],
  );

  const syncAuctionSource = useCallback(
    async (
      source: AuctionRuntimeSource,
      options?: {
        markLoading?: boolean;
      },
    ) => {
      if (options?.markLoading) {
        setAuctionLoadState((current) => ({
          ...current,
          [source.slug]: {
            status: "loading",
            updatedAt: Date.now(),
          },
        }));
      }

      const activePublicKey = activeAddress ? new PublicKey(activeAddress) : undefined;
      const auctionAddress = new PublicKey(source.auctionAddress);

      try {
        const snapshot = await protocolClient.fetchAuctionSnapshot(auctionAddress, activePublicKey);
        if (!snapshot) {
          throw new Error("Live auction state is not yet available for this contract.");
        }

        const bidderStates = await fetchBidderStatesForAuction({
          connection,
          programId: auctionProgramPublicKey,
          auctionAddress,
        });
        const complianceRecords = await fetchComplianceRecordsForAuction({
          connection,
          programId: auctionProgramPublicKey,
          auctionAddress,
        });

        if (snapshot.bidderState && activeAddress) {
          bidderStates[activeAddress] = snapshot.bidderState;
        }

        if (snapshot.complianceRecord && activeAddress) {
          complianceRecords[activeAddress] = snapshot.complianceRecord;
        }

        const runtimeState = buildRuntimeStateFromSource({
          source,
          snapshot,
          bidderStates,
          complianceRecords,
        });

        startTransition(() => {
          setRpcState((current) => ({
            ...current,
            [source.slug]: runtimeState,
          }));
          setAuctionLoadState((current) => ({
            ...current,
            [source.slug]: {
              status: "ready",
              updatedAt: Date.now(),
            },
          }));
        });

        return runtimeState;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unable to load live auction state.";

        startTransition(() => {
          setAuctionLoadState((current) => ({
            ...current,
            [source.slug]: {
              status: "error",
              errorMessage,
              updatedAt: Date.now(),
            },
          }));
        });

        return null;
      }
    },
    [activeAddress, auctionProgramPublicKey, connection, protocolClient],
  );

  const refresh = useCallback(async () => {
    const sources = getTrackedAuctionSources();

    for (const [index, source] of sources.entries()) {
      if (index > 0) {
        await delay(120);
      }

      await syncAuctionSource(source);
    }
  }, [getTrackedAuctionSources, syncAuctionSource]);

  const syncAuctionLot = useCallback(
    async (lot: AuctionLot) => {
      if (!isLinkedAuctionLot(lot)) {
        delete trackedAuctionLotsRef.current[lot.slug];
        setAuctionLoadState((current) => ({
          ...current,
          [lot.slug]: {
            status: "idle",
            updatedAt: Date.now(),
          },
        }));
        return;
      }

      trackedAuctionLotsRef.current[lot.slug] = lot;
      await syncAuctionSource(
        {
          kind: "marketplace",
          slug: lot.slug,
          auctionAddress: lot.contractAddress,
          lot,
        },
        { markLoading: true },
      );
    },
    [syncAuctionSource],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const auctions = useMemo(() => {
    const catalogSlugs = new Set(catalogAuctions.map((catalog) => catalog.slug));
    const catalogEntries = catalogAuctions
      .map((catalog) => rpcState[catalog.slug] ?? null)
      .filter((auction): auction is AuctionRuntimeState => auction !== null);
    const marketplaceEntries = Object.entries(rpcState)
      .filter(([slug]) => !catalogSlugs.has(slug))
      .map(([, auction]) => auction);

    return [...catalogEntries, ...marketplaceEntries];
  }, [rpcState]);

  const getAuction = useCallback(
    (slug: string) => rpcState[slug] ?? null,
    [rpcState],
  );

  const getAuctionLoadState = useCallback(
    (slug: string) =>
      auctionLoadState[slug] ?? {
        status: "idle",
      },
    [auctionLoadState],
  );

  const getWalletStateForSlug = useCallback(
    (slug: string) => {
      const auction = getAuction(slug);
      if (!auction) {
        return {
          bidderState: null,
          complianceRecord: null,
          actions: activeAddress ? ["wait"] : ["connect"],
          isLeadingCandidate: false,
          isRefundEligible: false,
          currentBid: null,
        } satisfies WalletAuctionState;
      }

      return getWalletAuctionState(auction, activeAddress);
    },
    [activeAddress, getAuction],
  );

  const runAction = useCallback(
    async (message: string, handler: () => Promise<string | void>) => {
      try {
        const signature = await handler();
        await refresh().catch(() => undefined);
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
    [refresh],
  );

  const sendOrSimulate = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (!connectedWallet || !activeAddress) {
        throw new Error("Connect a wallet first.");
      }

      return sendWalletTransaction({
        wallet: connectedWallet,
        accountAddress: activeAddress,
        connection,
        instructions,
      });
    },
    [activeAddress, connectedWallet, connection],
  );

  const authenticate = useCallback(async () => {
    if (!connectedWallet || !connectedAddress) {
      setFeedback({
        status: "error",
        message: "Connect a wallet before attempting Sign-In With Solana.",
      });
      return;
    }

    setIsAuthenticating(true);

    try {
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedAddress }),
      });
      const noncePayload = (await nonceResponse.json()) as {
        challengeId?: string;
        message?: string;
        error?: string;
      };

      if (!nonceResponse.ok || !noncePayload.challengeId || !noncePayload.message) {
        throw new Error(noncePayload.error ?? "Unable to start wallet authentication.");
      }

      const signed = await signWalletMessage({
        wallet: connectedWallet,
        accountAddress: connectedAddress,
        message: new TextEncoder().encode(noncePayload.message),
      });

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: noncePayload.challengeId,
          walletAddress: connectedAddress,
          signedMessageBase64: bytesToBase64(signed.signedMessage),
          signatureBase64: bytesToBase64(signed.signature),
        }),
      });
      const verifyPayload = (await verifyResponse.json()) as {
        session?: AuthSession;
        error?: string;
      };

      if (!verifyResponse.ok || !verifyPayload.session) {
        throw new Error(verifyPayload.error ?? "Wallet authentication failed.");
      }

      setAuthSession(verifyPayload.session);
      setFeedback({
        status: "success",
        message: `Authenticated as ${connectedAddress.slice(0, 4)}...${connectedAddress.slice(-4)}.`,
      });
    } catch (error) {
      setFeedback({
        status: "error",
        message:
          error instanceof Error ? error.message : "Wallet authentication failed.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [connectedAddress, connectedWallet]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthSession(null);
    setFeedback({
      status: "success",
      message: "Signed out of the marketplace session.",
    });
  }, []);

  const resolveWalletTokenAccount = useCallback(
    async (params: {
      ownerAddress: string;
      mintAddress: PublicKey;
      mintLabel: string;
      ownerLabel: string;
      accountLabel: string;
      allowOwnerOffCurve?: boolean;
      createIfMissing?: boolean;
    }) => {
      const owner = new PublicKey(params.ownerAddress);
      const mint = await resolveMintAccountMetadata({
        connection,
        cluster: protocolCluster,
        mintAddress: params.mintAddress.toBase58(),
        label: params.mintLabel,
      });
      const account = await resolveAssociatedTokenAccount({
        connection,
        owner,
        mint,
        ownerLabel: params.ownerLabel,
        accountLabel: params.accountLabel,
        allowOwnerOffCurve: params.allowOwnerOffCurve,
        createIfMissing: params.createIfMissing,
      });

      return {
        owner,
        mint,
        address: account.address,
        preInstructions: account.preInstructions,
      };
    },
    [connection],
  );

  const resolveMintProgram = useCallback(
    async (mintAddress: PublicKey, label: string) =>
      resolveMintAccountMetadata({
        connection,
        cluster: protocolCluster,
        mintAddress: mintAddress.toBase58(),
        label,
      }),
    [connection],
  );

  const prepareAuctionInitialization = useCallback(
    async (params: InitializeAuctionParams) => {
      if (!activeAddress) {
        throw new Error("Connect a wallet before creating an auction.");
      }

      const issuer = new PublicKey(activeAddress);
      const partialSigners: Keypair[] = [];
      const mintPreInstructions: TransactionInstruction[] = [];
      let effectiveAssetMintAddress: string;
      let issuerAssetAccount: PublicKey | undefined;

      // When no asset mint is provided, create a fresh per-lot Token-2022 mint.
      if (!params.assetMintAddress) {
        const mintResult = await buildPerLotAssetMintInstructions({
          connection,
          issuer,
          assetAmount: params.assetAmount,
        });

        partialSigners.push(mintResult.mintKeypair);
        mintPreInstructions.push(...mintResult.instructions);
        effectiveAssetMintAddress = mintResult.mintKeypair.publicKey.toBase58();
        issuerAssetAccount = mintResult.issuerAssetAccount;
      } else {
        effectiveAssetMintAddress = params.assetMintAddress;
      }

      const resolved = await resolveAuctionInitializationAccounts({
        connection,
        cluster: protocolCluster,
        issuerAddress: activeAddress,
        assetMintAddress: effectiveAssetMintAddress,
        paymentMintAddress: params.paymentMintAddress,
        auctionSeed: params.auctionSeed,
      });
      const now = Math.floor(Date.now() / 1000);
      const biddingEndAt = now + params.biddingWindowSeconds;
      const revealEndAt = biddingEndAt + params.revealWindowSeconds;

      const initInstruction = buildInitializeAuctionInstruction({
        issuer: resolved.issuer,
        reviewer: new PublicKey(params.reviewerAddress),
        assetMint: resolved.assetMint,
        paymentMint: resolved.paymentMint,
        issuerPaymentDestination: resolved.issuerPaymentDestination,
        assetTokenProgram: resolved.assetTokenProgram,
        paymentTokenProgram: resolved.paymentTokenProgram,
        args: {
          auctionSeed: params.auctionSeed,
          depositAmount: params.depositAmount,
          reservePrice: params.reservePrice,
          assetAmount: params.assetAmount,
          biddingEndAt: BigInt(biddingEndAt),
          revealEndAt: BigInt(revealEndAt),
          settlementWindow: BigInt(params.settlementWindowSeconds),
          maxBidders: params.maxBidders,
        },
      });

      // Derive the asset vault (ATA of the auction PDA) and build the deposit
      // instruction so the lot is immediately ready for bidding.
      const assetVault = deriveAuctionVaultAddress(
        resolved.assetMint,
        resolved.auction,
        resolved.assetTokenProgram,
      );

      // The issuer asset account defaults to the ATA derived in per-lot mint
      // creation, or must be resolved for a pre-existing mint.
      const resolvedIssuerAssetAccount =
        issuerAssetAccount ??
        (await resolveAssociatedTokenAccount({
          connection,
          owner: issuer,
          mint: {
            publicKey: resolved.assetMint,
            tokenProgram: resolved.assetTokenProgram,
            tokenProgramLabel: "Token-2022",
          },
          ownerLabel: "issuer",
          accountLabel: "Issuer asset account",
          createIfMissing: false,
        })).address;

      const depositInstruction = buildDepositAssetInstruction({
        issuer: resolved.issuer,
        assetMint: resolved.assetMint,
        auction: resolved.auction,
        assetVault,
        issuerAssetAccount: resolvedIssuerAssetAccount,
        assetTokenProgram: resolved.assetTokenProgram,
      });

      return {
        auction: resolved.auction,
        partialSigners,
        instructions: [
          ...mintPreInstructions,
          ...resolved.preInstructions,
          initInstruction,
          depositInstruction,
        ],
      };
    },
    [activeAddress, connection],
  );

  const validateAuctionInitialization = useCallback(
    async (params: InitializeAuctionParams) => {
      if (!activeAddress) {
        throw new Error("Connect a wallet before creating an auction.");
      }

      // Per-lot mint flow generates a fresh Keypair, so simulation would fail
      // because the mint account doesn't exist yet. Only simulate when using a
      // pre-existing asset mint.
      if (!params.assetMintAddress) {
        // Validate mint/payment configuration without full simulation.
        await resolveMintAccountMetadata({
          connection,
          cluster: protocolCluster,
          mintAddress: params.paymentMintAddress,
          label: "payment mint",
        });
        return;
      }

      const prepared = await prepareAuctionInitialization(params);
      const transaction = new Transaction().add(...prepared.instructions);
      transaction.feePayer = new PublicKey(activeAddress);

      const simulation = await connection.simulateTransaction(transaction);
      if (simulation.value.err) {
        const simulationError =
          typeof simulation.value.err === "string"
            ? simulation.value.err
            : JSON.stringify(simulation.value.err);
        const logSummary = simulation.value.logs
          ? summarizeTransactionLogs(simulation.value.logs)
          : "";

        throw new Error(
          logSummary
            ? `Auction initialization preflight failed.\n${logSummary}`
            : `Auction initialization preflight failed.\n${simulationError}`,
        );
      }
    },
    [activeAddress, connection, prepareAuctionInitialization],
  );

  const initializeAuction = useCallback(
    async (params: InitializeAuctionParams) => {
      if (!connectedWallet || !activeAddress) {
        throw new Error("Connect a wallet before creating an auction.");
      }

      try {
        const prepared = await prepareAuctionInitialization(params);
        const signature = await sendWalletTransaction({
          wallet: connectedWallet,
          accountAddress: activeAddress,
          connection,
          instructions: prepared.instructions,
          partialSigners: prepared.partialSigners,
        });

        setFeedback({
          status: "success",
          message: "Auction initialized and asset deposited on Solana.",
          signature,
        });

        return {
          signature,
          contractAddress: prepared.auction.toBase58(),
        };
      } catch (error) {
        console.error("Transaction failed:", error);
        const message = await formatWalletTransactionError(
          error,
          connection,
          "Unable to initialize the on-chain auction.",
        );
        setFeedback({
          status: "error",
          message,
        });
        if (error instanceof Error) {
          error.message = message;
          throw error;
        }
        throw new Error(message);
      }
    },
    [activeAddress, connectedWallet, connection, prepareAuctionInitialization],
  );

  const submitCommitment = useCallback(
    async (slug: string, bidAmount: bigint) =>
      runAction(`Commitment submitted for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet to bid.");
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
        const bidderPaymentAccount = await resolveWalletTokenAccount({
          ownerAddress: activeAddress,
          mintAddress: auction.auction.paymentMint,
          mintLabel: "payment mint",
          ownerLabel: "bidder",
          accountLabel: "Bidder payment account",
        });

        return sendOrSimulate([
          ...bidderPaymentAccount.preInstructions,
          buildSubmitCommitmentInstruction({
            bidder: new PublicKey(activeAddress),
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            commitment,
            paymentVault: auction.auction.paymentVault,
            bidderPaymentAccount: bidderPaymentAccount.address,
            paymentTokenProgram: bidderPaymentAccount.mint.tokenProgram,
          }),
        ]);
      }),
    [activeAddress, getAuction, resolveWalletTokenAccount, runAction, sendOrSimulate],
  );

  const revealBid = useCallback(
    async (slug: string) =>
      runAction(`Bid revealed for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet first.");
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

        return sendOrSimulate([
          buildRevealBidInstruction({
            bidder: new PublicKey(activeAddress),
            auction: new PublicKey(auction.auctionAddress),
            bidAmount: secret.bidAmount,
            salt: secret.salt,
          }),
        ]);
      }),
    [activeAddress, getAuction, runAction, sendOrSimulate],
  );

  const settleCandidate = useCallback(
    async (slug: string) =>
      runAction(`Settlement completed for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet first.");
        }

        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }
        const [bidderPaymentAccount, bidderAssetAccount] = await Promise.all([
          resolveWalletTokenAccount({
            ownerAddress: activeAddress,
            mintAddress: auction.auction.paymentMint,
            mintLabel: "payment mint",
            ownerLabel: "bidder",
            accountLabel: "Bidder payment account",
          }),
          resolveWalletTokenAccount({
            ownerAddress: activeAddress,
            mintAddress: auction.auction.assetMint,
            mintLabel: "asset mint",
            ownerLabel: "bidder",
            accountLabel: "Bidder asset account",
          }),
        ]);

        return sendOrSimulate([
          ...bidderPaymentAccount.preInstructions,
          ...bidderAssetAccount.preInstructions,
          buildSettleCandidateInstruction({
            bidder: new PublicKey(activeAddress),
            assetMint: auction.auction.assetMint,
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            paymentVault: auction.auction.paymentVault,
            bidderPaymentAccount: bidderPaymentAccount.address,
            assetVault: auction.auction.assetVault,
            bidderAssetAccount: bidderAssetAccount.address,
            assetTokenProgram: bidderAssetAccount.mint.tokenProgram,
            paymentTokenProgram: bidderPaymentAccount.mint.tokenProgram,
          }),
        ]);
      }),
    [activeAddress, getAuction, resolveWalletTokenAccount, runAction, sendOrSimulate],
  );

  const claimRefund = useCallback(
    async (slug: string) =>
      runAction(`Refund claimed for ${slug}.`, async () => {
        if (!activeAddress) {
          throw new Error("Connect a wallet first.");
        }

        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }
        const bidderPaymentAccount = await resolveWalletTokenAccount({
          ownerAddress: activeAddress,
          mintAddress: auction.auction.paymentMint,
          mintLabel: "payment mint",
          ownerLabel: "bidder",
          accountLabel: "Bidder payment account",
        });

        return sendOrSimulate([
          ...bidderPaymentAccount.preInstructions,
          buildClaimRefundInstruction({
            bidder: new PublicKey(activeAddress),
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            paymentVault: auction.auction.paymentVault,
            bidderPaymentAccount: bidderPaymentAccount.address,
            paymentTokenProgram: bidderPaymentAccount.mint.tokenProgram,
          }),
        ]);
      }),
    [activeAddress, getAuction, resolveWalletTokenAccount, runAction, sendOrSimulate],
  );

  const advanceToReveal = useCallback(
    async (slug: string) =>
      runAction(`Auction advanced to reveal for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        return sendOrSimulate([
          buildAdvanceToRevealInstruction({
            admin: auction.auction.issuer,
            auction: new PublicKey(auction.auctionAddress),
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate],
  );

  const closeReveal = useCallback(
    async (slug: string) =>
      runAction(`Reveal closed for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }

        return sendOrSimulate([
          buildCloseRevealInstruction({
            admin: auction.auction.issuer,
            auction: new PublicKey(auction.auctionAddress),
            currentCandidateState: getFirstEligibleCandidateState(auction),
          }),
        ]);
      }),
    [getAuction, runAction, sendOrSimulate],
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
    [getAuction, runAction, sendOrSimulate],
  );

  const slashCandidate = useCallback(
    async (slug: string, walletAddress: string) =>
      runAction(`Settlement candidate slashed for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
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
    [getAuction, runAction, sendOrSimulate],
  );

  const slashUnrevealed = useCallback(
    async (slug: string, walletAddress: string) =>
      runAction(`Unrevealed bidder slashed for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
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
    [getAuction, runAction, sendOrSimulate],
  );

  const withdrawProceeds = useCallback(
    async (slug: string, amount: bigint) =>
      runAction(`Proceeds withdrawn for ${slug}.`, async () => {
        const auction = getAuction(slug);
        if (!auction) {
          throw new Error("Auction not found.");
        }
        const paymentMint = await resolveMintProgram(
          auction.auction.paymentMint,
          "payment mint",
        );

        return sendOrSimulate([
          buildWithdrawProceedsInstruction({
            issuer: auction.auction.issuer,
            paymentMint: auction.auction.paymentMint,
            auction: new PublicKey(auction.auctionAddress),
            paymentVault: auction.auction.paymentVault,
            issuerPaymentDestination: auction.auction.issuerPaymentDestination,
            amount,
            paymentTokenProgram: paymentMint.tokenProgram,
          }),
        ]);
      }),
    [getAuction, resolveMintProgram, runAction, sendOrSimulate],
  );

  const value = useMemo<ValoremAppContextValue>(
    () => ({
      protocolMode,
      cluster: protocolCluster,
      rpcUrl: protocolRpcUrl,
      walletMode,
      authSession,
      isAuthenticating,
      activeAddress,
      wallets,
      connectedWallet,
      auctions,
      feedback,
      refresh,
      authenticate,
      signOut,
      getAuction,
      getAuctionLoadState,
      getWalletAuctionState: getWalletStateForSlug,
      syncAuctionLot,
      validateAuctionInitialization,
      initializeAuction,
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
      authenticate,
      authSession,
      auctions,
      claimRefund,
      closeReveal,
      connectedWallet,
      feedback,
      getAuction,
      getAuctionLoadState,
      getWalletStateForSlug,
      initializeAuction,
      isAuthenticating,
      recordCompliance,
      refresh,
      revealBid,
      settleCandidate,
      signOut,
      slashCandidate,
      slashUnrevealed,
      submitCommitment,
      syncAuctionLot,
      validateAuctionInitialization,
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
