#!/usr/bin/env node
/**
 * prisma-migrate.mjs
 *
 * Handles the transition from `prisma db push` (no migration history) to
 * `prisma migrate deploy` (migration-tracked). Safe to run on every deploy:
 *
 *  1. For every migration folder EXCEPT the new ones, mark it as "already
 *     applied" so Prisma doesn't try to re-run it.
 *  2. Clear any failed/rolled-back state on the new migrations so a
 *     previously broken deploy attempt doesn't block retries.
 *  3. Run `prisma migrate deploy` — only unapplied migrations execute.
 *
 * `prisma migrate resolve --applied` is idempotent; if a migration is already
 * recorded it prints a notice and exits 0, so re-running this script is safe.
 *
 * Split into two new migrations to avoid PostgreSQL error 55P04
 * ("unsafe_new_enum_value_usage"): ALTER TYPE ADD VALUE and any DML that
 * uses the new values cannot run in the same transaction.
 */

import { execSync }      from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const MIGS_DIR  = join(ROOT, 'prisma', 'migrations');

// Migrations that were NOT previously applied via db push —
// migrate deploy will actually run these.
const NEW_MIGRATIONS = new Set([
  '20260407000000_design_ops_v2_enums',    // adds all enum values
  '20260407_design_ops_v2_full_rebuild',   // DDL + data migration
]);

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

function runSafe(cmd) {
  try {
    run(cmd);
  } catch {
    // Already resolved / table didn't exist yet — non-fatal
    console.log(`  (skipped — already resolved or not applicable)`);
  }
}

// ── Step 1: baseline all pre-existing migrations ──────────────────────────────
const migrations = readdirSync(MIGS_DIR)
  .filter(name => statSync(join(MIGS_DIR, name)).isDirectory())
  .sort();

const toBaseline = migrations.filter(name => !NEW_MIGRATIONS.has(name));
console.log(`\nBaselining ${toBaseline.length} existing migration(s)...`);

for (const name of migrations) {
  if (NEW_MIGRATIONS.has(name)) {
    console.log(`  [skip] ${name}  ← will be run by migrate deploy`);
    continue;
  }
  runSafe(`npx prisma migrate resolve --applied "${name}"`);
}

// ── Step 2: clear any failed state on new migrations ─────────────────────────
// If a previous deploy attempt partially ran a migration and left it in a
// "failed" state, Prisma will block all subsequent deploys until resolved.
// Marking as rolled-back allows migrate deploy to retry cleanly.
for (const name of NEW_MIGRATIONS) {
  console.log(`\nResolving any failed state on ${name}...`);
  runSafe(`npx prisma migrate resolve --rolled-back "${name}"`);
}

// ── Step 3: run all unapplied migrations ──────────────────────────────────────
console.log('\nRunning prisma migrate deploy...');
run('npx prisma migrate deploy');

console.log('\n✔ Migration complete.');
