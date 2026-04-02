import {
  anchorAccountDiscriminator,
  anchorInstructionDiscriminator,
} from "../../discriminators.js";
import { VALOREM_TRANSFER_HOOK_PROGRAM_ID } from "../../constants.js";

export const valoremTransferHookIdl = {
  address: VALOREM_TRANSFER_HOOK_PROGRAM_ID.toBase58(),
  metadata: {
    name: "valorem_transfer_hook",
    version: "0.1.0",
    spec: "manual-sdk-schema",
  },
  instructions: ["initialize_hook", "issue_permit", "revoke_permit", "transfer_hook"].map(
    (name) => ({
      name,
      discriminator: Array.from(anchorInstructionDiscriminator(name)),
    }),
  ),
  accounts: ["HookConfig", "TransferPermit"].map((name) => ({
    name,
    discriminator: Array.from(anchorAccountDiscriminator(name)),
  })),
} as const;
