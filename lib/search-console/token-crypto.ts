import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "v1";
function encryptionKey(): Buffer {
  const encoded = process.env.WGOS_OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("OAUTH_ENCRYPTION_NOT_CONFIGURED");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("OAUTH_ENCRYPTION_KEY_INVALID");
  return key;
}

/**
 * AES-256-GCM encryption with per-record random IV and entity-bound AAD.
 * Persist ciphertext only; keep key outside source control and database.
 */
export function encryptGoogleToken(token: string, brandId: string): string {
  if (!token || !brandId) throw new Error("TOKEN_CONTEXT_REQUIRED");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from("wgos:gsc:" + brandId));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [PREFIX, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGoogleToken(payload: string, brandId: string): string {
  if (!brandId) throw new Error("TOKEN_CONTEXT_REQUIRED");
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error("TOKEN_FORMAT_INVALID");
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("TOKEN_FORMAT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from("wgos:gsc:" + brandId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]).toString("utf8");
}
