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
  SolanaSignMessage,
  SolanaSignTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignMessageFeature,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  Connection,
  PublicKey,
  SendTransactionError,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
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
  buildInitializeAuctionInstruction,
  buildRecordComplianceInstruction,
  buildRevealBidInstruction,
  buildSettleCandidateInstruction,
  buildSlashCandidateAndAdvanceInstruction,
  buildSlashUnrevealedInstruction,
  buildSubmitCommitmentInstruction,
  buildWithdrawProceedsInstruction,
  createRevealSecret,
  deriveAuctionPda,
  deriveBidderStatePda,
  deriveComplianceRecordPda,
  type BidderStateAccount,
  type ComplianceRecordAccount,
} from "@valorem/sdk";
import { catalogAuctions } from "@/lib/catalog";
import type { AuthSession } from "@/lib/marketplace/types";
import {
  auctionProgramId,
  protocolChain,
  protocolCluster,
  protocolMode,
  protocolRpcUrl,
} from "@/lib/protocol/config";
import { resolveAuctionInitializationAccounts } from "@/lib/protocol/auction-init";
import { getWalletAuctionState } from "@/lib/protocol/runtime-state";
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
  getWalletAuctionState: (slug: string) => WalletAuctionState;
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
  assetMintAddress: string;
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
}) {
  const transaction = new Transaction().add(...params.instructions);
  transaction.feePayer = new PublicKey(params.accountAddress);

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

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
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
  const [feedback, setFeedback] = useState<TransactionFeedback>({ status: "idle" });

  const walletMode: WalletMode = connectedAddress ? "wallet-standard" : "disconnected";
  const activeAddress = connectedAddress;
  const connection = useMemo(() => new Connection(protocolRpcUrl, "confirmed"), []);
  const auctionProgramPublicKey = useMemo(() => new PublicKey(auctionProgramId), []);
  const protocolClient = useMemo(() => new ValoremProtocolClient(connection, "confirmed"), [connection]);

  const refresh = useCallback(async () => {
    const activePublicKey = activeAddress ? new PublicKey(activeAddress) : undefined;
    const nextEntries: Array<readonly [string, AuctionRuntimeState]> = [];

    for (const [index, catalog] of catalogAuctions.entries()) {
      if (index > 0) {
        await delay(120);
      }

      const auctionAddress = new PublicKey(catalog.protocol.auctionAddress);

      try {
        const snapshot = await protocolClient.fetchAuctionSnapshot(auctionAddress, activePublicKey);
        if (!snapshot) {
          continue;
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

        nextEntries.push([
          catalog.slug,
          {
            catalog,
            auctionAddress: catalog.protocol.auctionAddress,
            auction: snapshot.auction,
            bidderStates,
            complianceRecords,
            minIncrement: 0n,
            paymentSymbol: "USDC",
            assetSymbol: "RWA",
          } satisfies AuctionRuntimeState,
        ]);
      } catch {
        continue;
      }
    }

    const nextRpcState = Object.fromEntries(nextEntries);

    startTransition(() => {
      setRpcState(nextRpcState);
    });
  }, [activeAddress, auctionProgramPublicKey, connection, protocolClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const auctions = useMemo(() => {
    return catalogAuctions
      .map((catalog) => rpcState[catalog.slug] ?? null)
      .filter((auction): auction is AuctionRuntimeState => auction !== null);
  }, [rpcState]);

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

  const prepareAuctionInitialization = useCallback(
    async (params: InitializeAuctionParams) => {
      if (!activeAddress) {
        throw new Error("Connect a wallet before creating an auction.");
      }

      const resolved = await resolveAuctionInitializationAccounts({
        connection,
        cluster: protocolCluster,
        issuerAddress: activeAddress,
        assetMintAddress: params.assetMintAddress,
        paymentMintAddress: params.paymentMintAddress,
        auctionSeed: params.auctionSeed,
      });
      const now = Math.floor(Date.now() / 1000);
      const biddingEndAt = now + params.biddingWindowSeconds;
      const revealEndAt = biddingEndAt + params.revealWindowSeconds;

      return {
        auction: resolved.auction,
        instructions: [
          ...resolved.preInstructions,
          buildInitializeAuctionInstruction({
            issuer: resolved.issuer,
            reviewer: new PublicKey(params.reviewerAddress),
            assetMint: resolved.assetMint,
            paymentMint: resolved.paymentMint,
            issuerPaymentDestination: resolved.issuerPaymentDestination,
            tokenProgram: resolved.tokenProgram,
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
          }),
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
        });

        setFeedback({
          status: "success",
          message: "Auction initialized on Solana.",
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
    [activeAddress, getAuction, runAction, sendOrSimulate],
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
    [activeAddress, getAuction, runAction, sendOrSimulate],
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
    [activeAddress, getAuction, runAction, sendOrSimulate],
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
    [getAuction, runAction, sendOrSimulate],
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
      getWalletAuctionState: getWalletStateForSlug,
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
