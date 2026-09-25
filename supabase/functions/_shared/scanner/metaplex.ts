// Metaplex Token Metadata: who can still change a Solana token's name, symbol, logo and URI.
//
// The metadata account is a program-derived address (PDA) of ["metadata", program id, mint]. It is derived
// here (sha256 + an off-curve check) so the read works on any public RPC, without a paid DAS API.
import { ed25519 } from 'https://esm.sh/@noble/curves@1.4.0/ed25519';

export const METADATA_PROGRAM = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function b58decode(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) {
    const i = B58.indexOf(c);
    if (i < 0) throw new Error('invalid base58');
    n = n * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n % 256n));
    n /= 256n;
  }
  for (const c of s) {
    if (c !== '1') break;
    bytes.unshift(0);
  }
  return new Uint8Array(bytes);
}

export function b58encode(b: Uint8Array): string {
  let n = 0n;
  for (const x of b) n = n * 256n + BigInt(x);
  let s = '';
  while (n > 0n) {
    s = B58[Number(n % 58n)] + s;
    n /= 58n;
  }
  for (const x of b) {
    if (x !== 0) break;
    s = '1' + s;
  }
  return s;
}

function onCurve(bytes: Uint8Array): boolean {
  try {
    ed25519.ExtendedPoint.fromHex(bytes);
    return true;
  } catch {
    return false;
  }
}

/** Solana findProgramAddress: highest bump whose hash is NOT an ed25519 point. */
export async function findProgramAddress(seeds: Uint8Array[], programId: string): Promise<string> {
  const prog = b58decode(programId);
  const marker = new TextEncoder().encode('ProgramDerivedAddress');
  for (let bump = 255; bump >= 0; bump--) {
    const parts = [...seeds, new Uint8Array([bump]), prog, marker];
    const buf = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) {
      buf.set(p, o);
      o += p.length;
    }
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    if (!onCurve(h)) return b58encode(h);
  }
  throw new Error('no viable bump');
}

export async function metadataPda(mint: string): Promise<string> {
  return findProgramAddress([new TextEncoder().encode('metadata'), b58decode(METADATA_PROGRAM), b58decode(mint)], METADATA_PROGRAM);
}

/**
 * Parses the fixed prefix of a Metadata account (key, update authority, mint, name, symbol, uri,
 * seller fee, creators, primary sale, is_mutable). Returns null when the bytes do not match that layout.
 */
export function parseMetadata(data: Uint8Array, mint: string): { updateAuthority: string; isMutable: boolean; name: string } | null {
  try {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (data[0] !== 4) return null; // Key::MetadataV1
    let o = 1;
    const updateAuthority = b58encode(data.slice(o, o + 32));
    o += 32;
    if (b58encode(data.slice(o, o + 32)) !== mint) return null;
    o += 32;
    const str = () => {
      const len = dv.getUint32(o, true);
      if (len > 1000) throw new Error('bad string length');
      const s = new TextDecoder().decode(data.slice(o + 4, o + 4 + len)).replace(/\0+$/, '');
      o += 4 + len;
      return s;
    };
    const name = str();
    str(); // symbol
    str(); // uri
    o += 2; // seller_fee_basis_points
    if (data[o++] === 1) {
      const n = dv.getUint32(o, true);
      if (n > 5) return null; // Metaplex allows at most 5 creators
      o += 4 + n * 34;
    }
    o += 1; // primary_sale_happened
    const m = data[o];
    if (m !== 0 && m !== 1) return null;
    return { updateAuthority, isMutable: m === 1, name };
  } catch {
    return null;
  }
}
