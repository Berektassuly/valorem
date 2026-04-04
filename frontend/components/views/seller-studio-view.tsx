"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ActionButton,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
} from "@/components/ui";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import { marketplaceProtocolDefaults } from "@/lib/marketplace/config";
import { formatWalletAddress } from "@/lib/marketplace/view-models";
import { formatUsd } from "@/lib/protocol/format";

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to convert the selected file."));
    };
    reader.onerror = () => {
      reject(new Error("Unable to read the selected file."));
    };
    reader.readAsDataURL(file);
  });
}

function createAuctionSeed() {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return seed;
}

export function SellerStudioView({
  hasSession,
  hasDatabaseError = false,
  hasProtocolDefaults = true,
}: {
  hasSession: boolean;
  hasDatabaseError?: boolean;
  hasProtocolDefaults?: boolean;
}) {
  const router = useRouter();
  const {
    activeAddress,
    authSession,
    feedback,
    validateAuctionInitialization,
    initializeAuction,
  } = useValoremApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const shouldShowFeedback = Boolean(feedback.message && feedback.message !== localMessage);

  const sessionMatchesWallet =
    authSession && activeAddress ? authSession.walletAddress === activeAddress : false;

  if (!hasSession) {
    return (
      <div className="space-y-8">
        <PageIntro
          eyebrow="Seller studio / Protected"
          title="Sign in before creating a lot."
          description="Lot creation is protected by Sign-In With Solana. Connect the wallet you want to issue from, sign the nonce challenge, and then return here to open the seller flow."
        />
        <Panel className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            The API routes that create and link lots reject unauthenticated
            requests, so this page stays locked until a session cookie exists.
          </p>
        </Panel>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeAddress || !sessionMatchesWallet) {
      setLocalMessage(
        "Reconnect the same wallet that owns the authenticated session before creating a lot.",
      );
      return;
    }

    if (!imageFile) {
      setLocalMessage("Attach an image before submitting the lot.");
      return;
    }

    if (hasDatabaseError) {
      setLocalMessage("DATABASE_URL is required before new lots can be stored.");
      return;
    }

    if (!hasProtocolDefaults) {
      setLocalMessage(
        "Protocol defaults are missing. Configure the reviewer, asset mint, and payment mint before creating lots.",
      );
      return;
    }

    setIsSubmitting(true);
    const auctionSeed = createAuctionSeed();
    let createdLotSlug: string | null = null;

    try {
      setLocalMessage("Validating on-chain auction configuration...");
      await validateAuctionInitialization({
        reviewerAddress: marketplaceProtocolDefaults.reviewerAddress,
        paymentMintAddress: marketplaceProtocolDefaults.paymentMint,
        auctionSeed,
        depositAmount: marketplaceProtocolDefaults.depositAmount,
        reservePrice: marketplaceProtocolDefaults.reservePrice,
        assetAmount: marketplaceProtocolDefaults.assetAmount,
        biddingWindowSeconds: marketplaceProtocolDefaults.biddingWindowSeconds,
        revealWindowSeconds: marketplaceProtocolDefaults.revealWindowSeconds,
        settlementWindowSeconds: marketplaceProtocolDefaults.settlementWindowSeconds,
        maxBidders: marketplaceProtocolDefaults.maxBidders,
      });

      setLocalMessage("Converting media and creating the database draft...");
      const imageBase64 = await fileToDataUrl(imageFile);

      const createResponse = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          imageBase64,
        }),
      });
      const createPayload = (await createResponse.json()) as {
        lot?: { id: string; slug: string };
        error?: string;
      };

      if (!createResponse.ok || !createPayload.lot) {
        throw new Error(createPayload.error ?? "Unable to create the lot draft.");
      }
      createdLotSlug = createPayload.lot.slug;

      setLocalMessage("Draft stored. Waiting for wallet confirmation...");

      const onChainAuction = await initializeAuction({
        reviewerAddress: marketplaceProtocolDefaults.reviewerAddress,
        paymentMintAddress: marketplaceProtocolDefaults.paymentMint,
        auctionSeed,
        depositAmount: marketplaceProtocolDefaults.depositAmount,
        reservePrice: marketplaceProtocolDefaults.reservePrice,
        assetAmount: marketplaceProtocolDefaults.assetAmount,
        biddingWindowSeconds: marketplaceProtocolDefaults.biddingWindowSeconds,
        revealWindowSeconds: marketplaceProtocolDefaults.revealWindowSeconds,
        settlementWindowSeconds: marketplaceProtocolDefaults.settlementWindowSeconds,
        maxBidders: marketplaceProtocolDefaults.maxBidders,
      });

      setLocalMessage("On-chain auction initialized. Linking contract address...");

      const linkResponse = await fetch(`/api/auctions/${createPayload.lot.id}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress: onChainAuction.contractAddress,
        }),
      });
      const linkPayload = (await linkResponse.json()) as {
        lot?: { slug: string };
        error?: string;
      };

      if (!linkResponse.ok || !linkPayload.lot) {
        throw new Error(
          linkPayload.error ??
            "The database draft was created, but the contract link step failed.",
        );
      }

      router.push(`/auctions/${linkPayload.lot.slug}`);
      router.refresh();
    } catch (error) {
      const baseMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unable to create the lot.";

      setLocalMessage(
        createdLotSlug
          ? `Draft ${createdLotSlug} was created in PostgreSQL, but the on-chain step failed.\n${baseMessage}`
          : baseMessage,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Seller studio / Create lot"
        title="Create an authenticated auction lot."
        description="This form stores the lot in PostgreSQL first, then asks the connected wallet to initialize the auction on Solana, and finally links the on-chain contract address back to the database record."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone={sessionMatchesWallet ? "copper" : "default"}>
                {sessionMatchesWallet ? "Ready" : "Reconnect wallet"}
              </Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                {formatWalletAddress(authSession?.walletAddress ?? null)}
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                {
                  label: "Deposit",
                  value: formatUsd(marketplaceProtocolDefaults.depositAmount),
                },
                {
                  label: "Reserve",
                  value: formatUsd(marketplaceProtocolDefaults.reservePrice),
                  accent: true,
                },
                {
                  label: "Bidding",
                  value: `${Math.round(
                    marketplaceProtocolDefaults.biddingWindowSeconds / 3600,
                  )}h`,
                },
                {
                  label: "Settlement",
                  value: `${Math.round(
                    marketplaceProtocolDefaults.settlementWindowSeconds / 3600,
                  )}h`,
                },
              ]}
            />
          </Panel>
        }
      />

      {hasDatabaseError ? (
        <Panel tone="dark" className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
            Database configuration
          </p>
          <p className="text-sm leading-6 text-white/80">
            `DATABASE_URL` is required before lot drafts can be stored.
          </p>
        </Panel>
      ) : null}

      {!hasProtocolDefaults ? (
        <Panel tone="dark" className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
            Protocol defaults
          </p>
          <p className="text-sm leading-6 text-white/80">
            Configure reviewer and mint defaults through the public Valorem env
            variables before using the seller studio.
          </p>
        </Panel>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_360px]">
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Lot payload"
            title="Metadata and media"
            description="Images are converted to Base64 in the browser and posted directly to the API, keeping the MVP storage model entirely inside PostgreSQL."
          />
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Prime waterfront distribution parcel"
                className="w-full border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-copper"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the asset, what is being sold, and any ownership context the eventual winner should retain."
                rows={7}
                className="w-full border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-copper"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                Image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="w-full border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors file:mr-4 file:border-0 file:bg-surface file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.28em]"
                required
              />
            </label>

            <ActionButton type="submit" disabled={isSubmitting} className="w-full justify-between">
              <span>{isSubmitting ? "Submitting" : "Create and initialize lot"}</span>
              <span>DB + Solana</span>
            </ActionButton>
          </form>

          {localMessage ? (
            <p className="break-words whitespace-pre-wrap text-sm leading-6 text-muted">
              {localMessage}
            </p>
          ) : null}
          {shouldShowFeedback ? (
            <p
              className={`break-words whitespace-pre-wrap text-sm leading-6 ${
                feedback.status === "error" ? "text-alert" : "text-muted"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Protocol preset"
              title="On-chain defaults"
              description="The MVP sources protocol parameters from shared defaults. Each lot receives its own Token-2022 asset mint created at initialization time."
            />
            <div className="space-y-3">
              {[
                `Reviewer / ${formatWalletAddress(marketplaceProtocolDefaults.reviewerAddress)}`,
                `Asset mint / Generated per lot`,
                `Payment mint / ${formatWalletAddress(marketplaceProtocolDefaults.paymentMint)}`,
                `Max bidders / ${marketplaceProtocolDefaults.maxBidders}`,
              ].map((item) => (
                <div key={item} className="border border-line bg-surface p-4 text-sm leading-6 text-ink">
                  {item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel tone="dark" className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              Asset lifecycle
            </p>
            <p className="text-sm leading-6 text-white/80">
              A fresh Token-2022 mint is created, supply is minted to the issuer, and the asset is deposited into the auction vault — all in a single wallet confirmation.
            </p>
          </Panel>

          <Panel tone="dark" className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              Guardrails
            </p>
            <p className="text-sm leading-6 text-white/80">
              The authenticated session wallet and the connected signing wallet
              must match before the seller flow will submit.
            </p>
          </Panel>
        </div>
      </section>
    </div>
  );
}
