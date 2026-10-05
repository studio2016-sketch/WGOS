-- 048 Scoped WGOS user invitations and first-login provisioning
CREATE TABLE IF NOT EXISTS wgos.user_access_invites(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL,
 display_name text NOT NULL,
 app_role text NOT NULL DEFAULT 'TEAM' CHECK(app_role IN ('TEAM','VIEWER')),
 membership_role text NOT NULL DEFAULT 'BRAND_ADMIN' CHECK(membership_role IN ('BRAND_ADMIN','MANAGER','MEMBER','VIEWER')),
 brand_names jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CLAIMED','REVOKED')),
 invited_by text,
 created_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 claimed_auth_user_id text,
 UNIQUE(lower(email))
);
CREATE INDEX IF NOT EXISTS user_access_invites_email_status_idx ON wgos.user_access_invites(lower(email),status);
