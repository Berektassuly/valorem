import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { deriveAuctionPda } from "@valorem/sdk";
import {
  Connection,
  PublicKey,
  type AccountInfo,
  type ParsedAccountData,
  type TransactionInstruction,
} from "@solana/web3.js";

export type MintAccountMetadata = {
  publicKey: PublicKey;
  tokenProgram: PublicKey;
  tokenProgramLabel: string;
};

export type AuctionInitializationAccounts = {
  issuer: PublicKey;
  auction: PublicKey;
  assetMint: PublicKey;
  paymentMint: PublicKey;
  assetTokenProgram: PublicKey;
  paymentTokenProgram: PublicKey;
  issuerPaymentDestination: PublicKey;
  preInstructions: TransactionInstruction[];
};

const SUPPORTED_TOKEN_PROGRAMS = new Map<
  string,
  { programId: PublicKey; label: string }
>([
  [
    TOKEN_PROGRAM_ID.toBase58(),
    {
      programId: TOKEN_PROGRAM_ID,
      label: "SPL Token",
    },
  ],
  [
    TOKEN_2022_PROGRAM_ID.toBase58(),
    {
      programId: TOKEN_2022_PROGRAM_ID,
      label: "Token-2022",
    },
  ],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isParsedAccountData(
  value: AccountInfo<Buffer | ParsedAccountData>["data"] | unknown,
): value is ParsedAccountData {
  return isRecord(value) && "parsed" in value;
}

function getParsedAccountType(value: ParsedAccountData) {
  const parsed = value.parsed;
  return isRecord(parsed) && typeof parsed.type === "string" ? parsed.type : null;
}

function getParsedInfo(value: ParsedAccountData) {
  const parsed = value.parsed;
  if (!isRecord(parsed) || !isRecord(parsed.info)) {
    return {};
  }

  return parsed.info;
}

function formatProgramLabel(address: string) {
  return SUPPORTED_TOKEN_PROGRAMS.get(address)?.label ?? address;
}

export async function resolveMintAccountMetadata(params: {
  connection: Connection;
  cluster: string;
  mintAddress: string;
  label: string;
}) {
  const mintPublicKey = new PublicKey(params.mintAddress);
  const response = await params.connection.getParsedAccountInfo(
    mintPublicKey,
    "confirmed",
  );
  const accountInfo = response.value;

  if (!accountInfo) {
    throw new Error(
      `Configured ${params.label} ${params.mintAddress} does not exist on ${params.cluster}.`,
    );
  }

  if (!isParsedAccountData(accountInfo.data) || getParsedAccountType(accountInfo.data) !== "mint") {
    const parsedType = isParsedAccountData(accountInfo.data)
      ? getParsedAccountType(accountInfo.data)
      : null;

    throw new Error(
      `Configured ${params.label} ${params.mintAddress} is not a token mint on ${params.cluster}. RPC returned ${parsedType ?? "an unparsed account"} instead.`,
    );
  }

  const tokenProgram = SUPPORTED_TOKEN_PROGRAMS.get(accountInfo.owner.toBase58());

  if (!tokenProgram) {
    throw new Error(
      `Configured ${params.label} ${params.mintAddress} is owned by unsupported program ${accountInfo.owner.toBase58()}.`,
    );
  }

  return {
    publicKey: mintPublicKey,
    tokenProgram: tokenProgram.programId,
    tokenProgramLabel: tokenProgram.label,
  } satisfies MintAccountMetadata;
}

export async function resolveAssociatedTokenAccount(params: {
  connection: Connection;
  owner: PublicKey;
  mint: MintAccountMetadata;
  ownerLabel: string;
  accountLabel: string;
  allowOwnerOffCurve?: boolean;
  createIfMissing?: boolean;
}) {
  const associatedTokenAddress = getAssociatedTokenAddressSync(
    params.mint.publicKey,
    params.owner,
    params.allowOwnerOffCurve ?? false,
    params.mint.tokenProgram,
  );
  const accountResponse = await params.connection.getParsedAccountInfo(
    associatedTokenAddress,
    "confirmed",
  );
  const accountInfo = accountResponse.value;

  if (!accountInfo) {
    return {
      address: associatedTokenAddress,
      preInstructions: params.createIfMissing === false
        ? []
        : [
            createAssociatedTokenAccountIdempotentInstruction(
              params.owner,
              associatedTokenAddress,
              params.owner,
              params.mint.publicKey,
              params.mint.tokenProgram,
            ),
          ],
    };
  }

  if (!accountInfo.owner.equals(params.mint.tokenProgram)) {
    throw new Error(
      `${params.accountLabel} ${associatedTokenAddress.toBase58()} is owned by ${formatProgramLabel(accountInfo.owner.toBase58())}, but mint ${params.mint.publicKey.toBase58()} uses ${params.mint.tokenProgramLabel}.`,
    );
  }

  if (!isParsedAccountData(accountInfo.data) || getParsedAccountType(accountInfo.data) !== "account") {
    throw new Error(
      `${params.accountLabel} ${associatedTokenAddress.toBase58()} is not a token account.`,
    );
  }

  const parsedInfo = getParsedInfo(accountInfo.data);

  if (parsedInfo.mint !== params.mint.publicKey.toBase58()) {
    throw new Error(
      `${params.accountLabel} ${associatedTokenAddress.toBase58()} does not match mint ${params.mint.publicKey.toBase58()}.`,
    );
  }

  if (parsedInfo.owner !== params.owner.toBase58()) {
    throw new Error(
      `${params.accountLabel} ${associatedTokenAddress.toBase58()} is not owned by ${params.ownerLabel} ${params.owner.toBase58()}.`,
    );
  }

  return {
    address: associatedTokenAddress,
    preInstructions: [] satisfies TransactionInstruction[],
  };
}

export async function resolveAuctionInitializationAccounts(params: {
  connection: Connection;
  cluster: string;
  issuerAddress: string;
  assetMintAddress: string;
  paymentMintAddress: string;
  auctionSeed: Uint8Array;
}) {
  const issuer = new PublicKey(params.issuerAddress);
  const [assetMint, paymentMint] = await Promise.all([
    resolveMintAccountMetadata({
      connection: params.connection,
      cluster: params.cluster,
      mintAddress: params.assetMintAddress,
      label: "asset mint",
    }),
    resolveMintAccountMetadata({
      connection: params.connection,
      cluster: params.cluster,
      mintAddress: params.paymentMintAddress,
      label: "payment mint",
    }),
  ]);

  if (!assetMint.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
    throw new Error(
      `Asset mint ${assetMint.publicKey.toBase58()} uses ${assetMint.tokenProgramLabel}. The Valorem transfer-hook asset mint must be Token-2022.`,
    );
  }

  const paymentDestination = await resolveAssociatedTokenAccount({
    connection: params.connection,
    owner: issuer,
    mint: paymentMint,
    ownerLabel: "issuer",
    accountLabel: "Issuer payment destination",
  });
  const [auction] = deriveAuctionPda(issuer, params.auctionSeed);

  return {
    issuer,
    auction,
    assetMint: assetMint.publicKey,
    paymentMint: paymentMint.publicKey,
    assetTokenProgram: assetMint.tokenProgram,
    paymentTokenProgram: paymentMint.tokenProgram,
    issuerPaymentDestination: paymentDestination.address,
    preInstructions: paymentDestination.preInstructions,
  } satisfies AuctionInitializationAccounts;
}
