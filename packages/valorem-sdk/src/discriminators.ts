import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes } from "./bytes.js";

const encoder = new TextEncoder();

export function anchorDiscriminator(namespace: string, name: string): Uint8Array {
  return sha256(encoder.encode(`${namespace}:${name}`)).slice(0, 8);
}

export function anchorInstructionDiscriminator(name: string): Uint8Array {
  return anchorDiscriminator("global", name);
}

export function anchorAccountDiscriminator(name: string): Uint8Array {
  return anchorDiscriminator("account", name);
}

export function withDiscriminator(discriminator: Uint8Array, payload?: Uint8Array): Uint8Array {
  return concatBytes(payload ? [discriminator, payload] : [discriminator]);
}
