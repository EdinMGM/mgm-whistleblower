import crypto from 'crypto';
import argon2 from 'argon2';

/**
 * Generiše jedinstveni referentni broj prijave.
 * Format: MGM-2026-XXXXXX (6 alfanumeričkih znakova, velika slova + cifre, bez dvosmislenih znakova)
 * Koristi crypto.randomBytes za kriptografski siguran nasumični izbor.
 */
export function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  // Ukloni dvosmislene znakove: 0, O, I, 1, L
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += charset[bytes[i] % charset.length];
  }
  return `MGM-${year}-${code}`;
}

/**
 * Generiše kriptografski siguran tajni pristupni ključ.
 * 24 bajta kodirana u base32 — čitljiv za korisnika, dovoljno entropije.
 * Base32 koristi A-Z2-7 (RFC 4648) bez padding znakova.
 */
export function generateSecretKey(): string {
  const bytes = crypto.randomBytes(24);
  return base32Encode(bytes);
}

/**
 * Hashira tajni ključ koristeći argon2id.
 * U bazi se čuva samo hash — plaintext ključ se nikada ne pohranjuje.
 */
export async function hashSecretKey(key: string): Promise<string> {
  return argon2.hash(key, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 2,
  });
}

/**
 * Provjerava da li uneseni ključ odgovara sačuvanom hashu.
 * Vraća true ako se podudaraju, false inače.
 */
export async function verifySecretKey(key: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, key);
  } catch {
    return false;
  }
}

/**
 * Hashira lozinku administratora koristeći argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 2,
  });
}

/**
 * Provjerava lozinku administratora.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ── Base32 kodiranje (RFC 4648, bez padding) ──

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  // Formatiraj u grupe od 4 znaka radi čitljivosti
  return result.match(/.{1,4}/g)?.join('-') ?? result;
}
