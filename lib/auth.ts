import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import {
  createAdminSession,
  deleteAdminSession,
  isAdminSessionValid,
  pruneExpiredAdminSessions
} from "@/lib/db";
import { verifyPasswordHash, verifyPlainPassword } from "@/lib/password";

function getCookieName(): string {
  return process.env.AUTH_COOKIE_NAME || "steelhead_admin";
}

function getSessionHours(): number {
  const parsed = Number(process.env.ADMIN_SESSION_HOURS || 12);
  if (!Number.isFinite(parsed) || parsed <= 0) return 12;
  return parsed;
}

function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
}

export function verifyAdminPassword(password: string): boolean {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (passwordHash) {
    return verifyPasswordHash(password, passwordHash);
  }

  const plainPassword = process.env.ADMIN_PASSWORD;
  if (plainPassword) {
    return verifyPlainPassword(password, plainPassword);
  }

  return false;
}

export async function createAdminSessionCookie(): Promise<{ value: string; maxAge: number }> {
  const maxAge = getSessionHours() * 60 * 60;
  const token = buildSessionToken();
  const tokenHash = sessionTokenHash(token);

  await pruneExpiredAdminSessions();
  await createAdminSession(tokenHash, maxAge);

  return {
    value: token,
    maxAge
  };
}

export async function invalidateAdminSession(rawCookie: string | undefined): Promise<void> {
  if (!rawCookie) {
    return;
  }

  const tokenHash = sessionTokenHash(rawCookie);
  await deleteAdminSession(tokenHash);
}

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(getCookieName())?.value;

  if (!token) {
    return false;
  }

  await pruneExpiredAdminSessions();
  return isAdminSessionValid(sessionTokenHash(token));
}

export function adminCookieName(): string {
  return getCookieName();
}
