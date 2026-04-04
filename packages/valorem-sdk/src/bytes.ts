import { PublicKey } from "@solana/web3.js";

export function toUint8Array(value: Buffer | Uint8Array | number[]): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  return Uint8Array.from(value);
}

export function concatBytes(parts: Array<Buffer | Uint8Array>): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    const bytes = toUint8Array(part);
    result.set(bytes, offset);
    offset += bytes.length;
  }

  return result;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

export function normalizePublicKey(value: PublicKey | Uint8Array | string): PublicKey {
  if (value instanceof PublicKey) {
    return value;
  }

  return new PublicKey(value);
}

export function u16ToLeBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

export function u32ToLeBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

export function u64ToLeBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

export function i64ToLeBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigInt64(0, value, true);
  return bytes;
}

export class ByteReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  readBytes(length: number): Uint8Array {
    const end = this.offset + length;
    if (end > this.data.length) {
      throw new Error("Unexpected end of account data.");
    }

    const slice = this.data.slice(this.offset, end);
    this.offset = end;
    return slice;
  }

  readBool(): boolean {
    return this.readU8() === 1;
  }

  readU8(): number {
    return this.readBytes(1)[0] ?? 0;
  }

  readU16(): number {
    const bytes = this.readBytes(2);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(0, true);
  }

  readU32(): number {
    const bytes = this.readBytes(4);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
  }

  readU64(): bigint {
    const bytes = this.readBytes(8);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(0, true);
  }

  readI64(): bigint {
    const bytes = this.readBytes(8);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigInt64(0, true);
  }

  readPubkey(): PublicKey {
    return new PublicKey(this.readBytes(32));
  }
}

export class ByteWriter {
  private readonly parts: Uint8Array[] = [];

  writeBytes(bytes: Uint8Array): this {
    this.parts.push(bytes);
    return this;
  }

  writeBool(value: boolean): this {
    return this.writeU8(value ? 1 : 0);
  }

  writeU8(value: number): this {
    this.parts.push(Uint8Array.of(value));
    return this;
  }

  writeU16(value: number): this {
    this.parts.push(u16ToLeBytes(value));
    return this;
  }

  writeU32(value: number): this {
    this.parts.push(u32ToLeBytes(value));
    return this;
  }

  writeU64(value: bigint): this {
    this.parts.push(u64ToLeBytes(value));
    return this;
  }

  writeI64(value: bigint): this {
    this.parts.push(i64ToLeBytes(value));
    return this;
  }

  writePubkey(value: PublicKey): this {
    this.parts.push(value.toBytes());
    return this;
  }

  toUint8Array(): Uint8Array {
    return concatBytes(this.parts);
  }
}
