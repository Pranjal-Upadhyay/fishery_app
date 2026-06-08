/**
 * Seed an initial superadmin account.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YourStrongPassword \
 *     npx ts-node src/scripts/seed_admin.ts
 *
 * Defaults (DEV ONLY — do not use in production):
 *   ADMIN_EMAIL    → superadmin@matsyamitra.in
 *   ADMIN_PASSWORD → ChangeMe!2026
 *   ADMIN_NAME     → Default Superadmin
 *
 * Re-running the script with the same email updates the password rather than
 * creating a duplicate.
 */

import bcrypt from 'bcrypt';
import { query, pool } from '../db';

const DEFAULT_EMAIL = 'superadmin@matsyamitra.in';
const DEFAULT_PASSWORD = 'ChangeMe!2026';
const DEFAULT_NAME = 'Default Superadmin';

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  const fullName = process.env.ADMIN_NAME ?? DEFAULT_NAME;

  if (password === DEFAULT_PASSWORD && process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed default password in production. Set ADMIN_PASSWORD.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO admin_users (email, password_hash, full_name, role,
                              assigned_state_codes, assigned_district_codes, assigned_block_codes,
                              is_active)
     VALUES ($1, $2, $3, 'superadmin', ARRAY['BR']::text[], NULL, NULL, TRUE)
     ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name     = EXCLUDED.full_name,
        is_active     = TRUE,
        updated_at    = NOW()`,
    [email, passwordHash, fullName]
  );

  console.log(`✓ Superadmin seeded`);
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password === DEFAULT_PASSWORD ? '(default — please change after first login)' : '(from ADMIN_PASSWORD)'}`);
  console.log(`  role:     superadmin`);
  console.log(`  scope:    state BR, all districts`);

  await pool.end();
}

main().catch((err) => {
  console.error('Failed to seed superadmin:', err);
  process.exit(1);
});
