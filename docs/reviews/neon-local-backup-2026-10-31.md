# Neon local backup and restore verification — 2026-10-31

**Status:** encrypted local backup created and successfully restored into disposable PostgreSQL. This is a logical PostgreSQL backup of the AyaWarta database, not a backup of Firestore or Cloudinary objects. No production restore was performed.

## Source and artifact

- Source: approved direct Neon target `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`, validated against matching direct and pooled URLs. The read-only release-state preflight reported `seeded`.
- Preferred backup time: `2026-10-31 11:19:25 UTC` (filename timestamp).
- Preferred encrypted file: `C:\Users\yogaa\Document Local\AYAWARTA\backups\production-neon\ayawarta-neon-20261031T111925124Z-8bcc0b8d.pgdump.dpapi` (outside the Git checkout).
- Encrypted size: 56,294 bytes.
- Encrypted SHA-256: `ad21a094e40f1e00d691dfee4a8ccae3ae3c0e1be4e699f64af595940b474539`.
- Format: `pg_dump` custom archive, encrypted with Windows DPAPI `CurrentUser`. The archive decrypts only with this Windows user's profile; losing that profile can make the local backup unusable. The backup file has no `PGDMP` plaintext header. [Microsoft's DPAPI guidance](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-use-data-protection) describes the user-bound scope; [PostgreSQL's `pg_dump` guide](https://www.postgresql.org/docs/18/app-pgdump.html) describes custom archives and `pg_restore`.

The [backup script](../../scripts/production/backup-local.ps1) defaults to a no-connection dry run. `-Preflight` checks the production target without a connection; `-Execute` streams the archive through memory, protects it with DPAPI, verifies decryption, and only then writes the encrypted file. It clears inherited libpq `PG*` variables, selects the pinned ISRG Root X1 certificate from the Windows trust store, and uses `verify-full` plus channel binding for the direct Neon connection. The script does not implement production restore.

An earlier encrypted artifact, `ayawarta-neon-20261031T111135Z.pgdump.dpapi` (SHA-256 `d024c4b985b9226bdfe5483f61fbdbaebf349770c1dc15ad1f2ff97bb90d7902`), remains in the same folder. It was taken with `sslmode=require` and is superseded by the preferred verified-TLS artifact above.

## Restore and transaction evidence

An empty local PostgreSQL 18.2 cluster at `127.0.0.1:55436` was verified by its `data_directory`. The encrypted archive was decrypted in memory and passed through stdin to `pg_restore --exit-on-error --single-transaction --no-owner --no-privileges` into a new local `ayawarta_restore` database. Restore passed. The result contained 6 finished migrations, 1 admin, 4 invitations, 31 media metadata rows, 4 publication snapshots, and 0 draft-media provisions.

The preferred verified-TLS artifact was independently restored to a second disposable local cluster at `127.0.0.1:55437`; it produced the same 6/1/4/31/4 migration/admin/invitation/media/publication counts. That cluster was stopped, verified nonresponsive, had 51,253,224 bytes of files overwritten, and was removed. The encrypted file hash was checked again after the restore.

An update of one invitation's variant was visible inside a local transaction and absent after `ROLLBACK` (1 then 0 matching rows). A clone of the restored database was used for the opt-in A7 route/action/database integration with memory-only Cloudinary; it passed upload retry, recovery, and first publication. The untouched restore still had 4 invitations, and the clone had 5 after the synthetic publication. No test request wrote to Neon or called Cloudinary's upload/admin API.

The disposable cluster was stopped, verified nonresponsive, its 77,734,829 bytes of files were overwritten, and the directory was removed. The encrypted backup file remains in the path above.

## Incident during backup preparation

An initial command used `pg_dump --file=-`, which this client interpreted as a literal file named `-`. It briefly wrote a 56,076-byte plaintext archive in the Git checkout. The file was identified immediately, overwritten with random bytes, removed, and confirmed absent; the script now omits `--file` and a separate synthetic database test proved custom-format stdout begins with `PGDMP` and creates no literal dash file. Overwriting and deletion reduce exposure but cannot guarantee forensic erasure on every storage device. No plaintext archive remains in the worktree.

The first two backup attempts failed before writing an archive because this Windows `pg_dump` installation could not locate a usable CA for `verify-full`, including with `PGSSLROOTCERT=system`. The first completed encrypted backup used `sslmode=require` (the approved Neon URL's mode) and required channel binding; `require` encrypts but does not provide libpq's `verify-full` hostname/certificate verification. The script was then hardened to export the pinned ISRG Root X1 public certificate to a temporary PEM file and require `verify-full`. A new live dump and full local restore of that preferred artifact both passed. [PostgreSQL's SSL documentation](https://www.postgresql.org/docs/18/libpq-ssl.html) explains these modes; [ISRG's certificate audit](https://letsencrypt.org/audits/ISRG-2019-WebTrust-for-CAs-Report.pdf) records the pinned SHA-256 fingerprint.

## Recovery boundary

Do not automatically replace production with this archive after launch or when a schema migration fails. It is a point-in-time logical copy; restoring it over a later production state would discard later customer writes. First preserve the current state, rehearse in a separate branch or database, compare changes, and make a separately reviewed incident decision. [Neon's Backup & restore guide](https://neon.com/docs/guides/backup-restore) supports preview and separate recovery paths. The existing Neon manual snapshot at `2026-10-31 09:36:15 UTC` predates the A5 migration and is not a replacement for this newer local copy.

The A5 isolated **browser** upload/recovery gate remains open. The local A7 integration exercises route and action functions, not a complete browser session.
