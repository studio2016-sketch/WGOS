-- 020 Server-side brand membership foundation
CREATE TABLE IF NOT EXISTS wgos.brand_memberships(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_user_id text NOT NULL REFERENCES wgos.app_users(auth_user_id) ON DELETE CASCADE,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 membership_role text NOT NULL DEFAULT 'MEMBER' CHECK(membership_role IN ('BRAND_ADMIN','MANAGER','MEMBER','VIEWER')),
 active boolean NOT NULL DEFAULT true,
 granted_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 UNIQUE(auth_user_id,brand_id)
);
CREATE INDEX IF NOT EXISTS brand_memberships_user_active_idx ON wgos.brand_memberships(auth_user_id,active);
CREATE INDEX IF NOT EXISTS brand_memberships_brand_active_idx ON wgos.brand_memberships(brand_id,active);
