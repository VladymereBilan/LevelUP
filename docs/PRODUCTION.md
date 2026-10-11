# Production

**The hosted Supabase project is production.** `levelup-dev` (ref `vxtxwqdsickveyjvgcyu`, region
`ap-northeast-1`) is not a dev/test sandbox — it's what the live `apps/web` deployment and the
EAS production build actually talk to. Local development and every automated test suite run
against a local Supabase instead (`npx supabase start`, from `packages/db`) — see
`packages/db/README.md`'s "Production safety" section for the two guards (test-suite host check,
CLI script confirmation flag) that enforce this.

## Environments

| Environment | apps/web | apps/mobile | Supabase |
|---|---|---|---|
| **Production** | Vercel Production deployment (`https://web-nine-chi-48.vercel.app`, aliased from `main`) | EAS `production` build profile (`eas.json`), store-distributed app bundle | the hosted project above |
| **Local dev** | `pnpm dev` (`apps/web`), `http://localhost:3000` | `pnpm dev` (`apps/mobile`), EAS `development` build profile | local Supabase (`npx supabase start`) |

There is no separate staging Supabase project today — a build pointed at anything other than
local or the hosted project isn't a supported configuration.

## Environment variables

### Vercel (apps/web) — Production environment

Set in the Vercel dashboard: Project → Settings → Environment Variables → add for the
**Production** environment specifically (not Preview/Development, which should point at local
or a throwaway project if you ever need them — not covered here since none exists yet).

| Variable | Used for |
|---|---|
| `SUPABASE_URL` | `createServiceRoleClient()` — every server route |
| `SUPABASE_SERVICE_ROLE_KEY` | same — bypasses RLS, server-only, never shipped to a client bundle |

(`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` exist in `.env.example` as
placeholders for a possible future client-side Supabase usage in `apps/web` — nothing in the
current codebase reads them.)

### EAS (apps/mobile) — `production` environment

`eas.json`'s `production` build profile sets `"environment": "production"`, so an
EAS-hosted Environment Variable scoped to that environment is injected automatically — nothing
is written to `eas.json` itself beyond that scope link. Register the values once (never as
literal text in this repo):

```bash
cd apps/mobile
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value <hosted project URL> --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <hosted project anon key> --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://web-nine-chi-48.vercel.app --visibility plaintext
```

(`eas env:create` without `--value` prompts interactively instead, if you'd rather not have the
value pass through shell history.) Confirm what's registered with `eas env:list --environment
production` — it shows names only, never values, from any machine.

## Service-role key rotation

The `SUPABASE_SERVICE_ROLE_KEY` (Vercel Production) bypasses RLS entirely — rotate it
immediately if it's ever exposed (committed, logged, pasted somewhere public), and periodically
as routine hygiene.

1. Supabase dashboard → the project → Project Settings → API → generate/roll the
   `service_role` key. **This invalidates the old key immediately** — production writes will
   fail until step 2 is done.
2. Vercel dashboard → Project → Settings → Environment Variables → update
   `SUPABASE_SERVICE_ROLE_KEY` (Production environment) with the new value → redeploy (Vercel
   doesn't hot-reload env vars into a running deployment).
3. If any CLI script was ever run against production with the old key cached in a local shell
   session, clear that session's environment too.
4. Verify: the no-token curl check still returns the app's own 401 JSON (confirms the deployment
   picked up the new key and is serving normally):
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     https://web-nine-chi-48.vercel.app/api/quests/00000000-0000-0000-0000-000000000000/complete
   # expect 401
   ```

The `anon` key is not a rotation concern the same way — it's meant to be public (shipped in the
mobile app and the web client bundle) and RLS is what actually protects data behind it.

## Backups

`.github/workflows/backup.yml` runs a GPG-encrypted `pg_dump` weekly, uploaded as a private
GitHub Actions artifact (90-day retention). One-time setup, as two repository secrets (repo →
Settings → Secrets and variables → Actions → New repository secret):

- `PROD_DATABASE_URL` — Supabase dashboard → the project → Project Settings → Database →
  Connection string → "URI" (the direct, non-pooled connection), password filled in.
- `BACKUP_GPG_PASSPHRASE` — any strong passphrase; store it somewhere durable outside GitHub
  too (a password manager) — losing it makes every existing backup unrecoverable.

### Restoring from a backup

`pg_restore`, like `pg_dump`, refuses to run against a server newer than itself — use a
`pg_restore` whose major version is **equal to or newer than** the target database's Postgres
version (check with `psql "<target connection string>" -Atc "show server_version_num;"`, divide
by 10000 for the major version). The backup workflow installs its matching `pg_dump` from the
official PGDG apt repo at runtime (see `.github/workflows/backup.yml`) for the same reason — the
default version `apt`/your OS ships is not guaranteed to be new enough.

```bash
# 1. Download the artifact (GitHub Actions run → that backup's artifact) to backup.dump.gpg
# 2. Decrypt:
gpg --batch --yes --decrypt --passphrase "<BACKUP_GPG_PASSPHRASE>" \
  --output backup.dump backup.dump.gpg
# 3. Restore into a target database (NEVER the live production project for a routine test —
#    see the checklist below; the local Supabase instance from `npx supabase start`, packages/db,
#    is the normal target — its bundled Postgres is already version-matched to production):
pg_restore --no-owner --no-privileges --clean --if-exists \
  --dbname "<target connection string>" backup.dump
```

### Restore-test checklist

Do this periodically (e.g. quarterly) against a **local Supabase instance**, never against
production directly, to confirm backups are actually restorable before you ever need one for
real. `packages/db/scripts/restore-test.ps1` (Windows) automates all of the steps above —
decrypt, start the local instance if needed, restore into a throwaway scratch database, print
row counts, clean up:

```powershell
# from the repo root, with a downloaded backup-*.dump.gpg artifact:
packages\db\scripts\restore-test.ps1 -BackupPath C:\path\to\backup-20260101-070000.dump.gpg
```

It prompts for the GPG passphrase interactively (never as an argument, never logged), refuses to
run against anything but the local Supabase instance (mirroring
`packages/db/src/host.ts`'s `isLocalSupabaseHost`), restores using the `pg_restore` *inside* the
local Supabase Postgres container (so the version always matches — see the backup workflow's own
version-matching fix for why that matters), and drops the scratch database afterward unless
`-KeepDatabase` is passed. It needs Git for Windows on `PATH` (for a working `gpg` — see the
script's own comments for why `gpg.exe` is invoked through `bash.exe` rather than directly) and
Docker Desktop running.

- [ ] Download the most recent backup artifact
- [ ] Run `restore-test.ps1 -BackupPath <downloaded file>` — note the printed row counts
- [ ] Row counts look plausible for what the backup was taken from (the script already refuses
      to report success if any of `profiles`/`quests`/`xp_events`/`titles`/`challenges` couldn't
      be counted after restore — a backup that doesn't actually restore is worse than no backup,
      because it creates false confidence)
- [ ] Record the date and result somewhere durable (this doc's revision history, or an issue)

On a non-Windows machine, or to inspect the restored data further (`-KeepDatabase`), do it by
hand per "Restoring from a backup" above, then `npx supabase db diff` (or spot-check key tables)
to confirm the schema matches what's expected.

## Go-live checklist

- [ ] All migrations in `packages/db/supabase/migrations/` applied: `npx supabase db push
      --dry-run` from `packages/db` shows nothing pending
- [ ] Production safety guards verified: `pnpm test` from the repo root with `SUPABASE_URL`
      unset skips the real-DB suites cleanly (no `.env.local` pointed at the hosted project by
      accident)
- [ ] Vercel Production environment variables set (see above), deployment Ready
- [ ] Live checks: `/privacy` and `/terms` return 200; the no-token curl check on
      `/api/quests/[id]/complete` returns the app's own 401 JSON
- [ ] `.github/workflows/keep-alive.yml` and `backup.yml` both present, both have required
      secrets set (keep-alive needs none; backup needs `PROD_DATABASE_URL` and
      `BACKUP_GPG_PASSPHRASE`)
- [ ] EAS `production` profile builds successfully (`eas build --profile production --platform
      android`) with `EXPO_PUBLIC_*` registered via `eas env:create --environment production`
- [ ] Read-only production audit (row counts, test-data scan, RLS/privilege check — see
      `packages/db/README.md`'s "Production safety" and this session's own audit) shows no
      leftover test pollution

## Incident checklist

### The hosted project got paused (free-tier inactivity, or manually)

1. Supabase dashboard → the project → it shows a "paused" banner with a **Restore** button —
   click it. A paused free-tier project's data isn't deleted, just inaccessible until restored.
2. Restore takes a few minutes. `apps/web`'s routes will 500 until it's back — nothing to do on
   the app side, just wait.
3. Once restored, run the no-token curl check (above) to confirm it's serving again.
4. If this keeps happening, confirm `.github/workflows/keep-alive.yml` is actually running on
   schedule (repo → Actions tab → "Keep-alive" workflow → check recent runs) — a disabled or
   failing keep-alive is the most likely cause of repeat pauses.

### A bad deploy reached production

1. Vercel dashboard → the project → Deployments → find the last known-good deployment → "..."
   menu → **Promote to Production** (instant, no rebuild — Vercel keeps prior deployments
   around).
2. If the bad deploy included a migration that's already been pushed to the hosted database and
   that migration is the actual problem (not just app code), reverting the Vercel deployment
   does **not** revert the schema — assess whether the migration itself needs a follow-up
   migration to undo it (never hand-edit the hosted schema outside a migration file).
3. Re-run the live checks (privacy/terms 200, no-token 401) against the restored deployment to
   confirm it's actually serving correctly, not just that Vercel says "Ready".
