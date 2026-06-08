-- ============================================================================
-- Migration 043: Admin Users Table
-- Purpose: Separate auth surface for the MatsyaMitra admin dashboard.
-- Kept completely isolated from the farmer/doctor/hatchery users table so a
-- compromised farmer account can never escalate to admin scope.
--
-- Roles:
--   block_officer    — verifies docs in a single block
--   district_officer — district-wide oversight, manages DLC queue
--   dlc_member       — District Level Committee, approves disbursements
--   superadmin       — state-wide; can manage other admins and schemes
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  full_name        VARCHAR(120) NOT NULL,
  role             VARCHAR(40)  NOT NULL CHECK (role IN (
                     'block_officer', 'district_officer', 'dlc_member', 'superadmin'
                   )),

  -- Jurisdiction scoping. NULL on either field means "unrestricted at that level".
  -- A superadmin typically has both NULL. A block officer has both populated.
  assigned_state_codes    TEXT[]  NOT NULL DEFAULT ARRAY['BR']::text[],
  assigned_district_codes TEXT[],
  assigned_block_codes    TEXT[],

  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email   ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role    ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active  ON admin_users(is_active);

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Audit trail for every admin action that mutates state ─────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action          VARCHAR(80) NOT NULL,          -- e.g. 'login', 'scheme.publish', 'app.approve'
  resource_type   VARCHAR(80),                   -- 'scheme' | 'application' | 'doctor' | 'admin_user' ...
  resource_id     UUID,
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action     ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
