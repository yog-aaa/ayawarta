# Admin A5 Neon schema migration — 2026-10-31

**Status:** applied and verified. This record covers the migration-only operation requested by the owner. It does not record an application deployment or media activation.

## Identity and recovery evidence

- Approved target fingerprint: `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`. The guarded command verified the direct and pooled Neon targets matched this fingerprint and enforced TLS. No connection string or credential was printed.
- Source checkout: clean `main` at `29df6fd1b82e2f22db966ee6359fd84df26ea6b8`; pnpm `10.34.7` was used through a temporary wrapper pointing to the pinned local installation.
- The owner supplied a Neon Console screenshot of AyaWarta Project → default `production` branch → Backup & Restore. It showed one manual snapshot named **`production at 2026-10-31 09:36:15 UTC`**, no expiry, created before migration. The screenshot did not show the opaque snapshot ID or branch endpoint. No restore into a separate branch was rehearsed. Confirm those details in the Neon Console before using the snapshot for an incident recovery.
- Automatic approval review rejected a proposed full local `pg_dump` of production data because the migration authorization did not cover copying customer data and credentials to a local file. No dump was created; the owner used the Neon snapshot path instead.

## Preflight

| Check | Result |
| --- | --- |
| `git status --short` and reviewed HEAD | Clean; exact SHA above. |
| `pnpm.cmd --version` | `10.34.7`. |
| `pnpm prod:migrate` without `--execute` | Safe dry run; no database connection. |
| `pnpm prod:verify --release-state --execute` | `seeded`; guarded approved target. |
| `pnpm prod:baseline --check --execute` | 4 matching, 0 missing. |
| Direct read-only migration ledger/table inspection | Five finished, non-rolled-back migrations; `DraftMediaProvision` absent. |

The A5 SQL only adds enum `DraftMediaState`, table `DraftMediaProvision`, its indexes, foreign keys, constraints, and a trigger on the new table. It does not alter existing invitation columns. The isolated PostgreSQL migration and A6 source checks had passed before this operation. The browser upload/recovery gate remained open; this authorization was for the additive schema migration alone.

## Execution and postcheck

`pnpm.cmd prod:migrate --execute` succeeded against the guarded direct Neon target. It applied the sole pending migration, `20261031060000_add_draft_media_provenance`. No canonical seed was rerun.

| Postcheck | Result |
| --- | --- |
| `pnpm prod:verify --release-state --execute` | `seeded`. |
| `pnpm prod:baseline --check --execute` | 4 matching, 0 missing. |
| Direct read-only ledger/table inspection | Six finished, non-rolled-back migrations, including A5; `DraftMediaProvision` exists with 0 rows. |
| Temporary local Next.js server using the owner's guarded Neon runtime, with `AUTH_TRUST_HOST=true` only in that process | `/`, the four seeded invitation slugs, and `/admin/login` returned 200; anonymous `/admin` returned 307; an unknown slug returned 404. The server on localhost:3107 was then stopped. |

The operation made no Git push, Vercel configuration/deployment, Cloudinary upload/delete, customer invitation publication, or Firestore write. It did not change A5 feature switches. The [activation runbook](../runbooks/admin-a5-production-activation.md) now treats application release and media activation as future separately reviewed operations. The mocked-provider browser gate remains **OPEN** before either activation. Do not restore the snapshot automatically: a restore can discard legitimate writes made after 09:36:15 UTC.
