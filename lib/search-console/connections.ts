import "server-only";
import { db } from "../db";
import { encryptGoogleToken, decryptGoogleToken } from "./token-crypto";
import { canManageBrand } from "../authz";

/**
 * Requires migration: wgos.gsc_connections(
 * brand_id uuid primary key references wgos.brands(id),
 * property_url text not null,
 * refresh_token_ciphertext text not null,
 * connected_by text not null,
 * updated_at timestamptz not null default now()
 * ).
 * This module never creates schema implicitly.
 */
export async function saveSearchConsoleConnection(input: {
  identity: any; brandId: string; propertyUrl: string; refreshToken: string;
}) {
  if (!await canManageBrand(input.identity, input.brandId)) throw new Error("BRAND_ADMIN_REQUIRED");
  if (!input.refreshToken || !input.propertyUrl) throw new Error("CONNECTION_FIELDS_REQUIRED");
  const encrypted = encryptGoogleToken(input.refreshToken, input.brandId);
  const sql = db();
  await sql`INSERT INTO wgos.gsc_connections
    (brand_id, property_url, refresh_token_ciphertext, connected_by, updated_at)
    VALUES (${input.brandId}::uuid, ${input.propertyUrl}, ${encrypted}, ${String(input.identity.auth_user_id)}, now())
    ON CONFLICT (brand_id) DO UPDATE SET
    property_url=EXCLUDED.property_url,
    refresh_token_ciphertext=EXCLUDED.refresh_token_ciphertext,
    connected_by=EXCLUDED.connected_by,
    updated_at=now()`;
}

export async function getSearchConsoleConnection(input: { identity: any; brandId: string }) {
  if (!await canManageBrand(input.identity, input.brandId)) throw new Error("BRAND_ADMIN_REQUIRED");
  const sql = db();
  const rows = await sql`SELECT property_url, refresh_token_ciphertext
    FROM wgos.gsc_connections WHERE brand_id=${input.brandId}::uuid LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    propertyUrl: String(row.property_url),
    refreshToken: decryptGoogleToken(String(row.refresh_token_ciphertext), input.brandId),
  };
}

export async function disconnectSearchConsole(input: { identity: any; brandId: string }) {
  if (!await canManageBrand(input.identity, input.brandId)) throw new Error("BRAND_ADMIN_REQUIRED");
  const sql = db();
  await sql`DELETE FROM wgos.gsc_connections WHERE brand_id=${input.brandId}::uuid`;
}
