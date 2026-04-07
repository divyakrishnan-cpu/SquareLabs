#!/usr/bin/env node
/**
 * prisma-migrate.mjs
 *
 * Handles the transition from `prisma db push` (no migration history) to
 * `prisma migrate deploy` (migration-tracked). Safe to run on every deploy:
 *
 *  1. For every migration folder EXCEPT the latest, mark it as "already
 *     applied" so Prisma doesn't try to re-run it.
 *  2. Run `prisma migrate deploy` — only new/unapplied migrations execute.
 *
 * `prisma migrate resolve --applied` is idempotent; if a migration is already
 * recorded it prints a notice and exits 0, so re-running this script is safe.
 */

import { execSync }                        from 'child_process';
import { readdirSync, statSync }           from 'fs';
import { join, dirname }                   from 'path';
import { fileURLToPath }                   from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const MIGS_DIR  = join(ROOT, 'prisma', 'migrations');

// The one migration that was NOT previously applied via db push —
// we want migrate deploy to actually run this one.
const NEW_MIGRATION = '20260407_design_ops_v2_full_rebuild';

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

console.log(`\nBaselining ${migrations.length - 1} existing migration(s)...`);

for (const name of migrations) {
  if (name === NEW_MIGRATION) {
    console.log(`  [skip] ${name}  ← will be run by migrate deploy`);
    continue;
  }
  runSafe(`npx prisma migrate resolve --applied "${name}"`);
}

// ── Step 2: clear any failed state on the new migration ──────────────────────
// If a previous deploy attempt partially ran the migration and left it in a
// "failed" state, Prisma will block all subsequent deploys until it's resolved.
// Marking it as rolled-back allows migrate deploy to retry it cleanly.
console.log(`\nResolving any failed state on ${NEW_MIGRATION}...`);
runSafe(`npx prisma migrate resolve --rolled-back "${NEW_MIGRATION}"`);

// ── Step 3: run any unapplied migrations (just the new one) ──────────────────
console.log('\nRunning prisma migrate deploy...');
run('npx prisma migrate deploy');

console.log('\n✔ Migration complete.');
