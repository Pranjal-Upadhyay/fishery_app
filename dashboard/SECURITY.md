# MatsyaMitra Dashboard — Security Posture

Living document. Updated when controls change. Targets **government of India digital service** security expectations: CERT-In advisories, MeitY auditor guidance, NIC dashboard checklist.

---

## Threat model (in scope)

| Threat                                      | Control                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Credential stuffing / brute force           | IP rate limit (20/15min) + per-account lockout (5 fails → 30 min lock)    |
| Account enumeration                         | Identical error message + flat timing for unknown email vs. wrong pw      |
| Stolen JWT replay                           | 8h token TTL + 30-min idle auto-logout + dedicated `ADMIN_JWT_SECRET`     |
| Privilege escalation from farmer auth       | Separate JWT secret; farmer tokens cannot sign admin claims               |
| Session hijack via XSS                      | Strict CSP, helmet, input sanitisation; no `dangerouslySetInnerHTML` user data |
| CSRF on admin POSTs                         | Token in `Authorization` header (not cookie) → CSRF not exploitable       |
| Password disclosure over shoulder           | Show/hide toggle auto-reverts on blur                                     |
| Tabnabbing                                  | `rel="noopener noreferrer"` enforced (no external links currently)        |
| SQL injection                               | Parameterised queries only; Zod validation on request bodies              |
| Data exfiltration via clipboard / screenshot | Out of band — defended by organisational policy (logged via audit trail) |
| Unauthorised admin creation                 | No self-service signup; new admins created by superadmin only             |

## Threat model (deferred / external)

| Threat                                | Mitigation owner                            |
| ------------------------------------- | ------------------------------------------- |
| Network MITM                          | TLS termination at load balancer + HSTS     |
| Server compromise / DB exfiltration   | Hosting layer (encrypted volumes, IAM)      |
| Insider abuse                         | Audit log + retention policy + reviews      |
| Compromised admin device              | MDM (BYOD policy)                           |
| Data residency (India localisation)   | Hosting region selection                    |

---

## Authentication

- **Algorithm:** bcrypt(cost=12) for password hashing.
- **Secrets:** `ADMIN_JWT_SECRET` must be ≥32 random bytes in production. Distinct from `JWT_SECRET` (farmer auth) so a leak in one realm can't forge tokens in the other.
- **Token lifetime:** 8 hours, signed with `iss=matsyamitra-admin`.
- **Idle auto-logout:** 30 minutes of no user input forces logout.
- **Lockout:** 5 consecutive failed password attempts → account locked for 30 minutes. Successful login clears the counter.
- **Rate limit (per IP):** 20 admin login attempts per 15 minutes. Successful logins do not count toward the cap.

## Authorisation

- **Roles:** `block_officer | district_officer | dlc_member | superadmin`.
- **Jurisdiction:** every admin has `assigned_state_codes / district_codes / block_codes`. Backend route handlers must filter data by jurisdiction (enforced in L3).
- **No public signup.** New admins are created only by a superadmin via the dashboard.

## Audit trail

Every authentication event is recorded in `admin_audit_log` with:

- `admin_user_id` (null for unknown email)
- `action`, `outcome` (`success | failure | denied`)
- `metadata` (failure reason, lock state)
- `ip_address`, `user_agent`

The audit log is **append-only by policy** — no `DELETE` or `UPDATE` queries exist anywhere in the codebase. Retention is enforced at the database level.

## Transport & headers (backend)

- HTTPS enforcement in production via `enforceHttps` middleware (302 redirect from http://).
- `helmet` with a strict CSP:
  - `default-src 'self'`
  - `script-src 'self'`
  - `connect-src 'self'`
- HSTS headers (helmet default).
- `Referrer-Policy: no-referrer`.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- CORS allowlist; no wildcards in production.

## Frontend

- **Token storage:** `localStorage` keyed `matsyamitra.admin.token`. Cleared on logout, 401 responses, and idle expiry. *Tradeoff:* localStorage is vulnerable to XSS but immune to CSRF; combined with a strict CSP this is the standard pattern. Migration to `HttpOnly` cookies + CSRF tokens is on the roadmap if MeitY review requires it.
- **No password caching:** password fields explicitly disable `autocorrect`, `autocapitalize`, `spellcheck`. `autoComplete="current-password"` is preserved for password managers.
- **Show/hide password:** purely client-side state; auto-reverts to obscured on blur.
- **Generic error messages:** the UI shows `Invalid email or password` regardless of which field failed. Specific reasons live only in the audit log.

## Password policy

| Rule                                | Status                       |
| ----------------------------------- | ---------------------------- |
| Minimum 12 characters               | Enforced on creation (L3)    |
| At least 1 letter and 1 digit       | Enforced on creation (L3)    |
| Disallow last 3 passwords           | L3                           |
| Force change after 90 days          | L3                           |
| Bootstrap superadmin must rotate    | `must_change_password` flag  |

L3 = will be added when the "Manage Admins" page lands.

## Operational checklist for deployment

Before going live:

1. [ ] Set `ADMIN_JWT_SECRET` to a cryptographically random 32+ byte value.
2. [ ] Set `JWT_SECRET` (for farmer auth) to a different random value.
3. [ ] Set `ALLOWED_ORIGINS` to the production dashboard URL only.
4. [ ] Rotate the seeded superadmin password.
5. [ ] Confirm `NODE_ENV=production` is set on the backend container.
6. [ ] Verify HTTPS redirect works (`curl -I http://api.your-domain` → 301/302).
7. [ ] Verify CSP headers present (`curl -I https://api.your-domain/health`).
8. [ ] Run `docker exec fishing-god-postgres pg_dump --schema-only` and confirm no PII columns are missing from the audit log retention policy.
9. [ ] Configure off-host log forwarding (CloudWatch / Loki / etc.) so audit trail survives container restart.
10. [ ] Schedule the database backup job.

## Reporting a vulnerability

Email `security@matsyamitra.in` (or successor address). Do not file a public GitHub issue. Coordinated disclosure window: 90 days.
