-- ============================================================================
-- Migration 044: Admin Security Hardening
--
-- Adds account-level lockout state and failed-attempt tracking for the
-- admin dashboard. Complements the existing IP rate limiter:
--   - IP rate limit  → defends against distributed brute-force
--   - Account lockout → defends against a single attacker with rotating IPs
--                        targeting one mailbox
--
-- Lockout policy:
--   - 5 consecutive failed attempts → account locked for 30 minutes
--   - Successful login → counter reset, lockout cleared
--   - Audit entries record every failed attempt with the IP and UA
-- ============================================================================

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS failed_login_count        INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_failed_login_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS must_change_password      BOOLEAN     NOT NULL DEFAULT FALSE;

-- Bump the audit log so it can carry the specific failure reason as a
-- top-level column (queryable without parsing JSON).
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS outcome VARCHAR(20) NOT NULL DEFAULT 'success'
    CHECK (outcome IN ('success', 'failure', 'denied'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_outcome ON admin_audit_log(outcome);
