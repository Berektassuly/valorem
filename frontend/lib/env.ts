import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

function requiredStringSchema() {
  return z.preprocess(
    (value) => (value === undefined || value === null ? "" : value),
    z.string().trim().min(1, "is required."),
  );
}

const publicKeySchema = requiredStringSchema().superRefine((value, ctx) => {
  if (!value) {
    return;
  }

  try {
    new PublicKey(value);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "must be a valid base58 Solana public key.",
    });
  }
});

const databaseUrlSchema = requiredStringSchema().superRefine((value, ctx) => {
  if (!value) {
    return;
  }

  try {
    const protocol = new URL(value).protocol;
    if (protocol !== "postgres:" && protocol !== "postgresql:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "must use the postgres:// or postgresql:// protocol.",
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "must be a valid database connection URL.",
    });
  }
});

const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_SOLANA_RPC_URL: z
      .string()
      .trim()
      .url("must be a valid RPC URL.")
      .default("https://api.devnet.solana.com"),
    NEXT_PUBLIC_SOLANA_CLUSTER: z
      .enum(["devnet", "mainnet-beta"])
      .default("devnet"),
    NEXT_PUBLIC_VALOREM_DEFAULT_REVIEWER: publicKeySchema,
    NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT: z
      .string()
      .trim()
      .default("")
      .superRefine((value, ctx) => {
        if (!value) {
          return;
        }

        try {
          new PublicKey(value);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "must be a valid base58 Solana public key.",
          });
        }
      }),
    NEXT_PUBLIC_VALOREM_DEFAULT_PAYMENT_MINT: publicKeySchema,
    NEXT_PUBLIC_VALOREM_DEFAULT_DEPOSIT_AMOUNT: z.coerce.bigint().positive().default(250_000_000n),
    NEXT_PUBLIC_VALOREM_DEFAULT_RESERVE_PRICE: z.coerce.bigint().positive().default(2_500_000_000n),
    NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_AMOUNT: z.coerce.bigint().positive().default(1n),
    NEXT_PUBLIC_VALOREM_DEFAULT_BIDDING_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(24 * 60 * 60),
    NEXT_PUBLIC_VALOREM_DEFAULT_REVEAL_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(12 * 60 * 60),
    NEXT_PUBLIC_VALOREM_DEFAULT_SETTLEMENT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(24 * 60 * 60),
    NEXT_PUBLIC_VALOREM_DEFAULT_MAX_BIDDERS: z.coerce.number().int().min(1).default(16),
  })
  .strict();

const serverEnvSchema = z
  .object({
    DATABASE_URL: databaseUrlSchema,
    VALOREM_AUTH_SECRET: requiredStringSchema(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .strict();

type PublicEnv = z.infer<typeof publicEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatEnvError(error: z.ZodError, label: string) {
  const issues = error.issues.map((issue) => {
    const key = issue.path.join(".") || "environment";
    return `- ${key}: ${issue.message}`;
  });

  return [
    `[env] Invalid Valorem ${label} environment configuration.`,
    ...issues,
    "Copy frontend/.env.example to frontend/.env.local, fill in the required values, and restart Next.js.",
  ].join("\n");
}

function validateEnv<Schema extends z.ZodTypeAny>(
  schema: Schema,
  rawEnv: unknown,
  label: string,
): z.infer<Schema> {
  const result = schema.safeParse(rawEnv);
  if (result.success) {
    return result.data;
  }

  const message = formatEnvError(result.error, label);
  console.error(message);
  throw new Error(message);
}

export const publicEnv = validateEnv(
  publicEnvSchema,
  {
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_VALOREM_DEFAULT_REVIEWER: process.env.NEXT_PUBLIC_VALOREM_DEFAULT_REVIEWER,
    NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT: process.env.NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT,
    NEXT_PUBLIC_VALOREM_DEFAULT_PAYMENT_MINT: process.env.NEXT_PUBLIC_VALOREM_DEFAULT_PAYMENT_MINT,
    NEXT_PUBLIC_VALOREM_DEFAULT_DEPOSIT_AMOUNT:
      process.env.NEXT_PUBLIC_VALOREM_DEFAULT_DEPOSIT_AMOUNT,
    NEXT_PUBLIC_VALOREM_DEFAULT_RESERVE_PRICE:
      process.env.NEXT_PUBLIC_VALOREM_DEFAULT_RESERVE_PRICE,
    NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_AMOUNT:
      process.env.NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_AMOUNT,
    NEXT_PUBLIC_VALOREM_DEFAULT_BIDDING_WINDOW_SECONDS:
      process.env.NEXT_PUBLIC_VALOREM_DEFAULT_BIDDING_WINDOW_SECONDS,
    NEXT_PUBLIC_VALOREM_DEFAULT_REVEAL_WINDOW_SECONDS:
      process.env.NEXT_PUBLIC_VALOREM_DEFAULT_REVEAL_WINDOW_SECONDS,
    NEXT_PUBLIC_VALOREM_DEFAULT_SETTLEMENT_WINDOW_SECONDS:
      process.env.NEXT_PUBLIC_VALOREM_DEFAULT_SETTLEMENT_WINDOW_SECONDS,
    NEXT_PUBLIC_VALOREM_DEFAULT_MAX_BIDDERS:
      process.env.NEXT_PUBLIC_VALOREM_DEFAULT_MAX_BIDDERS,
  },
  "public",
);

const serverEnv =
  typeof window === "undefined"
    ? validateEnv(
        serverEnvSchema,
        {
          DATABASE_URL: process.env.DATABASE_URL,
          VALOREM_AUTH_SECRET: process.env.VALOREM_AUTH_SECRET,
          NODE_ENV: process.env.NODE_ENV,
        },
        "server",
      )
    : undefined;

export const env = {
  ...publicEnv,
  ...(serverEnv ?? {}),
} as PublicEnv & ServerEnv;
