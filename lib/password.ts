import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";
const SCRYPT_KEYLEN = 64;

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, Buffer.from(salt, "hex"), SCRYPT_KEYLEN).toString("hex");
  return `${PASSWORD_HASH_PREFIX}:${salt}:${derived}`;
}

export function verifyPasswordHash(password: string, hash: string): boolean {
  const [prefix, salt, expected] = hash.split(":");
  if (!prefix || !salt || !expected || prefix !== PASSWORD_HASH_PREFIX) {
    return false;
  }

  const derived = scryptSync(password, Buffer.from(salt, "hex"), SCRYPT_KEYLEN).toString("hex");
  return safeCompare(derived, expected);
}

export function verifyPlainPassword(password: string, expected: string): boolean {
  return safeCompare(password, expected);
}
