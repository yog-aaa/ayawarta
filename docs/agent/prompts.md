# Copy-Ready Prompts for the AyaWarta Programmer Agent

## How to Use

1. Send exactly one stage prompt to Antigravity.
2. Let the programmer modify the shared repository and return its handoff.
3. Do not ask it to continue automatically.
4. Send the handoff and current diff to the planning/review agent.
5. If changes are required, use the correction prompt.
6. When the review is accepted, use the finalize-and-commit prompt.
7. Only then send the next stage prompt.

The stage implementation prompts intentionally tell the programmer not to commit. This keeps the diff easy to correct before acceptance.

## Stage 0 — Baseline Audit

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 0 — Baseline Audit.

Sebelum bekerja, baca sampai selesai:
- AGENTS.md
- docs/agent/index.md
- docs/architecture.md
- docs/design.md
- docs/database-schema.md
- docs/media-migration.md
- docs/authentication.md
- docs/deployment.md
- docs/qa-checklist.md
- docs/agent-workflow.md
- docs/agent/skills.md
- docs/superpowers/specs/2026-10-21-ayawarta-refactor-cloudinary-prisma-design.md
- docs/superpowers/plans/2026-10-21-ayawarta-refactor-cloudinary-prisma-plan.md

Tugas:
1. Periksa status Git dan jangan mengubah kode produk.
2. Catat versi runtime, framework, package manager, dan dependency utama.
3. Jalankan baseline build, lint, serta type-check jika script tersedia. Bedakan kegagalan yang sudah ada dari regresi baru.
4. Inventarisasi route publik, sumber data, batas Server/Client Component, dan integrasi eksternal.
5. Hitung file dan total ukuran media dinamis lokal di public/images/SAMPLE dan public/images/dummy-couples.
6. Buat daftar referensi source untuk path media lokal dan URL Cloudinary lama.
7. Periksa hanya nama key di .env.local; jangan pernah mencetak nilainya.
8. Laporkan risiko awal yang dapat memengaruhi tahap berikutnya.
9. Inventarisasi skill yang tersedia di Antigravity dan cocokkan dengan docs/agent/skills.md; jangan menjalankan skill implementasi pada tahap read-only ini.

Batasan:
- Read-only: jangan edit, install dependency, migrate database, upload file, mengubah .env.local, atau commit.
- Jangan mengerjakan Stage 1.
- Jika sebuah command gagal karena lingkungan, laporkan command, error ringkas, dan alternatif diagnosis yang aman.

Akhiri dengan format handoff wajib dari AGENTS.md, gunakan status "ready for review" atau "blocked", lalu berhenti.
```

## Stage 1 — Tooling and Environment Contract

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 1 — Tooling and Environment Contract. Stage 0 telah diterima.

Baca semua dokumen wajib di AGENTS.md, terutama implementation plan Phase 1, docs/architecture.md, docs/deployment.md, dan .env.example.

Tugas:
1. Konfirmasi worktree sesuai hasil review Stage 0.
2. Gunakan pnpm sebagai satu-satunya package manager, pin versi yang disetujui di `package.json#packageManager`, dan jadikan `pnpm-lock.yaml` satu-satunya lockfile.
3. Pilih dependency stabil yang kompatibel dengan runtime aktual Node 24.15.0, Next.js 16, React 19, Vercel, dan PostgreSQL untuk Prisma, Auth.js, Cloudinary, Zod, password hashing, serta Vitest. Gunakan dokumentasi resmi dan laporkan alasan pemilihan major version.
4. Perbaiki script lint yang tidak kompatibel dengan Next.js 16.
5. Tambahkan script typecheck, test, Prisma generate/validate/migrate/seed/studio, media dry-run/migrate/verify, dan admin bootstrap sesuai rencana.
6. Siapkan prisma.config.ts dan environment validation scaffolding, tetapi jangan membuat model aplikasi atau menjalankan migration.
7. Pastikan .env.example hanya berisi placeholder aman.
8. Jika perlu mengganti nama key di .env.local, jangan tampilkan nilai apa pun. Jangan mengubah nilai credential.
9. Install dependency dan jalankan pemeriksaan yang relevan untuk tahap ini.

Batasan:
- Jangan membuat schema model aplikasi, migrate database, seed data, upload Cloudinary, atau mengubah route/UI.
- Jangan commit. Berhenti setelah handoff untuk review.
- Jelaskan alasan kompatibilitas versi dependency yang dipilih.

Akhiri dengan format handoff wajib AGENTS.md dan sertakan ringkasan diff serta hasil install/validation.
```

## Stage 2 — Prisma Schema and Local Migration

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 2 — Prisma Schema and Local Migration. Stage 1 telah diterima.

Baca semua dokumen wajib di AGENTS.md, khususnya docs/database-schema.md dan implementation plan Phase 2.

Tugas:
1. Implementasikan schema Prisma persis sesuai kontrak database.
2. Tambahkan enum, relasi, unique constraint, index, timestamp, dan delete behavior yang aman, termasuk relasi wajib `Invitation.heroAssetId` ke `MediaAsset` dengan `onDelete: Restrict`.
3. Buat Prisma Client singleton server-only dan environment access yang tidak dapat masuk client bundle.
4. Validasi koneksi hanya ke PostgreSQL Laragon lokal database ayawarta.
5. Buat dan terapkan migration development bernama jelas ke database lokal saja.
6. Jalankan Prisma format, validate, generate, dan query koneksi minimal.
7. Pastikan migration tidak menghapus atau mereset schema/data yang tidak terkait tanpa persetujuan.

Batasan:
- Jangan seed invitation/admin.
- Jangan menyentuh Aiven, Vercel, Cloudinary, route publik, autentikasi, atau UI.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib menyertakan ringkasan model/constraint, nama migration, bukti database lokal yang dituju, dan hasil semua pemeriksaan.
```

## Stage 2A — Required Hero Media Relation Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya koreksi Stage 2A — Required Hero Media Relation. Stage 2 telah dikomit, tetapi review lintas tahap menemukan bahwa contract UI `couple.heroImage` belum memiliki relasi persistence eksplisit.

Baca AGENTS.md, docs/database-schema.md, docs/architecture.md, docs/media-migration.md, implementation plan Phase 2/3/5/6, dan review Stage 2.

Tugas:
1. Verifikasi secara read-only bahwa tabel `Invitation` lokal masih berisi 0 row; jika tidak, STOP dan minta rencana backfill/migration yang direview. Jangan menambah kolom wajib secara langsung.
2. Tambahkan `Invitation.heroAssetId` sebagai relasi wajib ke `MediaAsset`.
3. Beri nama eksplisit pada kedua pasangan relasi `Invitation` ↔ `MediaAsset` agar Prisma tidak ambigu: gunakan misalnya `InvitationHeroAsset` untuk hero dan `InvitationMusicAsset` untuk relasi musik yang sudah ada, termasuk reverse relation masing-masing pada `MediaAsset`. Perubahan nama relasi musik hanya metadata Prisma dan tidak boleh mengubah kolom/foreign key SQL yang sudah ada.
4. Gunakan `onDelete: Restrict` dan index pada `heroAssetId`.
5. Jangan menggunakan gallery pertama sebagai hero dan jangan menambah model media generik baru.
6. Buat migration forward-only baru tanpa mengubah dua migration yang sudah diterapkan. SQL harus menambah kolom wajib, index, dan foreign key hero tanpa drop/reset.
7. Terapkan migration hanya ke PostgreSQL Laragon lokal `ayawarta`, yang masih belum memiliki seed.
8. Regenerate Prisma Client dan perbarui integration test agar memverifikasi delegate/query tetap sehat tanpa menulis data.

Batasan:
- Jangan seed media/invitation/admin.
- Jangan mengubah route, mapper, hard-coded data, UI, Cloudinary, Firestore, Aiven, atau Vercel.
- Jangan reset/drop database dan jangan mengedit migration lama.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib menyertakan preflight count `Invitation` tanpa data row, nama migration baru, SQL inspection, bukti target database lokal, hasil migration status/test/typecheck/lint/build, dan konfirmasi database tetap tanpa seed.
```

## Stage 2B — Gallery Video Persistence Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 2B — Gallery Video Persistence Correction. Stage 2A telah diterima dan dikomit, tetapi audit contract UI menemukan `InvitationData.gallery.videoUrl` belum memiliki sumber persistence.

Baca AGENTS.md, docs/database-schema.md, docs/architecture.md, implementation plan Phase 2/3/6, dan docs/reviews/stage-02b-gallery-video-contract.md.

Tugas:
1. Verifikasi target database hanya PostgreSQL Laragon lokal `localhost:5432/ayawarta` tanpa mencetak credential atau URL mentah.
2. Tambahkan scalar nullable `galleryVideoUrl String?` pada model `Invitation`.
3. Jangan membuat relasi `MediaAsset`: field ini menyimpan external gallery-video embed URL, bukan upload Cloudinary.
4. Buat migration forward-only keempat bernama jelas tanpa mengubah tiga migration sebelumnya. SQL hanya boleh menambahkan kolom nullable `galleryVideoUrl`; jangan melakukan backfill atau data mutation.
5. Terapkan migration hanya ke database lokal `ayawarta`.
6. Regenerate Prisma Client.
7. Tambahkan atau sesuaikan integration test read-only agar field `galleryVideoUrl` terkompilasi dan queryable tanpa menulis data.
8. Verifikasi source `default-preview` tetap memiliki URL video yang sama; jangan memindahkan atau mengubah hard-coded content pada stage ini.

Batasan:
- Jangan seed data.
- Jangan mengubah domain type, repository, mapper, route, UI, Cloudinary, Firestore, auth, Aiven, atau Vercel.
- Jangan reset/drop database dan jangan mengedit migration lama.
- Jangan mengubah `.env.local`; perubahan `pnpm-lock.yaml` hanya diizinkan dalam stage tooling yang secara eksplisit ditugaskan.
- Jangan commit. Berhenti setelah handoff untuk review.
- Gunakan `cmd.exe /c` atau `pnpm.cmd` untuk pnpm/Prisma di Windows.

Handoff wajib menyertakan target database aman, nama dan SQL migration, bukti tiga migration lama tidak berubah, hasil Prisma validate/generate/migrate status, unit test, integration test, typecheck, lint, build, serta konfirmasi tidak ada seed atau external effect.
```

## Stage 1B — pnpm Tooling Contract Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 1B — pnpm Tooling Contract Correction. Pemilik mengonfirmasi Vercel menggunakan pnpm, sedangkan Stage 1 sebelumnya memperbarui package-lock.json dan meninggalkan pnpm-lock.yaml dalam keadaan stale.

Baca AGENTS.md, docs/deployment.md, implementation plan Phase 1, dan docs/reviews/stage-01b-pnpm-tooling-contract.md.

Tugas:
1. Catat versi Node dan pnpm yang tersedia tanpa mengubah global tooling.
2. Tambahkan `"packageManager": "pnpm@10.34.7"` pada root package.json tanpa mengubah dependency ranges, scripts, atau metadata lain.
3. Regenerate `pnpm-lock.yaml` menggunakan pnpm 10.34.7 dari package.json saat ini.
4. Hapus tracked `package-lock.json` agar repository hanya memiliki satu lockfile.
5. Verifikasi lockfile baru memuat seluruh dependency root saat ini, termasuk Prisma/adapter-pg, Auth.js, Cloudinary, bcryptjs, server-only, Zod, Vitest, dan tsx.
6. Jalankan `pnpm install --frozen-lockfile` untuk membuktikan reproducibility.
7. Jalankan seluruh script proyek dengan pnpm, termasuk Prisma validate/generate, unit test, live local DB integration test, typecheck, lint, dan build.
8. Scan repository aktif agar instruksi operasional tidak lagi memerintahkan npm; review history boleh tetap mencatat command historis.

Batasan:
- Jangan mengubah versi/range dependency atau script package.json.
- Jangan mengubah product code, Prisma schema/migration, generated Prisma output selain bila generate menghasilkan byte-identical content, data, route, UI, atau environment file.
- Jangan menjalankan seed atau migration baru.
- Jangan menyentuh Cloudinary, Firestore, Auth.js runtime, Aiven, atau Vercel dashboard.
- Jangan menginstal package baru di luar dependency manifest yang sudah disetujui.
- Jangan commit. Berhenti setelah handoff untuk review.
- Di Windows gunakan `cmd.exe /c` atau executable `.cmd` yang sesuai.

Handoff wajib menyertakan package-manager version, package.json diff, lockfile replacement summary, dependency equivalence, frozen-install result, semua verification, dan konfirmasi hanya filesystem dependency layout lokal yang berubah di luar tracked files.
```

## Stage 3 — Invitation Domain, Repository, and Mapper

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 3 — Invitation Domain, Repository, and Mapper. Stage 1B telah diterima dan dikomit. Gunakan pnpm untuk seluruh command.

Baca semua dokumen wajib di AGENTS.md, khususnya docs/architecture.md, docs/database-schema.md, dan implementation plan Phase 3.

Tugas:
1. Ekstrak `InvitationData`, `InvitationMeta`, dan wrapper invitation menjadi explicit domain types yang stabil; jangan lagi menurunkan tipe dari `typeof invitationData`.
2. Perbarui hanya type imports/annotations yang diperlukan agar dummy dan hard-coded production data memakai domain contract baru tanpa mengubah nilai konten atau JSX/CSS.
3. Buat query args/payload Prisma yang typed dan reusable untuk memuat sections, partner berdasarkan role, event/gallery/love-story/gift terurut `position ASC`, hero asset wajib, serta music asset opsional.
4. Buat repository server-only untuk lookup exact slug. Missing slug harus menghasilkan null dan tidak boleh fallback ke `default-preview`.
5. Buat pure mapper Prisma ke domain contract Classic Rose. Map hero wajib ke `couple.heroImage`, partner Instagram null ke string kosong, `galleryVideoUrl` null ke string kosong hanya saat gallery dipetakan, dan music asset opsional ke `musicUrl`.
6. Hero tidak boleh diinfer dari gallery; gallery video tidak boleh diinfer dari `MediaAsset`; partner tidak boleh bergantung pada urutan array tetapi harus dicari melalui enum role.
7. Pertahankan `Date`, display strings, account number sebagai string, logo path lokal, section flags, dan seluruh semantik optional section.
8. Jika persisted record tidak memenuhi invariant wajib (sections, GROOM, BRIDE, hero, atau gallery aktif tanpa image), mapper harus gagal secara eksplisit dan aman, bukan menghasilkan object parsial diam-diam.
9. Tambahkan unit test hermetis untuk complete mapping, role order independence, ordered relations, hero berbeda dari gallery, gallery video URL/null, optional sections, optional music, invalid required relations, dan repository missing slug.
10. Jalankan seluruh verification tanpa menulis database.

Batasan:
- Jangan switch route publik ke Prisma.
- Jangan seed data, upload media, implement auth, mengubah UI, atau menghapus sumber data lama.
- Jangan membuat unit test bergantung pada PostgreSQL; suite live tetap hanya melalui `pnpm test:db`.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib menjelaskan query/include strategy, urutan relasi, test coverage, dan konfirmasi route masih menggunakan sumber lama.
```

## Stage 4 — Admin Authentication

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 4 — Admin Authentication. Stage 3 telah diterima.

Baca semua dokumen wajib di AGENTS.md, khususnya docs/authentication.md, docs/design.md bagian Admin Login, dan implementation plan Phase 4.

Skill wajib: gunakan `security-best-practices` untuk TypeScript dan laporkan temuan/pengaruhnya. Skill tidak boleh memperluas scope di luar autentikasi admin tahap ini.

Tugas:
1. Implementasikan Auth.js Credentials dengan JWT session.
2. Validasi dan normalisasi email di server.
3. Implementasikan password hashing/verification server-only.
4. Implementasikan isActive, role ADMIN/SUPER_ADMIN, failedLoginCount, dan lockedUntil sesuai contract.
5. Tambahkan typed session/JWT hanya dengan field yang disetujui.
6. Lindungi /admin dan /admin/*; biarkan /admin/login dapat diakses.
7. Buat halaman login beridentitas AyaWarta dan halaman admin minimal, bukan dashboard lengkap.
8. Buat bootstrap admin idempotent dari ADMIN_EMAIL dan ADMIN_PASSWORD tanpa mencetak password/hash.
9. Tambahkan dan jalankan seluruh authentication test matrix.
10. Scan agar secret/server module tidak masuk client bundle.

Batasan:
- Tidak ada registrasi publik, reset password, OAuth, dashboard invitation, media migration, atau route cutover.
- Jangan meminta password melalui chat. Jika ADMIN_EMAIL/ADMIN_PASSWORD belum diisi, laporkan sebagai kebutuhan operator dan uji bootstrap dengan mekanisme aman yang disetujui.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib menyertakan hasil test matrix, route protection, secret scan, dan external/data effects.
```

## Stage 5A — Cloudinary Manifest and Dry Run

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 5A — Cloudinary Manifest and Dry Run. Stage 4 telah diterima.

Baca semua dokumen wajib di AGENTS.md, khususnya docs/media-migration.md dan implementation plan Phase 5.

Tugas:
1. Audit sumber data aktual di `src/lib/invitations.ts`, `src/lib/dummy-data/wedding/dummy-wedding.ts`, `public/images/SAMPLE`, dan `public/images/dummy-couples`. Jangan mengandalkan daftar aset buatan tangan yang tidak dapat ditelusuri kembali ke source tersebut.
2. Buat typed upload manifest untuk seluruh media dinamis lokal dan URL delivery Cloudinary akun lama. Pisahkan physical upload assets dari logical invitation usages agar satu file/resource yang sama dapat digunakan oleh beberapa relasi tanpa di-upload ganda.
3. Cakup `rika-fauzi`, `shidqi-mita`, `dudi-aini`, dan `default-preview` sebagai data production, termasuk tepat satu logical hero usage per slug.
4. Target public ID wajib deterministik dan mengikuti `ayawarta/production/invitations/{slug}/couple/{groom|bride|hero}`, `.../gallery/gallery-NN`, `.../audio/...`, atau `.../video/...`.
5. Buat generator dan validator public ID yang menolak slug/category/role/position invalid, path traversal, `..`, backslash, absolute path, empty segment, query/fragment, serta leading/trailing slash. Tolak collision dan duplicate target public ID.
6. Normalisasi local source menjadi path POSIX repository-relative, pastikan hasil resolve tetap berada di approved source roots, file ada dan readable, lalu catat byte size. Jangan mengikuti path keluar repository.
7. Untuk remote source, hanya izinkan HTTPS. URL Cloudinary lama harus dikenali melalui allowlist delivery host yang eksplisit. Dry-run tidak boleh melakukan `HEAD`, fetch, download, atau request jaringan apa pun.
8. Perlakukan sumber yang sama secara eksplisit: `FOTO - Couple.jpg` adalah hero Rika sekaligus salah satu item galeri, sedangkan `photo-sample.jpg` dipakai enam posisi galeri `default-preview`. Report wajib membedakan jumlah physical assets dan logical usages serta menjelaskan strategi reuse. Jangan membuat upload duplikat hanya untuk memenuhi beberapa usage.
9. Inventarisasi tiga `musicUrl` YouTube milik `rika-fauzi`, `shidqi-mita`, dan `default-preview`, tetapi jangan mengunduh, mengubah, atau memasukkannya sebagai executable Cloudinary upload source. Tandai sebagai `unresolvedExternalMusic`/blocker Stage 5B yang memerlukan file audio resmi atau keputusan eksplisit. Audio Cloudinary lama milik `dudi-aini` tetap masuk manifest; pada SDK Cloudinary nanti memakai `resource_type: "video"`, tetapi domain/report tetap membedakannya sebagai audio.
10. Jangan masukkan `galleryVideoUrl` ke manifest atau daftar blocker media; itu external content pointer PostgreSQL yang memang dipertahankan terpisah.
11. Setiap image usage wajib memiliki alt text bermakna. Setiap gallery usage wajib memiliki position unik dan urut per slug. Manifest/report harus dapat direview tanpa membaca credential.
12. Buat migration planning script dengan dry-run sebagai perilaku default dan safe report contract di directory yang di-ignore Git. Pada Stage 5A, jalur execute/upload harus tidak tersedia atau berhenti dengan guard yang jelas.
13. Buat verification script contract yang hanya memvalidasi report tersimpan secara offline. Jangan membuat atau memanggil Cloudinary client pada Stage 5A.
14. Dry-run harus deterministik dan menampilkan summary physical assets, logical usages, unresolved sources, count per slug/category, source type, resource type, byte size lokal, target public ID, collision/missing-file status, serta daftar external effects yang baru akan terjadi di Stage 5B.
15. Tambahkan unit test hermetis untuk generator/validator, source containment, manifest invariants, deduplikasi/reuse, tepat satu hero per slug, gallery ordering, alt text, remote-host policy, exclusion `galleryVideoUrl`, deterministic output, secret-free report, dan bukti dry-run tidak menyentuh jaringan/Cloudinary/database.

Batasan keras:
- Jangan upload, mengunduh remote asset, memanggil Cloudinary API, mengubah database, mengganti URL aplikasi, membuat seed, atau menghapus/memindahkan file.
- Jangan mengubah schema/migration Prisma, route publik, UI, Auth.js, Firestore, Aiven, atau Vercel.
- Jangan menyalin/mengekstrak konten YouTube atau menganggap URL YouTube sebagai file audio yang siap di-upload.
- Jangan mencetak credential.
- Jangan mengubah `.env.local` atau lockfile.
- Jangan commit. Berhenti setelah handoff untuk review manifest.

Verifikasi minimum: `pnpm test`, test khusus dry-run/manifest, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check`, dan scan bahwa tidak ada credential/report generated yang masuk diff. Jangan jalankan `test:db` bila implementasi Stage 5A memang hermetis dan tidak membutuhkan database; bila tetap dijalankan, hanya read-only.

Handoff wajib menyertakan manifest summary lengkap, perbedaan physical asset count vs logical usage count, empat hero mappings, unresolved music list, test results, generated report path, daftar file yang berubah, bukti tidak ada external effect, dan daftar external effects yang akan terjadi bila Stage 5B kelak disetujui.
```

## Stage 5A.1 — Resolve Local Audio Inputs

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 5A.1 — Resolve Local Audio Inputs. Stage 5A telah diterima dan ditutup pada commit 3a2f729. Jangan melakukan upload Cloudinary dan jangan memulai Stage 5B.

Baca AGENTS.md, docs/media-migration.md, manifest Stage 5A, dan review Stage 5A yang telah ditutup.

Tiga file audio resmi telah disediakan secara lokal dan sengaja tidak dilacak Git:

- .media-migration/input/audio/rika-fauzi.mp3
  - bytes: 7369389
  - SHA-256: 48D3A6E9E0ED03416073720FE28C39ACDF6FBE4256BB41E0A83E6142CCBF323B
- .media-migration/input/audio/shidqi-mita.mp3
  - bytes: 2263386
  - SHA-256: 1AEBA6C98E8F2079081216DD3554A87E295F4562460CED2F7C7F1572120F711F
- .media-migration/input/audio/default-preview.mp3
  - bytes: 2263386
  - SHA-256: 1AEBA6C98E8F2079081216DD3554A87E295F4562460CED2F7C7F1572120F711F

Kesamaan hash `shidqi-mita` dan `default-preview` disengaja dan telah dikonfirmasi pemilik. Walaupun kontennya identik, pertahankan dua target public ID berbeda agar setiap invitation tetap memiliki media di production folder slug masing-masing.

Tugas:
1. Tambahkan typed audio-resolution contract yang memetakan tiga slug tersebut ke input lokal, expected byte size, expected SHA-256, dan target public ID `ayawarta/production/invitations/{slug}/audio/background-music`.
2. Jangan memasukkan byte MP3 ke repository. Hanya descriptor/hash yang boleh dikomit; file tetap berada di `.media-migration/input/audio` yang di-ignore.
3. Pisahkan validator input migration lokal dari validator public image source bila diperlukan. Pastikan path input tetap terkungkung dalam `.media-migration/input/audio`, menolak traversal/symlink escape, dan hanya menerima nama file yang diizinkan.
4. Validasi file ada, readable, nonzero, extension `.mp3`, byte size sesuai, SHA-256 sesuai, dan memiliki signature MP3 yang masuk akal. Jangan mentranscode atau memodifikasi file.
5. Ubah manifest generation agar tiga unresolved YouTube music blocker digantikan tiga physical audio asset dan tiga logical audio usage dari input lokal terverifikasi.
6. Pertahankan audio `dudi-aini` dari Cloudinary lama. Semua empat audio menggunakan domain category `audio` dan Cloudinary SDK resource type `video`.
7. Expected canonical totals setelah amendment:
   - 31 physical assets
   - 37 logical usages
   - 15 local assets
   - 16 remote assets
   - 27 images
   - 4 audio assets
   - 0 video assets
   - 0 unresolved music blockers
   - 4 explicit heroes
8. Update verifier agar memvalidasi descriptor, hash/size audio lokal, totals baru, dan zero blockers. Report canonical harus tetap deterministik byte-for-byte.
9. Unit test harus hermetis: gunakan temporary fixture audio melalui dependency injection; jangan membuat `pnpm test` bergantung pada file ignored milik operator. Tambahkan integration/local-input check terpisah untuk tiga file nyata.
10. Dry-run/report boleh membaca file lokal dan menghitung hash, tetapi tidak boleh membuka network, mengunggah, mengubah database, menghapus file, atau mengubah route/seed/UI.

Verifikasi minimum:
- pnpm test
- pnpm typecheck
- pnpm lint
- pnpm build
- local audio input verification untuk ketiga file
- pnpm media:dry-run dua kali dengan hash report identik
- pnpm media:verify
- live-execution guard
- git diff --check

Jangan commit. Handoff wajib memuat mapping ketiga audio, ukuran dan SHA-256 aktual, bukti bahwa duplicate hash disengaja tetapi public ID tetap terpisah, totals lama vs baru, hasil verifikasi, zero external effects, daftar file berubah, dan status not committed.
```

## Stage 5B — Cloudinary Upload and Verification

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 5B — Cloudinary Upload and Verification. Pemilik telah memberi otorisasi eksplisit pada 22 Oktober 2026 untuk melakukan upload nyata ke akun Cloudinary baru. Otorisasi ini hanya mencakup migrasi media yang tercantum dalam manifest final; tidak mencakup database, deployment, route cutover, atau penghapusan apa pun.

Stage 5A ditutup pada commit `3a2f729`. Stage 5A.1 ditutup pada commit `97d7364`. Baca ulang `AGENTS.md`, `docs/media-migration.md`, `docs/reviews/stage-05a-cloudinary-manifest-review.md`, dan `docs/reviews/stage-05a1-local-audio-resolution-review.md`.

Manifest final yang tidak boleh diperluas:
- 31 physical assets dan 37 logical usages;
- 15 local assets dan 16 remote assets dari Cloudinary lama;
- 27 image assets, 4 audio assets, 0 video assets;
- 4 hero mappings, tepat satu per production slug;
- 0 unresolved music blockers;
- 3 MP3 lokal berada di `.media-migration/input/audio/` dan wajib lolos `pnpm media:verify-audio`;
- audio Dudi–Aini bersumber dari `https://res.cloudinary.com/doig3gwek/video/upload/v1764532212/lagu_ruirls.mp3`;
- audio memakai domain category `audio` tetapi Cloudinary SDK `resource_type: "video"`.

Preflight wajib sebelum mutasi:
1. Pastikan worktree bersih dan HEAD memuat commit Stage 5A.1.
2. Jalankan `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm media:verify-audio`, `pnpm media:dry-run`, dan `pnpm media:verify`.
3. Baca hanya keberadaan dan status non-empty key `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET`; jangan pernah mencetak nilainya.
4. Validasi kredensial dengan panggilan read-only Cloudinary yang aman. Pastikan target cloud bukan akun lama `doig3gwek`. Bila cloud name kosong, sama dengan akun lama, autentikasi gagal, atau report/manifest tidak cocok dengan baseline 31/37, berhenti sebelum upload.
5. Inventarisasi seluruh 31 target public ID pada akun baru terlebih dahulu. Jangan overwrite aset existing yang tidak dapat dibuktikan cocok. Aset existing yang cocok boleh berstatus `existing_verified`; konflik public ID harus menghentikan stage tanpa overwrite atau delete.

Implementasi dan eksekusi:
1. Ubah jalur `media:migrate` dari guard Stage 5A menjadi mutator Stage 5B yang hanya dapat berjalan dengan flag eksplisit, misalnya `--execute`, serta tetap menyediakan dry-run aman sebagai default.
2. Gunakan tepat 31 physical assets dari manifest canonical. Jangan membuat upload dari 37 logical usages dan jangan membuat public ID baru di luar manifest.
3. Upload 15 sumber lokal dan minta Cloudinary mengambil/re-upload 16 HTTPS source dari akun lama ke akun baru. Jangan mengambil sumber lain dan jangan memakai URL YouTube.
4. Gunakan target public ID deterministik yang sudah disetujui, `unique_filename: false`, tanpa transformasi eager, tanpa rename, tanpa delete, dan dengan perilaku retry yang konvergen. Lindungi aset target existing dari overwrite tidak sengaja.
5. Gunakan `resource_type: "image"` untuk image dan `resource_type: "video"` untuk seluruh audio. Jangan memakai `resource_type: "auto"` untuk mengaburkan kontrak manifest.
6. Catat hasil per physical asset sebagai `uploaded`, `existing_verified`, atau `failed`. Partial success boleh tetap berada di akun baru; jangan mencoba rollback dengan deletion. Retry harus memverifikasi atau melanjutkan target deterministik yang sama.
7. Setelah upload, verifikasi seluruh 31 target melalui Cloudinary/Admin API dan HTTPS delivery metadata: cloud name target, exact public ID, resource type, secure URL, format, byte size, serta width/height untuk image bila tersedia. Verifikasi empat audio dan empat hero secara eksplisit.
8. Pastikan empat hero target dapat dipakai kelak untuk `Invitation.heroAssetId`, tetapi jangan membuat record `MediaAsset`, seed, atau menulis database pada tahap ini.
9. Simpan report aman dan deterministik sejauh data hasil API memungkinkan di `.media-migration/cloudinary-upload-report.json`. Report boleh memuat cloud name, public ID, secure URL, metadata media, status, dan error generik; dilarang memuat API key, secret, signature, authorization header, request dump, stack trace, atau URL yang mengandung credential.
10. Tambahkan verifier Stage 5B yang membaca report dan memeriksa expected-vs-actual counts, keunikan public ID, target cloud, resource type, seluruh hero/audio, kegagalan nol, dan credential leak nol. Jangan menganggap upload sukses hanya dari respons awal tanpa verifikasi target.
11. Tambahkan unit test hermetis untuk selection 31 physical assets, Cloudinary option mapping, idempotent existing-resource behavior, conflict refusal, partial-failure reporting, retry behavior, report sanitization, dan verifier. Unit test tidak boleh membuka jaringan. Pisahkan live integration/upload path dari test default.

Aturan berhenti aman:
- Bila satu required asset gagal upload atau gagal verifikasi, status Stage 5B adalah gagal/partial dan proses harus berhenti sebelum Stage 6. Laporkan seluruh target yang sudah berhasil dan target yang gagal.
- Jangan menghapus, rename, overwrite konflik, atau memodifikasi aset akun Cloudinary lama.
- Jangan menghapus atau memindahkan file lokal, termasuk tiga MP3.
- Jangan mengubah source URL aplikasi, route publik, Prisma schema/migration, seed, PostgreSQL, Firestore, Aiven, atau Vercel.
- Jangan menjalankan Stage 6.
- Jangan mengubah `.env.local` atau mencetak credential.
- Jangan commit. Berhenti setelah upload, verifikasi, dan handoff untuk review.

Verifikasi minimum setelah eksekusi:
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm media:verify-audio`
- `pnpm media:dry-run` dan `pnpm media:verify`
- command upload eksplisit Stage 5B
- verifier report/live target Stage 5B
- `git diff --check`
- staged/worktree credential scan tanpa mencetak nilai rahasia

Handoff wajib menyertakan:
- identitas target hanya berupa cloud name aman dan bukti bahwa bukan `doig3gwek`;
- report path dan hash report;
- count expected/actual global serta per slug/category/resource type;
- daftar status `uploaded`, `existing_verified`, dan `failed`;
- verifikasi empat hero dan empat audio;
- bila partial/gagal, public ID tepat yang gagal dan safe retry instruction;
- hasil test/typecheck/lint/build;
- konfirmasi 0 database writes, 0 deployment, 0 route cutover, 0 deletion, dan akun lama/file lokal tetap utuh;
- daftar file source yang berubah dan status `not committed`.
```

## Stage 5B.1 — Oversized Hero Remediation and Live Verification Hardening

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya koreksi Stage 5B.1 — Oversized Hero Remediation and Live Verification Hardening. Baca `docs/reviews/stage-05b-cloudinary-upload-review.md` dan petakan setiap perubahan ke `CLOUD-01` sampai `CLOUD-04`.

Kondisi eksternal saat ini:
- Target Cloudinary baru: `uhwi7xvb`, bukan akun lama `doig3gwek`.
- 30 dari 31 target public ID sudah ada menurut partial run: 28 uploaded, 2 existing_verified.
- Satu target yang belum ada adalah `ayawarta/production/invitations/rika-fauzi/couple/hero`.
- Sumber asli `public/images/SAMPLE/FOTO - Couple.jpg` adalah JPEG 3.877 × 5.816, 11.261.085 byte, SHA-256 `ACCB84DEA196E0AF36ADBFA914867654965CBAA97CB9B2A798EFC382CA161776`.
- Limit akun adalah 10.485.760 byte per image.
- Pemilik menyetujui kompresi otomatis kualitas tinggi dan meminta primitive yang kelak dapat digunakan oleh sistem/admin upload.

Scope koreksi:

### CLOUD-01 — Deterministic high-quality preparation

1. Tambahkan `sharp` sebagai direct pnpm dependency dengan versi yang kompatibel dengan lockfile saat ini; jangan memakai package manager lain.
2. Buat modul server-only reusable untuk menyiapkan image upload dari Buffer/path tanpa menyimpan rahasia atau bergantung pada UI.
3. Validator wajib membaca signature/metadata hasil decode, membatasi input maksimum dan decoded pixel count, menolak format tak didukung, auto-rotate dari EXIF, strip metadata yang tidak diperlukan, mempertahankan aspect ratio, dan tidak melakukan upscale.
4. Untuk JPEG oversized, gunakan algoritme deterministik: coba re-encode kualitas tinggi tanpa resize terlebih dahulu, lalu turunkan kualitas melalui ladder tetap hanya sampai output berada di bawah safety target 9.500.000 byte. Jangan turun di bawah quality floor 82 dan jangan resize pada kasus Rika/Fauzi bila target sudah tercapai dengan re-encode saja.
5. Output wajib tetap JPEG dengan dimensi visual/orientasi yang sama, berukuran >0 dan <=9.500.000 byte. Kembalikan metadata output: format, width, height, byte size, SHA-256, dan quality terpilih.
6. Buat derived file deterministik di `.media-migration/input/images/rika-fauzi-hero.jpg`. Folder ini tetap ignored. Jangan mengubah, menghapus, atau mengganti file asli di `public/images/SAMPLE`.
7. Tambahkan typed descriptor dan strict realpath containment untuk migration image input. Manifest hero Rika/Fauzi harus memakai derived source tersebut, sedangkan gallery position 6 tetap mereferensikan physical hero asset yang sama. Totals wajib tetap 31 physical assets, 37 usages, dan 15 local assets.
8. Perbarui verifier/dry-run agar memvalidasi source descriptor, output size/hash/dimensions, dan deterministic generation. Report hash canonical boleh berubah karena source descriptor berubah; laporkan hash lama dan baru.
9. Buat visual comparison artifact lokal/ignored antara original dan derived serta laporkan dimensi, byte reduction, quality, dan hasil pemeriksaan visual. Jangan commit bitmap turunan atau comparison artifact.

### CLOUD-02 — Real post-upload read-back

10. Setelah fase upload/skip, panggil Admin API kembali untuk seluruh 31 expected public ID, dipisahkan menurut resource type. Final report, status, byte size, dimensions, hero count, dan audio count harus dibangun dari live read-back ini, bukan hanya upload response atau preflight cache.
11. Bila salah satu target hilang atau metadata live tidak cocok, hasil Stage 5B tetap gagal dan Stage 6 tetap diblokir.

### CLOUD-03 — Strong existing-resource proof

12. Perketat `existing_verified`. Untuk local sources, cocokkan exact expected byte size, format, dan expected dimensions; gunakan digest/Cloudinary `etag` bila API menyediakannya dan dapat dibandingkan secara benar.
13. Untuk 30 target hasil partial run, rekonsiliasi live metadata dengan report partial ber-hash `66113191C5A714D0D2DAC71AAECADC317DAAF6A4F4CB60405AC8E1D9C9A10D80` dan source/manifest metadata. Jangan menerima target hanya karena JPEG/nonzero bytes.
14. Jika identitas existing target tidak dapat dibuktikan, berhenti sebagai conflict. Jangan overwrite atau delete otomatis.

### CLOUD-04 — Report and URL integrity

15. Bangun seluruh teks summary/detail dari counter aktual; partial report tidak boleh mengklaim hero 4/4. Verifier harus menolak detail yang bertentangan dengan summary.
16. Parse delivery URL secara ketat: scheme `https:`, hostname tepat `res.cloudinary.com`, tanpa userinfo, custom port, query, atau fragment, dan target cloud harus menjadi path segment pertama. Substring match tidak cukup.
17. Tambahkan mutation/unit tests hermetis untuk live read-back wajib, missing-after-upload, local byte/dimension mismatch, unprovable existing conflict, URL spoofing, partial-detail mismatch, deterministic compression, size ceiling, orientation/aspect preservation, invalid image, pixel limit, dan no-upscale behavior.

Retry live yang diotorisasi:

18. Jalankan seluruh local verification terlebih dahulu. Setelah derived source dan read-back logic lolos review internal/test, jalankan kembali command Stage 5B `--execute` ke cloud `uhwi7xvb`.
19. Retry harus menemukan dan membuktikan 30 existing targets, lalu mengunggah hanya hero Rika/Fauzi yang hilang dengan public ID yang sama. Expected retry effects: 1 upload baru, 30 existing_verified, 0 failed, 31/31 live read-back, 4/4 heroes, dan 4/4 audio.
20. Simpan report final ke `.media-migration/cloudinary-upload-report.json`, hitung SHA-256 baru, lalu jalankan `pnpm media:verify-upload`.

Batasan keras:
- Jangan menyentuh database, seed, route, Firestore, Aiven, Vercel, atau Stage 6.
- Jangan menambah UI admin/upload pada tahap ini; hanya primitive server-side reusable dan dokumentasi kontraknya.
- Jangan menghapus, rename, atau overwrite aset akun lama maupun 30 target yang sudah berhasil.
- Jangan menghapus/mengubah source asli atau tiga MP3.
- Jangan commit derived image, report, comparison artifact, credential, atau `.env.local`.
- Jangan commit source implementation. Berhenti setelah retry, verifikasi, dan handoff review.

Verifikasi minimum:
- `pnpm install --frozen-lockfile` setelah dependency/lockfile final
- test kompresor dan uploader hermetis
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm media:verify-audio`
- `pnpm media:dry-run` dua kali dan bandingkan hash
- `pnpm media:verify`
- Stage 5B retry `--execute`
- `pnpm media:verify-upload`
- complete 31-target live read-back evidence
- `git diff --check` dan credential/binary staging scan

Handoff wajib memuat mapping `CLOUD-01`–`CLOUD-04`, algoritme kompresi, original-vs-derived metadata/hash, visual review result, old-vs-new manifest/report hash, retry counts, 31-target live read-back result, daftar exact file source yang berubah, external effects aktual, bukti source/aset lama tetap utuh, dan status `not committed`.
```

## Stage 5B.2 — Reproducibility and Content-Identity Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 5B.2 — Reproducibility and Content-Identity Correction. Baca bagian "Stage 5B.1 Correction Review" pada `docs/reviews/stage-05b-cloudinary-upload-review.md` dan petakan perubahan ke `CLOUD-05` sampai `CLOUD-08`.

Kondisi yang sudah final:
- Target Cloudinary `uhwi7xvb` sudah memiliki 31/31 aset: 4/4 hero dan 4/4 audio.
- Jangan mengunggah ulang, overwrite, rename, atau delete aset apa pun kecuali read-only audit menemukan mismatch nyata dan reviewer memberi otorisasi baru.
- Laporan final saat ini ber-SHA-256 `03BE7F497480598C66FEC7BB88D8015C5071FDA2BE966ECA3AE8860EA928EAF2`.
- Derived hero yang diterima: 4.151.481 byte, 3.877 × 5.816, SHA-256 `9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77`.

Tugas wajib:

1. `CLOUD-05`: hubungkan `ensureDerivedHeroImage()` atau preparation service ekuivalen ke alur CLI production sebelum `generateMediaManifest()` pada dry-run dan execute. Missing file harus diregenerasi dari original yang hash-nya telah diverifikasi. File valid boleh digunakan tanpa rewrite. File tampered harus diregenerasi lalu hasilnya wajib cocok exact terhadap descriptor; bila tidak cocok, fail closed. Test missing/valid/tampered secara hermetis.
2. Jangan membuat manifest production hanya dari hard-coded `knownByteSize`. Default resolver wajib memvalidasi file nyata atau preparation gate wajib menjamin existence, regular-file status, containment, size, dimensions, dan SHA-256 sebelum descriptor dipakai.
3. `CLOUD-06`: buat command audit read-only yang membuktikan content identity aset. Untuk 16 remote sources, stream sumber lama yang allowlisted dan target `secure_url` baru, hitung SHA-256 dan byte count, lalu require equality. Terapkan source-vs-target digest pada local sources bila delivery original stabil. Batasi response size/time, tolak userinfo/custom port/query/fragment, dan nonaktifkan redirect atau validasi ulang setiap hop. Jangan menyimpan body media atau credential ke report/log.
4. Audit identity harus melaporkan tepat 31 target, hash aman per aset, mismatch/missing count, 4 hero, dan 4 audio. Mismatch harus exit nonzero dan tidak boleh memicu upload/overwrite/delete. Tambahkan test dengan HTTP/client dependency injection untuk digest match, mismatch, oversize response, redirect spoof, timeout, dan sanitized errors.
5. `CLOUD-07`: pastikan setiap successful `prepareImage()` selalu menghasilkan `0 < byteSize <= targetMaxBytes`. Implementasikan bounded deterministic processing untuk oversized PNG/WebP atau tolak oversized non-JPEG secara eksplisit sampai format itu didukung. Tambahkan tests untuk PNG dan WebP normal serta oversized.
6. `CLOUD-08`: pin exact `"sharp": "0.35.5"`, sinkronkan `pnpm-lock.yaml`, dan tambahkan guard `import "server-only"` pada image runtime boundary. Pastikan modul client tidak dapat mengimpor primitive tersebut.
7. Ubah comparison artifact agar tidak menyimpulkan "visually lossless" hanya dari dimensi. Catat metrik objektif dan status manual review terpisah; hasil review saat ini boleh dicatat sebagai diterima setelah inspeksi reviewer.
8. Pertahankan seluruh invariant manifest: 31 physical assets, 37 usages, 15 local, 16 remote, 4 hero, 4 audio, dan 0 blocker.

Verifikasi minimum:
- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm media:verify-audio`
- `pnpm media:dry-run` dua kali dengan hash byte-identik
- `pnpm media:verify`
- command baru read-only content-identity audit
- `pnpm media:verify-upload` untuk report yang sudah ada
- `git diff --check` dan credential scan

Batasan keras:
- Jangan menjalankan `pnpm media:migrate --execute` pada koreksi ini.
- Jangan menyentuh PostgreSQL, seed, Stage 6, route, Firestore, Aiven, Vercel, atau UI admin.
- Jangan mengubah/menghapus source asli, MP3, aset Cloudinary lama, atau target Cloudinary baru.
- Jangan commit. Berhenti setelah seluruh verifikasi selesai dan kirim handoff review.

Handoff wajib memuat mapping `CLOUD-05`–`CLOUD-08`, bukti generation gate missing/valid/tampered, algoritme audit hash dan proteksi network, hasil 31/31 identity audit, exact Sharp version, PNG/WebP behavior, seluruh command verification, external effects (harus read-only), daftar file berubah, dan status `not committed`.
```

## Stage 5B.3 — Identity Audit Input Boundary Finalization

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 5B.3 — Identity Audit Input Boundary Finalization. Baca bagian "Stage 5B.2 Correction Review" pada `docs/reviews/stage-05b-cloudinary-upload-review.md` dan petakan perubahan ke `CLOUD-09` serta `CLOUD-10`.

Kondisi yang sudah final:
- Cloudinary target `uhwi7xvb` sudah lengkap dan telah dibuktikan byte-identical: 31/31 aset, 16 remote source, 15 local source, 4/4 hero, dan 4/4 audio.
- Jangan menjalankan upload ulang, overwrite, rename, atau delete apa pun.
- Final upload report tetap ber-SHA-256 `03BE7F497480598C66FEC7BB88D8015C5071FDA2BE966ECA3AE8860EA928EAF2`.
- Stage 5B.2 sudah menyelesaikan preparation gate, exact Sharp pin, server boundary, image postcondition, dan live content digest. Jangan memperluas perubahan di luar audit-input boundary.

Tugas wajib:

1. `CLOUD-09`: perlakukan `.media-migration/cloudinary-upload-report.json` sebagai untrusted input. Parse JSON secara terkontrol, validasi runtime memakai `cloudinaryUploadReportSchema`, dan jangan dereference payload sebelum validasi berhasil. Error schema harus aman, ringkas, dan tidak memantulkan credential atau nilai sensitif.
2. Bangun expected asset map dari canonical manifest yang telah melewati resolver/gate produksi. Require tepat 31 public ID unik dan exact set equality antara upload report dan manifest: tidak boleh duplicate, missing, extra, atau substituted target.
3. Untuk setiap target, cocokkan minimal slug, category, sourceType, sourceLocation, dan Cloudinary resource type dengan canonical manifest. Gunakan source metadata/path dari canonical manifest sebagai input hashing; jangan mempercayai `sourceLocation` dari report untuk pembacaan filesystem.
4. Pertahankan strict containment validator yang sudah ada untuk seluruh local source root: `public/images/SAMPLE`, `public/images/dummy-couples`, `.media-migration/input/audio`, dan `.media-migration/input/images`. Report tampering seperti absolute path, traversal, sibling-prefix, symlink escape, atau source substitution harus gagal sebelum file dibaca atau network dimulai.
5. Pastikan exact unique set juga memiliki tepat 4 hero dan 4 audio. Jangan menghitung kelengkapan hanya dari suffix pada 31 record yang belum direkonsiliasi.
6. Sanitize error pada boundary CLI `scripts/audit-media-identity.ts`; top-level failure tidak boleh mencetak raw exception yang mungkin mengandung path sensitif, token, query, atau credential.
7. `CLOUD-10`: hitung request attempt aktual. Successful full audit melakukan 31 target GET dan 16 remote-source GET, sehingga report harus menyimpan `networkRequestsMade: 47`, bukan 62. Bila audit berhenti/gagal, counter harus mencerminkan attempt yang benar dan tidak boleh memakai fixed multiplier.
8. Audit core wajib menolak injected `HttpStreamResponse.status` di luar 200–299 sebelum body diproses. Contract ini harus sama untuk default fetcher dan dependency-injected test fetcher.
9. Tambahkan test hermetis untuk malformed JSON/root, schema-invalid payload, duplicate/missing/extra public ID, slug/category/source type/source location/resource type substitution, local traversal/absolute path, canonical-set hero/audio invariant, sanitized top-level errors, non-2xx injected response, successful 47-request count, dan request count pada failure/early stop.
10. Pertahankan seluruh hasil Stage 5B.2: 281+ tests, manifest 31 physical/37 usages/15 local/16 remote/4 hero/4 audio/0 blockers, exact `sharp` pin, server-only boundary, serta derived hero descriptor.

Verifikasi minimum:
- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm media:verify-audio`
- `pnpm media:dry-run` dua kali dan buktikan hash byte-identik
- `pnpm media:verify`
- `pnpm media:verify-upload`
- `pnpm media:audit-identity` read-only dan buktikan 31/31 match serta tepat 47 request
- `git diff --check` dan credential scan

Batasan keras:
- Jangan menjalankan `pnpm media:migrate --execute`.
- Jangan menyentuh PostgreSQL, seed, Stage 6, route, Firestore, Aiven, Vercel, atau UI admin.
- Jangan mengubah/menghapus source asli, MP3, derived image yang diterima, aset Cloudinary lama, atau target Cloudinary baru.
- Jangan commit. Berhenti setelah seluruh verifikasi selesai dan kirim handoff review.

Handoff wajib memuat mapping `CLOUD-09`–`CLOUD-10`, runtime schema/reconciliation strategy, canonical-set dan containment proof, mutation-test matrix, HTTP status behavior, actual request-count evidence (expected 47 pada full pass), seluruh command verification, external effects read-only, daftar file berubah, dan status `not committed`.
```

## Stage 6 — Idempotent Local Seed

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 6 — Idempotent Local Seed. Stage 5B telah diterima dan seluruh media wajib terverifikasi.

Baca semua dokumen wajib di AGENTS.md, khususnya docs/database-schema.md dan media migration report yang telah disetujui.

Tugas:
1. Ubah data hard-coded saat ini menjadi typed seed data tanpa mengubah konten pelanggan.
2. Resolve seluruh dynamic media melalui verified public ID/report.
3. Upsert MediaAsset dan empat invitation production secara transaction-safe.
4. Pertahankan hero eksplisit, section flags, urutan, string tanggal/waktu, gift account, music, gallery video, dan optional data.
5. Implementasikan bootstrap admin idempotent jika credential operator sudah tersedia.
6. Jalankan seed dua kali ke database Laragon lokal.
7. Bandingkan row count dan query empat slug melalui repository.
8. Pastikan setiap hasil repository memiliki `couple.heroImage` dari relasi hero eksplisit dan seed gagal bila hero wajib tidak ditemukan.
9. Simpan URL gallery video `default-preview` pada `galleryVideoUrl` dan normalisasi string gallery video kosong milik invitation lain menjadi null.

Batasan:
- Jangan menyentuh Aiven/Vercel.
- Jangan switch route publik.
- Jangan hapus hard-coded data atau media lokal.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib menyertakan count run pertama/kedua, query reconstruction result, transaction strategy, dan bukti hanya database lokal yang berubah.
```

## Stage 6.1 — Seed Atomicity and Local-Target Hardening

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 6.1 — Seed Atomicity and Local-Target Hardening. Baca `docs/reviews/stage-06-idempotent-seed-review.md` dan petakan perubahan ke `SEED-01` sampai `SEED-04`.

Kondisi saat ini:
- Database lokal pernah berhasil di-seed dua kali menjadi 82 row, tetapi PostgreSQL Laragon sedang sempat tidak menerima koneksi saat review. Pastikan servicenya aktif sebelum verification database.
- Tidak ada izin menulis ke Aiven, Vercel, Firestore, atau database selain PostgreSQL lokal `localhost:5432/ayawarta`.
- Jangan mulai Stage 7 dan jangan commit.

Tugas wajib:

1. `SEED-01`: ubah seed dataset menjadi satu outer interactive transaction yang mencakup 31 MediaAsset, keempat Invitation beserta seluruh ordered children, dan administrator bila bootstrap diaktifkan. Jangan membuka nested transaction per invitation. Bila satu invariant atau write gagal, seluruh perubahan Stage 6 pada run tersebut harus rollback.
2. Validasi seluruh required media dan seed definition sebelum write bila memungkinkan. Tambahkan fault-injection test yang gagal setelah beberapa media upsert dan saat invitation ke-3; buktikan tidak ada partial state yang tersisa.
3. `SEED-02`: buat reusable server-only local database target guard. Parse `DATABASE_URL` tanpa mencetak URL mentah/user/password. Hanya izinkan protocol PostgreSQL, host `localhost`, `127.0.0.1`, atau `::1`, port `5432`, dan database `ayawarta`.
4. Jalankan guard sebelum Prisma client di-import atau koneksi/write dibuat pada `prisma/seed.ts`. Terapkan juga pada `scripts/verify-seed.ts`. Tambahkan test approved target serta penolakan Aiven/non-local host, port/database salah, malformed URL, query override berbahaya bila relevan, dan error yang tidak membocorkan credential.
5. `SEED-03`: sebelum transaksi, validasi upload report sebagai untrusted input dan reconcile terhadap canonical Stage 5B manifest. Require tepat 31 unique public ID, exact set equality, target cloud `uhwi7xvb`, status sukses, slug/category/source/resource type sesuai, strict target delivery URL, positive bytes/format, valid image dimensions, serta tepat satu hero dan audio per approved slug.
6. Jangan default metadata penting yang hilang menjadi `0`. Missing/invalid `bytes`, format, secure URL, atau dimensions untuk image harus fail closed. Gunakan metadata report yang sudah direkonsiliasi untuk MediaAsset upsert.
7. Perbaiki test report agar benar-benar memanggil production validator. Tambahkan mutation tests untuk duplicate/missing/extra/substituted ID, forged summary, old/wrong cloud, spoofed secure URL, failed status, zero/null bytes, dan missing dimensions.
8. `SEED-04`: ubah semua canonical `weddingDate` menjadi timestamp eksplisit WIB (`+07:00`) agar hasil identik pada mesin Asia/Jakarta maupun UTC. Pertahankan wall-clock yang sekarang dan test exact ISO instant untuk keempat slug.
9. Pertahankan seluruh konten, section flags, ordering, account number string, gallery reuse, hero/music relation, dan galleryVideoUrl yang telah diterima. Jangan mengedit copy pelanggan.

Verifikasi minimum setelah PostgreSQL lokal aktif:
- `pnpm prisma:format`
- `pnpm prisma:validate`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm test:db`
- preflight target aman yang hanya mencetak protocol/host/port/database
- `pnpm prisma:seed` run 1
- `pnpm seed:verify`
- `pnpm prisma:seed` run 2
- `pnpm seed:verify`
- buktikan count dan content reconstruction identik
- `git diff --check` dan credential scan

Batasan keras:
- Jangan menjalankan seed bila local-target guard gagal.
- Jangan menyentuh Aiven, Vercel, Firestore, route publik, atau Cloudinary.
- Jangan menghapus hard-coded data maupun media lokal.
- Jangan commit. Berhenti setelah verifikasi dan kirim handoff review.

Handoff wajib memuat mapping `SEED-01`–`SEED-04`, transaction boundary, rollback fault-injection proof, local-target guard matrix, report reconciliation/mutation-test matrix, exact weddingDate ISO values, run-1/run-2 counts, repository reconstruction, external effects, daftar file berubah, dan status `not committed`.
```

## Stage 6.2 — Seed Boundary Proof Finalization

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 6.2 — Seed Boundary Proof Finalization. Baca `docs/reviews/stage-06-idempotent-seed-review.md` dan petakan pekerjaan ke `SEED-05`, `SEED-06`, dan `SEED-07`.

Kondisi yang sudah diterima:
- Transaction production seed sudah mencakup 31 media, 4 invitation beserta child, dan admin.
- Local database guard, canonical report reconciliation, serta timestamp WIB sudah benar secara umum.
- Database lokal `localhost:5432/ayawarta` saat ini berisi 82 row yang valid.

Tugas wajib:

1. `SEED-05`: susun ulang `scripts/verify-seed.ts` agar local database target guard selesai dan lulus sebelum modul Prisma/database di-import atau dievaluasi. Setelah guarded import, cleanup `$disconnect()` tetap wajib berjalan pada sukses maupun gagal.
2. Tambahkan hermetic module-boundary test dengan dependency injection atau isolated module loading yang membuktikan URL non-lokal/malformed ditolak dan Prisma import factory tidak pernah dipanggil. Jangan hanya grep/source scan.
3. `SEED-06`: ganti rollback proof berbasis row count dengan deterministic full-state snapshot untuk semua 9 tabel sebelum dan sesudah fault injection. Snapshot harus credential-free, sorted, dan cukup sensitif untuk menangkap perubahan value, `updatedAt`, foreign key, serta penghapusan/pembuatan ulang child ID.
4. Pertahankan dua skenario live rollback: gagal setelah 5 media upsert dan gagal pada invitation ke-3. Kedua hasil harus identik secara struktural atau byte-for-byte dengan baseline, bukan hanya count. Jalankan hanya setelah local-target guard lulus.
5. `SEED-07`: tambahkan validator binding delivery URL Cloudinary ke record kanonis. Require HTTPS `res.cloudinary.com`, cloud `uhwi7xvb`, resource path yang sesuai (`image` atau `video`), segmen `upload`, optional transformation/version yang valid, dan decoded public-ID path yang sama persis dengan `targetPublicId` setelah extension dilepas.
6. Validator harus fail closed terhadap URL milik public ID approved lain, pertukaran dua secure URL, resource type salah, path/version ambigu, encoded slash/dot traversal, credentials, query, fragment, dan custom port. Jangan merusak 31 URL report produksi yang sudah disetujui.
7. Tambahkan mutation tests yang benar-benar melewati production report reader dan membuktikan seluruh substitusi URL di atas ditolak sebelum transaksi.
8. Jangan mengubah data pelanggan, schema Prisma, canonical public IDs, jumlah row, UI, route publik, atau konfigurasi layanan eksternal.

Verifikasi minimum:
- `pnpm install --frozen-lockfile`
- `pnpm prisma:format`
- `pnpm prisma:validate`
- `pnpm test`
- `pnpm test:db`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm seed:verify`
- satu negative CLI/module-boundary proof bahwa non-local URL berhenti sebelum Prisma import
- `git diff --check` dan credential scan

Batasan keras:
- Hanya PostgreSQL lokal `localhost:5432/ayawarta` boleh dibaca/ditulis.
- Jangan menjalankan seed ke Aiven, Vercel, Firestore, atau database lain.
- Jangan mengakses/memutasi Cloudinary; URL validation harus offline.
- Jangan memulai Stage 7 dan jangan commit.

Handoff wajib memuat mapping `SEED-05`–`SEED-07`, bukti urutan guard-before-import, bentuk snapshot rollback dan hasil dua fault injection, mutation matrix URL/public-ID binding, seluruh hasil verifikasi, external effects, daftar file berubah, dan status `not committed`.
```

## Stage 6.3 — Seed Proof Integrity Final Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya koreksi final Stage 6.3. Baca `docs/reviews/stage-06-idempotent-seed-review.md` dan perbaiki tepat `SEED-08` serta `SEED-09`. Jangan memperluas scope, jangan memulai Stage 7, dan jangan commit.

Tugas wajib:

1. `SEED-08`: perbaiki `computeSnapshotDigest()` agar SHA-256 mencakup seluruh nested field dari sembilan tabel. Jangan gunakan replacer array yang menghapus property nested. Gunakan serialisasi snapshot yang deterministik dan content-sensitive.
2. Tambahkan unit test hermetis yang membuat dua snapshot dengan jumlah row identik tetapi satu nested ID/value/timestamp berbeda; digest wajib berbeda. Dua snapshot yang identik secara semantik wajib menghasilkan digest sama.
3. Pertahankan full structural equality pada kedua live rollback test. Jalankan kembali fault injection setelah 5 media upsert dan pada invitation ke-3; buktikan digest dan struktur sama dengan baseline.
4. `SEED-09`: reconcile `asset.format` dari upload report terhadap `canonical.format` sebelum memvalidasi URL. Gunakan aturan canonical yang eksplisit; hanya normalisasi `jpg`/`jpeg` bila memang diterima contract proyek.
5. Pass format kanonis, bukan report format, sebagai `expectedFormat` ke `validateCloudinaryAssetBinding()`.
6. Tambahkan mutation test melalui production `reconcileUploadReport()` yang mengubah report `format` dan URL extension secara bersamaan (misalnya canonical JPG menjadi PNG). Test wajib membuktikan perubahan tersebut ditolak sebelum transaksi.
7. Pastikan 31 record upload report produksi tetap lulus, 82 row database tetap sama, dan tidak ada network request maupun external mutation.

Verifikasi minimum:
- `pnpm install --frozen-lockfile`
- `pnpm prisma:validate`
- `pnpm test`
- `pnpm test:db`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm seed:verify`
- `git diff --check` dan credential scan

Batasan keras:
- Hanya database lokal `localhost:5432/ayawarta` yang boleh diakses.
- Jangan seed ulang bila tidak diperlukan untuk test; jangan menyentuh Aiven, Vercel, Firestore, atau Cloudinary.
- Jangan mengubah data pelanggan, schema, public ID, URL produksi, UI, route, atau dependency.
- Jangan commit.

Handoff wajib memetakan `SEED-08` dan `SEED-09` ke koreksi, menunjukkan unit proof digest content-sensitive, mutation proof canonical-format binding, dua hasil rollback snapshot, seluruh verification, external effects, dan status `not committed`.
```

## Finalize and Commit Stage 6

```text
Stage 6 — Idempotent Local Seed, termasuk koreksi Stage 6.1 sampai 6.3, telah ACCEPTED oleh reviewer.

Kerjakan finalisasi saja:
1. Baca `docs/reviews/stage-06-idempotent-seed-review.md` dan pastikan statusnya ACCEPTED.
2. Pastikan worktree hanya berisi implementasi, test, script, dan dokumentasi Stage 6 yang telah direview. Jangan menambah fitur atau refactor baru.
3. Jalankan pemeriksaan akhir: `pnpm test`, `pnpm test:db`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm seed:verify`, dan `git diff --check`.
4. Pastikan `.env.local`, credential, binary media, `.media-migration/`, dan file tidak terkait tidak masuk staging.
5. Stage seluruh scope Stage 6 yang diterima dan periksa `git diff --cached --check` serta daftar file staged.
6. Commit dengan pesan tepat: `feat: add idempotent invitation seed`.
7. Laporkan short/full commit hash, daftar file committed, hasil gate, row count database lokal, external effects, dan `git status --short --branch`.

Batasan:
- Jangan amend commit lama.
- Jangan menjalankan seed ke Aiven atau database non-lokal.
- Jangan mengubah Cloudinary, Firestore, Vercel, route publik, atau UI.
- Jangan memulai Stage 7 dalam handoff ini.
```

## Stage 7 — Public Route Cutover

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 7 — Public Route Cutover. Stage 6 telah diterima.

Baca semua dokumen wajib di AGENTS.md, khususnya docs/architecture.md dan implementation plan Phase 7.

Tugas:
1. Ganti lookup invitation hard-coded pada route publik dengan repository Prisma server-only.
2. Gunakan notFound() untuk slug tidak dikenal.
3. Jadikan default-preview record/slug eksplisit, tanpa fallback tersembunyi.
4. Pertahankan Classic Rose props melalui mapper.
5. Ubah invite-link page agar data diperoleh melalui server boundary yang aman.
6. Pastikan Next Image tetap menerima delivery URL Cloudinary.
7. Smoke-test empat invitation, invite-link page, dan unknown slug 404.
8. Jalankan typecheck, tests, lint, dan production build.

Batasan:
- Jangan hapus hard-coded source atau file media lokal dulu.
- Jangan refactor visual besar, Firestore, atau admin dashboard.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib menyertakan route results, 404 proof, client/server boundary review, dan build result.
```

## Finalize and Commit Stage 7

```text
Stage 7 — Public Route Cutover telah ACCEPTED oleh reviewer.

Kerjakan finalisasi saja:
1. Baca `docs/reviews/stage-07-public-route-cutover-review.md` dan pastikan statusnya ACCEPTED.
2. Pastikan worktree hanya berisi route cutover, InviteClientView extraction, route tests/smoke script, image sizing hints yang telah direview, konfigurasi test terkait, dan dokumentasi Stage 7.
3. Jalankan pemeriksaan akhir: `pnpm test`, `pnpm test:db`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, dan `git diff --check`.
4. Jalankan production server lokal pada port non-default yang kosong, jalankan `pnpm smoke:routes`, lalu hentikan server dengan bersih.
5. Pastikan `.env.local`, credential, binary media, `.media-migration/`, database dump, dan file tidak terkait tidak masuk staging.
6. Periksa `git diff --cached --check` dan daftar file staged.
7. Commit dengan pesan tepat: `feat: cut over public invitation routes`.
8. Laporkan short/full commit hash, daftar file committed, seluruh gate, route/404 result, external effects, dan `git status --short --branch`.

Batasan:
- Jangan amend commit lama.
- Jangan menghapus hard-coded data atau media lokal; itu tetap menunggu Stage 10.
- Jangan mengubah Aiven, Vercel, Cloudinary, Firestore, database data, atau schema.
- Jangan memulai Stage 8 atau melakukan refactor visual tambahan.
```

## Stage 8 — UI and Tailwind Design-System Refactor

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 8 — UI and Tailwind Design-System Refactor. Stage 7 telah diterima.

Baca semua dokumen wajib di AGENTS.md, terutama docs/design.md dan implementation plan Phase 8.

Skill wajib: gunakan `frontend-design` dan `tailwind-design-system`. Setelah implementasi, gunakan `web-design-guidelines` sebagai audit. Ikuti docs/agent/skills.md; skill tidak boleh mengubah refactor ini menjadi redesign.

Tugas:
1. Pertahankan UI saat ini sebagai visual baseline.
2. Tambahkan semantic Tailwind v4 tokens untuk landing UI tanpa memaksakan token landing ke Classic Rose.
3. Ekstrak hanya primitive yang disetujui: Container, SectionHeader, Button, IconButton, dan framed-image primitive bila benar-benar reusable.
4. Pindahkan static landing data ke typed config.
5. Ubah nama file komponen React menjadi PascalCase secara konsisten dan perbaiki import.
6. Kecilkan Client Component boundary; pertahankan client hanya untuk interaksi/browser API/motion/Firestore.
7. Satukan motion preset dan dukung prefers-reduced-motion.
8. Perbaiki focus state, aria-current, label, alt text, touch target, dan overflow yang terbukti.
9. Verifikasi breakpoint 360, 390–430, 768, 1280, dan 1440 px.
10. Jalankan typecheck, tests, lint, dan build.

Batasan:
- Ini refactor, bukan redesign. Jangan ganti brand, ilustrasi, section order, copy utama, atau gaya Classic Rose.
- Jangan cleanup data/media atau mengubah arsitektur database/auth.
- Dokumentasikan semua perbedaan visual yang disengaja.
- Jangan commit. Berhenti setelah handoff untuk review visual dan teknis.

Handoff wajib menyertakan daftar perubahan visual, viewport yang diperiksa, accessibility/reduced-motion result, screenshot bila tersedia, dan build result.
```

## Stage 8.1 — UI Refactor Correction

```text
Stage 8 — UI and Tailwind Design-System Refactor received CHANGES REQUIRED.

Read `docs/reviews/stage-08-ui-design-system-review.md` completely and correct only findings UI-01 through UI-09. Do not start Stage 9, do not clean up legacy invitation data/media, and do not commit.

Required skills:
- `frontend-design`: preserve the Stage 7 visual baseline while correcting demonstrated layout defects.
- `tailwind-design-system`: complete the Tailwind v4 token and primitive contracts without creating a broad component library.
- `web-design-guidelines`: run the final audit and report remaining findings in `file:line` format.

Required corrections:
1. Fix the invalid `FramedImage` syntax and strengthen its valid prop combinations. All compile/test gates must run from the same final worktree reported in the handoff.
2. Revert material redesign in `ThemeSection` and `PricingSection`. Preserve Stage 7 copy, initial visible theme count, category/filter behavior, card/action composition, popular-plan treatment, payment-method placement, and overall geometry. Keep only approved structural, focus, touch-target, label, overflow, and reduced-motion improvements.
3. Remove unnecessary full-section Client Component boundaries from static feature, pricing, and testimonial content. Isolate Framer Motion behavior in the smallest practical client helper/island. Keep Header, hero carousel, and theme filtering client-side where interaction requires it.
4. Stop hero carousel autoplay when reduced motion is requested. Add a visible, keyboard-operable pause/resume control for autoplay and preserve manual previous/next controls. Test pause, resume, and reduced-motion behavior.
5. Ensure every focusable theme-card action is visible on keyboard focus and usable on touch. Do not add bookmark persistence; remove or honestly disable dead actions. Add `aria-controls`, Escape close, and focus-return behavior to the mobile menu disclosure.
6. Add the missing standard content-width token category and consume semantic tokens in shared primitives where doing so preserves the exact baseline appearance. Make class overrides deterministic (Tailwind conflict merging or a narrower non-conflicting API). Avoid hard-coded duplication the tokens were introduced to replace.
7. Correct the 360–430 px hero CTA layout so labels do not wrap into mismatched button heights. Verify actual CSS viewport widths at 360, 390–430, 768, 1280, and 1440 px. Fix overflow in owning components; do not rely on root `overflow-x: hidden` as proof.
8. Resolve the Web Interface Guidelines findings: replace `transition-all` with explicit properties, use the ellipsis character, give the search input appropriate `name`/autocomplete/spellcheck semantics, account for sticky-header scroll margin, and document any intentionally deferred item.
9. Replace prop-only primitive tests with rendered contract tests. Add focused interaction/accessibility tests for carousel controls, reduced motion, mobile menu, and theme-card keyboard visibility. Keep tests hermetic.
10. Preserve correct Stage 8 work already present: typed landing config, PascalCase file names/imports, page-level Server Component, Server Footer, skip link, focus ring, `aria-current`, image alternatives, and Classic Rose isolation.

Verification required on the final uncommitted worktree:
- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm test:db`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- start a local production server on an unused port and run `pnpm smoke:routes`
- `git diff --check`
- staged/unstaged scope and credential scan

Visual evidence required:
- before/after comparison against committed Stage 7 for the changed landing sections;
- screenshots or equivalent browser evidence at actual CSS widths 360, 390–430, 768, 1280, and 1440 px;
- keyboard traversal results for skip link, header disclosure, carousel, theme filters/cards, pricing CTAs, and footer links;
- reduced-motion proof showing autoplay disabled and nonessential movement removed;
- per-viewport `document.documentElement.scrollWidth <= window.innerWidth` evidence without masking defects at the root.

Handoff must map UI-01 through UI-09 to exact corrections and tests, list intentional visual differences (expected to be accessibility-only), name the three required skills exactly, report all final gate results, disclose external effects, and end with `Commit: not committed`.
```

## Stage 8.2 — Final Interaction and Evidence Correction

```text
Stage 8.1 — UI Refactor Correction received CHANGES REQUIRED after independent browser review.

Read `docs/reviews/stage-08-ui-design-system-review.md` completely, especially the Stage 8.1 correction review. Correct only UI-10 through UI-13. Preserve all accepted Stage 8.1 work, do not start Stage 9, do not clean up legacy data/media, and do not commit.

Required skills:
- `frontend-design`: preserve the restored Stage 7 visual baseline while making existing controls truthful and usable.
- `tailwind-design-system`: keep primitive/token contracts coherent; do not expand the component library.
- `web-design-guidelines`: rerun the final interaction/accessibility audit and report remaining findings as `file:line`.

Required corrections:
1. Remove all enabled dead controls in the theme and pricing sections while preserving card geometry and the current Stage 7 composition:
   - Set each external/open-preview action to the existing approved template route `/wedding/classic-rose/red`, preserving its new-tab behavior and accessible name.
   - Render each visible Preview action as a semantic link to `/wedding/classic-rose/red` in the current tab. Do not create per-theme routes in this stage.
   - Keep the color swatches visible for baseline composition, but mark each one `disabled` and `aria-disabled="true"` with a truthful “filter warna segera hadir” label/title. Give every swatch a minimum 44 × 44 px touch target. Do not implement color selection/filtering.
   - Render every pricing CTA as a semantic link to the existing `#tentang` contact section. Do not add checkout, WhatsApp, forms, or external messaging integration.
   - Keep bookmark controls honestly disabled as already implemented.
2. Correct the hero autoplay control for `prefers-reduced-motion`:
   - autoplay must remain disabled;
   - manual previous/next controls must remain usable;
   - under reduced motion, render the existing central control as disabled with `aria-disabled="true"`, a stopped/pause-state icon, and the exact accessible label/title `Putar otomatis dinonaktifkan karena preferensi gerak dikurangi`;
   - under ordinary motion, keep the operable pause/resume toggle with truthful labels and icons;
   - do not show “Jeda” when nothing is playing and do not offer an inoperable resume action.
3. Replace source-string-only interaction claims with focused rendered behavior tests using the existing test stack:
   - fake-timer proof that ordinary autoplay advances, pause stops it, and resume restarts it;
   - reduced-motion proof for autoplay and the visible/accessible toggle state;
   - mobile menu open, Escape close, and focus return;
   - destination/disabled behavior for one representative card per action type plus an assertion that all rendered instances share the same valid destination/disabled contract; new-tab preview behavior must be asserted explicitly rather than inferred from the current tab URL.
   Architectural source scans may remain only as supplemental checks.
   Small dev-only test dependencies and Vitest environment configuration are permitted only if the current stack cannot render client interactions; record any such dependency and lockfile change. Do not add a runtime UI dependency solely for tests.
4. Correct breakpoint evidence. Keep the Stage 7-compatible `lg:grid-cols-3` pricing breakpoint unchanged and report one pricing column at 768 px. Evidence belongs in the handoff only; do not create another evidence document.
5. Keep the current 360–430 px CTA fix, Server Component boundaries, `AnimateIn` island, FramedImage contract, Tailwind tokens, search semantics, scroll margins, mobile-menu disclosure, and Classic Rose isolation unchanged unless a minimal adjustment is required by the findings above.

Verification required on the same final uncommitted worktree:
- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm test:db`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- start a production server on an unused port and run `PORT=<that-port> pnpm smoke:routes`
- `git diff --check`
- staged/unstaged scope and credential scan

Browser evidence required at exact CSS viewport widths:
- 360, 390, 430, 768, 1280, and 1440 px;
- report the actual theme and pricing column counts at each sampled width;
- keyboard-test the mobile menu, autoplay controls, theme actions, and pricing actions. Footer links are regression-only checks and do not authorize Footer changes;
- prove every enabled control changes route/state as promised, and every unavailable control is disabled or absent;
- prove manual previous/next still work under reduced motion;
- for overflow proof, temporarily override the root `overflow-x` to `visible` in the browser test, then record `document.documentElement.scrollWidth <= window.innerWidth` and inspect owning-component bounds at every sampled width. Restore the override afterward; do not change the production root rule in this correction.

Handoff must map UI-10 through UI-13 to exact corrections and behavior tests, distinguish automated test evidence from manual browser evidence, list the three required skills exactly, report external effects, and end with `Commit: not committed`.
```

## Finalize and Commit Stage 8

```text
Stage 8 — UI and Tailwind Design-System Refactor, including correction rounds 8.1 and 8.2, has been ACCEPTED by the reviewer.

Perform finalization only:
1. Read `docs/reviews/stage-08-ui-design-system-review.md` and confirm the current status is `ACCEPTED — READY FOR FINALIZATION`.
2. The exact accepted file manifest is below. Stage only these paths, including both documentation files; any other changed or untracked path is out of scope and must stop finalization for reviewer guidance:
   - `docs/agent/prompts.md`
   - `docs/reviews/stage-08-ui-design-system-review.md`
   - `package.json`
   - `pnpm-lock.yaml`
   - `scripts/smoke-test-routes.ts`
   - `src/app/globals.css`
   - `src/app/page.tsx`
   - the seven case-only landing renames and their final PascalCase contents: `FeatureSection.tsx`, `Footer.tsx`, `Header.tsx`, `HomeSection.tsx`, `PricingSection.tsx`, `TestimonialSection.tsx`, and `ThemeSection.tsx` under `src/app/components/landing/`
   - `src/components/ui/AnimateIn.tsx`
   - `src/components/ui/Button.tsx`
   - `src/components/ui/Container.tsx`
   - `src/components/ui/FramedImage.tsx`
   - `src/components/ui/IconButton.tsx`
   - `src/components/ui/SectionHeader.tsx`
   - `src/components/ui/design-system.test.ts`
   - `src/components/ui/landing-interaction.test.tsx`
   - `src/components/ui/primitives.test.tsx`
   - `src/config/landing.ts`
   - `src/lib/cn.ts`
   - `src/lib/motion.ts`
3. Do not add features, redesign sections, change copy/data contracts, alter destinations, or refactor unrelated files during finalization.
4. Run the final gates from the same worktree:
   - `pnpm install --frozen-lockfile`
   - `pnpm test`
   - `pnpm test:db`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm build`
   - start a production server on an unused non-default port and run `PORT=<that-port> pnpm smoke:routes`, then stop it cleanly
   - `pnpm seed:verify`
   - `git diff --check`
5. Confirm `.env.local`, credentials, binary media, `.media-migration/`, database dumps, and unrelated files are absent from staging. Preserve the case-only PascalCase renames correctly in Git.
6. Stage the exact accepted manifest only. Inspect `git diff --cached --check` and compare `git diff --cached --name-status` path-for-path against the manifest, including both sides of case-only renames. Scan the cached file list and complete cached diff, including newly added files, for credential-like key names or values (`DATABASE_URL`, auth/admin secrets, Cloudinary secrets, Firebase private credentials, passwords, tokens, and private keys). Fail closed on any suspected real credential without printing its value. Confirm `.env.local` is absent and `happy-dom` remains dev-only.
7. Commit with the exact message: `refactor: standardize landing UI system`.
8. Report the short/full commit hash, exact committed file list, all gate results, browser/smoke results, external effects, and `git status --short --branch`.

Boundaries:
- Do not amend prior commits.
- Do not start Stage 9.
- Do not delete legacy invitation data or media; cleanup remains Stage 10.
- Do not mutate PostgreSQL data, Cloudinary, Firestore, Aiven, or Vercel.
- If any final gate fails—source, environment, infrastructure, database, or otherwise—stop without committing and report it; do not repair source, config, or data during finalization. The only permitted exception is one unchanged retry of a clearly transient `next/font`/network failure, which must be disclosed. If that retry fails, stop.
```

## Stage 8 Finalization Whitespace Correction

```text
The Stage 8 implementation is accepted, but post-commit audit of `fb2c039c7363792f3e4eb758c21cf2cc2d7c038e` found eight extra blank lines at EOF. Perform only this finalization correction. Do not amend the existing commit, do not modify UI behavior, and do not start Stage 9.

Read `docs/reviews/stage-08-ui-design-system-review.md`, especially `Post-Commit Finalization Audit`.

Authorized source edits — remove only the final surplus blank line while retaining exactly one normal newline at EOF:
- `src/components/ui/AnimateIn.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Container.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/landing-interaction.test.tsx`
- `src/config/landing.ts`
- `src/lib/motion.ts`

Authorized documentation edits:
- In `docs/reviews/stage-08-ui-design-system-review.md`, after every verification below passes, change the top-level status to `ACCEPTED — FINALIZED` and the Post-Commit Finalization Audit status to `ACCEPTED`.
- Keep this correction prompt in `docs/agent/prompts.md` as audit history; do not alter other prompts.

Required verification:
1. Before editing, reproduce `git show --check fb2c039` and confirm it reports only the eight known EOF findings.
2. After editing, run `git diff --check`, `pnpm test`, `pnpm typecheck`, and `pnpm lint`.
3. Stage only the eight source files plus the two authorized documentation files.
4. Run `git diff --cached --check` and verify the cached file list contains exactly those ten paths.
5. Commit with the exact message: `chore: fix stage 8 EOF whitespace`.
6. Run `git show --check HEAD` and `git diff fb2c039^ HEAD --check`; both must produce no whitespace findings.
7. Report the short/full follow-up hash, exact committed paths, verification results, and clean `git status --short --branch`.

Stop without committing if any other file changes, any gate fails, or the original audit contains findings beyond the eight listed paths. Do not repair unrelated code, configuration, data, or infrastructure.
```

## Stage 9 — Firestore Isolation and Wishes Hardening

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 9 — Firestore Isolation and Wishes Hardening. Stage 8 telah diterima. Planner telah menyiapkan prompt ini sebagai satu-satunya perubahan awal yang diizinkan pada `docs/agent/prompts.md`; jangan edit, revert, stage, atau commit file tersebut. Bila preflight menemukan perubahan lain, berhenti dan laporkan. Jangan mengerjakan Stage 10, deployment, atau fitur admin.

Baca `AGENTS.md` dan seluruh dokumen yang diwajibkannya. Fokuskan pembacaan pada:
- `docs/superpowers/specs/2026-10-21-ayawarta-refactor-cloudinary-prisma-design.md`
- `docs/superpowers/plans/2026-10-21-ayawarta-refactor-cloudinary-prisma-plan.md` Phase 9
- `docs/architecture.md` bagian Runtime Boundaries dan Wishes and RSVP Data Flow
- `docs/design.md` bagian Server and Client Components
- `docs/qa-checklist.md` bagian Firestore dan UI/Accessibility
- `docs/agent-workflow.md` Stage 9
- `docs/agent/skills.md` (Stage 9 tidak memakai skill tambahan)

Kondisi dan kontrak yang sudah diverifikasi reviewer:
- Firestore tetap menjadi satu-satunya penyimpanan real-time untuk ucapan dan RSVP. Jangan memindahkan atau menduplikasi jalur ini ke PostgreSQL/Prisma.
- Path collection produksi yang wajib dipertahankan persis adalah `wishes/{invitationSlug}/messages`.
- Record yang sudah ada memakai field `name`, `message`, `attendance`, dan `timestamp`.
- Nilai attendance historis yang harus tetap dapat dibaca adalah `"Hadir"`, `"Tidak Hadir"`, dan `"Belum Konfirmasi"`. Form baru hanya boleh menulis `"Hadir"` atau `"Tidak Hadir"`; jangan rename, translate, atau menambah nilai baru.
- Query tetap mengurutkan `timestamp` secara descending.
- Empat slug produksi adalah `rika-fauzi`, `shidqi-mita`, `dudi-aini`, dan `default-preview`.
- Firebase web config `NEXT_PUBLIC_FIREBASE_*` memang client-capable. Jangan mengubah nama key, memindahkannya ke server-only env, atau mencetak nilainya.

Preflight wajib dan read-only:
1. Pastikan branch `develop`, catat HEAD awal, dan pastikan satu-satunya diff awal adalah `docs/agent/prompts.md` milik planner. Bila ada file lain yang modified/staged/untracked, berhenti. Pisahkan file prompt planner dari daftar file implementasi Stage 9 pada handoff.
2. Audit `src/lib/firebase.ts`, `WishesSection.tsx`, pemanggilnya, serta test yang relevan. Catat path, query ordering, bentuk record, nilai attendance, dan lifecycle saat ini sebelum mengubah kode.
3. Ekstrak hanya nama key Firebase dari environment bila perlu; jangan pernah menampilkan nilai.
4. Jangan membaca, menulis, menghapus, atau memperbarui dokumen Firestore produksi selama preflight.

Tugas implementasi wajib:
1. Bentuk feature boundary client-safe yang jelas untuk wishes/RSVP: domain types dan validasi/normalisasi record terpisah dari adapter Firebase. Firebase SDK hanya boleh berada pada client-side adapter atau client island yang memang membutuhkannya. Jangan biarkan Prisma, server-only modules, Cloudinary mutator, atau credential server masuk ke boundary ini.
2. Pertahankan exact collection builder `wishes/{invitationSlug}/messages` untuk subscription dan submission. Centralize contract tersebut agar read/write tidak dapat menyimpang, dan tambahkan test yang membuktikan segment path persis sama. Builder menerima slug undangan valid secara umum—jangan hard-code allowlist empat slug—dengan kontrak `^[a-z0-9]+(?:-[a-z0-9]+)*$`; tolak string kosong, slash/backslash, whitespace, traversal, atau karakter lain sebelum SDK dipanggil.
3. Buat adapter/gateway yang dapat di-inject pada test. Default production adapter tetap memakai Firebase SDK dan real-time `onSnapshot`; unit/component test harus memakai fake hermetis tanpa network. Susun production adapter di atas injectable low-level SDK port agar path/query/payload dapat diuji tanpa memanggil Firebase asli.
4. Subscription harus:
   - menjamin paling banyak satu subscription aktif untuk satu mounted instance/generation;
   - tetap memakai `orderBy("timestamp", "desc")`;
   - menyediakan handler data dan handler error;
   - mengembalikan unsubscribe;
   - memanggil unsubscribe tepat sekali untuk setiap subscription yang pernah dibuat, termasuk pada unmount dan sebelum resubscribe ketika slug berubah;
   - mengabaikan callback subscription lama setelah cleanup agar state slug baru tidak tertimpa;
   - tidak crash bila snapshot kosong atau satu record lama malformed.
5. Parsing record harus fail-safe dan kompatibel dengan data lama. Parser Firebase menerima timestamp-like object dengan fungsi `toDate()` yang menghasilkan `Date` valid, lalu mengubahnya menjadi `Date` domain. Bila satu document malformed (field salah/hilang, attendance tidak dikenal, atau timestamp invalid), skip document itu, tetap render seluruh sibling record yang valid, dan tampilkan warning generik nonfatal; jangan menjatuhkan seluruh subscription/list. Jangan menampilkan raw Firebase error, stack trace, project ID, document payload, atau config value ke pengguna/log test.
6. Submission harus tetap menulis tepat `{ name, message, attendance, timestamp }` ke path yang sama. Default adapter tetap mengirim `timestamp: new Date()` seperti implementasi saat ini sehingga Firestore menyimpannya sebagai timestamp; jangan menggantinya dengan `serverTimestamp()` pada Stage 9. Trim `name` dan `message` sebelum validasi/write, tolak nilai kosong/whitespace dan attendance di luar dua nilai form yang disetujui.
7. Cegah double-submit: selama write berjalan, submit berikutnya tidak boleh memicu write kedua. Tombol wajib disabled dan mengumumkan state pengiriman. Kosongkan form hanya setelah write sukses; bila write gagal, pertahankan input dan pilihan attendance agar pengguna dapat mencoba lagi.
8. Lengkapi state UI tanpa redesign Classic Rose:
   - loading awal yang dapat dikenali;
   - empty state yang ramah ketika belum ada ucapan;
   - daftar real-time setelah snapshot berhasil;
   - subscription failure dengan pesan generik dan tombol retry yang membersihkan generation lama, menghapus error, kembali ke loading, lalu membuat tepat satu subscription generation baru;
   - validation error yang terhubung secara aksesibel ke field/form;
   - submitting dan submission failure state;
   - `aria-live` yang proporsional untuk feedback status/error;
   - focus ring yang terlihat, label native, serta semua button/control minimum 44×44 CSS px.
9. Pertahankan komposisi visual, copy utama, tema, motion, urutan section, dan layout Classic Rose. Refactor hanya sejauh yang dibutuhkan untuk boundary dan states; jangan merombak desain undangan.
10. Hapus `console.error` yang mencetak raw Firebase error. Bila perlu logging, gunakan pesan tetap/sanitized tanpa payload/config/stack trace.
11. Tambahkan automated boundary scan pada `src/app/**`, `src/features/**`, dan `src/lib/**`. Yang dilarang adalah direct import Firebase/Firestore dari Server Component/server-only module/Prisma/route loader, atau dependency path ke Firebase yang melewati file tanpa boundary `"use client"`. Server Component tetap boleh mengimpor dan merender Client Component yang memiliki boundary eksplisit; jangan salah menandai graph normal server-to-client-island sebagai pelanggaran. Jangan memaksa seluruh invitation view menjadi Server Component.
12. Scope file implementasi yang diizinkan: `src/features/wishes/**` (baru), `src/lib/firebase.ts`, `src/app/(templates)/wedding/classic-rose/[variant]/components/WishesSection.tsx`, dan test khusus Stage 9. Perubahan kecil pada Vitest config hanya boleh dilakukan bila wajib untuk menjalankan component test dan harus dijustifikasi. Jangan mengubah komponen/route lain tanpa berhenti dan meminta review scope.

Test hermetis minimum:
- exact path `wishes/{slug}/messages` untuk subscribe dan submit;
- ordering `timestamp desc`;
- subscribe, data emission, empty snapshot, subscription error, retry, unsubscribe on unmount, dan unsubscribe/resubscribe saat slug berubah;
- callback stale setelah cleanup tidak mengubah UI;
- React Strict Mode/dev probe tidak diuji sebagai “hanya satu subscribe sepanjang proses”; acceptance-nya adalah maksimum satu subscription aktif pada satu waktu dan satu unsubscribe untuk setiap subscription yang dibuat;
- existing `Hadir`, `Tidak Hadir`, dan `Belum Konfirmasi` tetap render tanpa migrasi;
- timestamp-like object dengan `toDate()` valid dipetakan ke `Date`; invalid date/timestamp dan malformed record di-skip, warning generik tampil, dan sibling valid tetap render;
- validasi whitespace dan missing attendance;
- payload write hanya berisi empat field yang disetujui dengan nilai yang sudah di-trim;
- double-submit menghasilkan satu write;
- sukses mereset form, gagal mempertahankan form dan menampilkan pesan generik;
- attendance awal `null`/belum dipilih; write sukses mereset kembali ke `null`, write gagal mempertahankan pilihan;
- loading, empty, error, retry, dan submitting state benar-benar dirender;
- retry membersihkan error, kembali ke loading, unsubscribe generation gagal, membuat satu generation baru, dan menolak callback stale;
- tidak ada network request atau Firestore production write pada `pnpm test`: mock modul Firebase/Firestore secara fail-closed sehingga `initializeApp`, `getFirestore`, `onSnapshot`, atau `addDoc` asli melempar bila tersentuh; assert fake write spy hanya menerima panggilan test dan default adapter yang terhubung ke SDK asli tidak pernah terinstansiasi (adapter contract tetap boleh diuji dengan injected fake SDK port).

Kebijakan smoke test dan external effects:
- Pada Stage 9 ini JANGAN melakukan write/delete/update nyata ke Firestore produksi. Uji alur baca-kirim secara behavior-level menggunakan injected fake gateway/component test.
- Jangan menambahkan test document ke salah satu dari empat slug produksi.
- Jangan mengubah Firebase console, Firestore rules, indexes, project configuration, atau environment values.
- Bila live write dianggap mutlak diperlukan untuk membuktikan sesuatu yang tidak dapat diuji hermetis, berhenti dan minta otorisasi pemilik terlebih dahulu; jangan menganggap instruksi Stage 9 sebagai izin mutasi data produksi.
- Route smoke test boleh dijalankan terhadap local production server, tetapi jangan submit form ke Firebase. Buktikan halaman dan state awal tetap render tanpa menyebabkan external mutation.

Verifikasi minimum, menggunakan pnpm 10.34.7:
- `pnpm install --frozen-lockfile`
- `pnpm test`
- test khusus wishes/Firestore interaction dan boundary
- `pnpm typecheck`
- `pnpm lint` (target 0 error, 0 warning)
- `pnpm build`
- `pnpm seed:verify` sebelum dan sesudah gate lain untuk membuktikan count/repository reconstruction tetap 82 row; jangan menjalankan `pnpm test:db` pada Stage 9 karena suite integrasi seed melakukan transaksi tulis/rollback dan tidak relevan dengan Firestore
- `pnpm smoke:routes` terhadap local production server tanpa submit Firestore
- `git diff --check`
- scan credential, raw Firebase error logging, client/server boundary, dan perubahan collection path/attendance literal

Batasan keras:
- Jangan mengubah Prisma schema/migration, seed, data PostgreSQL, Auth.js, Cloudinary, media, landing UI, admin UI, Aiven, atau Vercel.
- Jangan mengubah dependency, `package.json`, atau lockfile. Bila perubahan dependency ternyata mutlak diperlukan, berhenti dan minta persetujuan reviewer; agent tidak boleh menyetujui pengecualian sendiri.
- Jangan memindahkan wishes/RSVP ke PostgreSQL atau membuat API/WebSocket pengganti real-time Firestore.
- Jangan mengubah collection path, field record, nilai attendance, ordering, atau menulis migrasi/backfill Firestore.
- Jangan menghapus source/data/media lama; cleanup hanya Stage 10.
- Jangan commit. Berhenti setelah seluruh verifikasi selesai dan kirim handoff untuk review.

Handoff wajib berformat:
- `Stage: Stage 9 — Firestore Isolation and Wishes Hardening`
- `Status: ready for review` atau `blocked`
- daftar file berubah dan alasan setiap perubahan;
- before/after boundary diagram singkat;
- exact collection path, query ordering, read-compatible attendance values, dan write-only attendance values;
- bukti subscription lifecycle/unsubscribe/stale-callback protection;
- bukti seluruh loading/empty/error/retry/submitting/success/failure state;
- test matrix dengan jumlah test dan hasil command lengkap, termasuk dua hasil `seed:verify` yang identik;
- bukti boundary scan serta 0 raw credential/error leak;
- `Data or external effects` yang pada implementasi ini harus menyatakan 0 Firestore writes, 0 Firebase console/rules/index changes, 0 PostgreSQL writes/persistent changes, dan 0 external service mutations;
- risks/follow-ups;
- `Skills used: none`;
- `Commit: not committed`.
```

## Stage 9.1 — Firestore Boundary and Evidence Corrections

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 9.1 — Firestore Boundary and Evidence Corrections. Baca `docs/reviews/stage-09-firestore-isolation-review.md` dan petakan setiap perubahan ke `FIRE-01` sampai `FIRE-06`.

Kondisi awal:
- Implementasi Stage 9 masih uncommitted.
- `docs/agent/prompts.md` dan `docs/reviews/stage-09-firestore-isolation-review.md` adalah dokumen milik planner. Jangan edit, revert, stage, atau commit keduanya.
- Jangan mulai Stage 10 dan jangan melakukan live Firestore read/write.

Tugas wajib:

1. `FIRE-01`: ubah kontrak hasil subscription agar membawa valid wishes dan metadata aman `skippedCount`. Adapter harus menghitung document malformed yang di-skip tanpa menyimpan/mencetak payload. UI tetap merender sibling valid, menampilkan warning generik nonfatal bila `skippedCount > 0`, tidak salah menampilkan empty state bila seluruh document malformed, dan membersihkan warning setelah snapshot bersih. Tambahkan adapter dan rendered component tests.
2. `FIRE-02`: pada test wishes yang mengimpor production adapter/component, mock `firebase/app` dan `firebase/firestore` secara hoisted/fail-closed. Spy `initializeApp`, `getApps`, `getFirestore`, `collection`, `query`, `orderBy`, `onSnapshot`, dan `addDoc` harus melempar bila tersentuh tanpa injected port serta terbukti memiliki zero calls pada component tests. Adapter contract tetap diuji melalui injected fake low-level port; tidak boleh ada network.
3. `FIRE-03`: jadikan boundary eksplisit dan graph-safe:
   - beri `"use client"` pada `src/lib/firebase.ts`;
   - hapus export `db` Proxy yang tidak lagi memiliki consumer;
   - jangan re-export `firebase-adapter.ts` dari barrel pure `src/features/wishes/index.ts`; import adapter langsung hanya dari Client Component;
   - perbarui boundary test agar mengikuti static relative/alias imports dan re-exports pada `src/app/**`, `src/features/**`, dan `src/lib/**`. Traversal dari server root harus berhenti pada file dengan `"use client"`; direct atau transitive path ke Firebase sebelum boundary adalah failure. Server Component yang mengimpor Client Component adalah graph yang valid.
4. `FIRE-04`: buat gateway test terkontrol yang menyimpan callback dan unsubscribe per subscription generation. Buktikan secara behavior-level:
   - retry meng-unsubscribe generation lama tepat sekali, membersihkan error, kembali loading, dan membuat tepat satu replacement;
   - slug change melakukan cleanup yang sama;
   - maksimum satu subscription aktif;
   - callback data maupun error dari generation lama setelah replacement aktif tidak mengubah UI;
   - setiap subscription yang dibuat mendapat tepat satu unsubscribe, termasuk cleanup/unmount/Strict Mode probe.
5. `FIRE-05`: tambahkan success feedback yang aksesibel setelah write berhasil, misalnya `role="status"` dengan `aria-live="polite"` dan copy ringkas `Ucapan berhasil dikirim.`. Form tetap reset ke kosong/null. Feedback sukses harus dibersihkan ketika pengguna mulai mengedit atau mengirim ulang sehingga pesan lama tidak menyesatkan. Uji render dan lifecycle-nya.
6. `FIRE-06`: pisahkan error content validation, attendance validation, dan submit failure. `aria-invalid`/`aria-describedby` hanya boleh dipasang pada control yang benar-benar invalid. Attendance radiogroup wajib terhubung ke pesan missing-attendance. Network/write failure tetap menjadi form-level generic alert tanpa menandai field valid sebagai invalid. Tambahkan rendered accessibility assertions.
7. Pertahankan kontrak produksi tanpa perubahan: path `wishes/{invitationSlug}/messages`, `orderBy("timestamp", "desc")`, read attendance `Hadir | Tidak Hadir | Belum Konfirmasi`, write attendance `Hadir | Tidak Hadir`, dan payload tepat `{ name, message, attendance, timestamp: new Date() }`.

Verifikasi wajib:
- `pnpm install --frozen-lockfile`
- `pnpm seed:verify` sebelum gate lain
- `pnpm test`
- test khusus wishes adapter, boundary graph, component lifecycle, malformed warning, success status, dan accessibility associations
- `pnpm typecheck`
- `pnpm lint` (0 error, 0 warning)
- `pnpm build`; notice umur `baseline-browser-mapping` boleh dicatat sebagai non-blocking dan tidak boleh memicu dependency update
- `pnpm seed:verify` sesudah gate lain; hasil tetap 82 row
- `pnpm smoke:routes` tanpa menjalankan browser-side Firestore submission
- `git diff --check`
- scan package/lockfile, credential, raw Firebase error logging, exact collection path, attendance literals, dan external effects

Batasan keras:
- Jangan menjalankan `pnpm test:db`.
- Jangan mengubah dependency, `package.json`, lockfile, Prisma, PostgreSQL, Cloudinary, Auth.js, route, landing UI, Aiven, Vercel, Firebase console/rules/indexes, atau environment.
- Jangan melakukan live Firestore read/write/delete/update.
- Jangan memperluas redesign Classic Rose dan jangan mengerjakan cleanup Stage 10.
- Jangan commit. Berhenti setelah verifikasi dan kirim handoff review.

Handoff wajib memuat mapping `FIRE-01`–`FIRE-06`, snapshot metadata/warning behavior, bukti fail-closed SDK mocks zero-call, boundary graph algorithm dan mutation cases, exact lifecycle counters untuk retry/slug/unmount/Strict Mode, success/error accessibility behavior, seluruh hasil command, daftar file implementasi berubah (pisahkan dua docs planner), external effects harus nol, serta `Commit: not committed`.
```

## Stage 9.2 — TypeScript-AST Boundary Scanner Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 9.2 — TypeScript-AST Boundary Scanner Correction (`FIRE-07`). Baca bagian Stage 9.1 Correction Review dalam `docs/reviews/stage-09-firestore-isolation-review.md`.

Kondisi awal:
- Seluruh koreksi `FIRE-01` sampai `FIRE-06` sudah diterima dan tidak boleh direfaktor ulang.
- Implementasi Stage 9 masih uncommitted.
- `docs/agent/prompts.md` dan `docs/reviews/stage-09-firestore-isolation-review.md` adalah dokumen planner; jangan edit, revert, stage, atau commit.

Tugas tunggal `FIRE-07`:
1. Ganti parser regex pada `src/features/wishes/boundary.test.ts` dengan parser TypeScript Compiler API dari dependency `typescript` yang sudah ada. Jangan menambah dependency.
2. Ekstrak runtime module edges dari `ImportDeclaration` dan `ExportDeclaration` dengan string module specifier, baik single-line maupun multiline.
3. Abaikan edge yang sepenuhnya type-only (`import type`, `export type`, `import { type Foo }`, atau `export { type Foo } from`) karena edge tersebut terhapus saat runtime. Mixed declaration seperti `import { type Foo, value }` atau `export { type Foo, value } from` tetap runtime dan wajib ditelusuri. Empty-clause `import {} from` / `export {} from`, side-effect imports, default/namespace/named imports, `export * from`, dan value re-exports juga wajib dianggap runtime karena module tetap dimuat/dievaluasi; jangan memakai `.every()` kosong yang salah mengklasifikasikannya sebagai type-only.
4. Pertahankan resolusi alias `@/`, relative path, extension `.ts/.tsx/.js/.jsx`, dan directory index. Pertahankan cycle protection dan tampilkan full dependency chain saat violation ditemukan.
5. Traversal dari server root berhenti hanya ketika mencapai module dengan `"use client"` sebagai bagian dari directive prologue awal yang sah menurut JavaScript/Next.js (BOM dan komentar sebelum directive boleh; import, declaration, atau statement non-directive sebelumnya membuat string tersebut bukan boundary). Server Component → ordinary Client Component tetap valid. Namun direct/transitive import dari server graph ke target khusus `src/lib/firebase.ts` atau `src/features/wishes/firebase-adapter.ts` harus dicatat sebagai violation sebelum directive target itu dipakai sebagai stop; kedua module tersebut hanya boleh dicapai di balik Client Component island. Direct/transitive runtime path ke `firebase/app` atau `firebase/firestore` sebelum boundary juga violation.
6. Ubah mutation tests agar benar-benar memanggil detector yang sama terhadap isolated temporary module graph, bukan hanya mengetes helper parser/regex. Minimum cases:
   - direct multiline server import `firebase/firestore` terdeteksi;
   - transitive multiline `export * from` menuju firebase adapter terdeteksi dengan chain lengkap;
   - alias dan relative import sama-sama terdeteksi;
   - server → module `"use client"` → Firebase diizinkan;
   - graph cycle berhenti aman tanpa false negative/hang;
   - pure `import type` dan `export type` tidak menjadi runtime violation;
   - `import { type Foo }` dan `export { type Foo } from` diabaikan, sedangkan versi mixed type+value tetap ditelusuri;
   - empty-clause `import {} from` / `export {} from` tetap ditelusuri sebagai runtime edge;
   - mixed type+value import tetap dianggap runtime edge;
   - string `"use client"` setelah import/declaration/statement non-directive tidak dianggap client boundary;
   - scan repository aktual tetap menghasilkan 0 violation.
7. Temporary test graph harus dibuat di lokasi test-isolated yang aman, dibersihkan pada `finally/afterEach`, tidak ditulis ke `src`, dan tidak tersisa di Git status.

Verifikasi wajib:
- test khusus `boundary.test.ts` dengan mutation matrix di atas
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint` (0 error, 0 warning)
- `pnpm build` (age notice `baseline-browser-mapping` tetap non-blocking; jangan update dependency)
- `pnpm seed:verify` tetap 82 row
- `git diff --check`
- verifikasi tidak ada perubahan package/lockfile, external mutation, atau temporary fixture tersisa

Batasan keras:
- Scope source code hanya `src/features/wishes/boundary.test.ts`; helper test-only terpisah di `src/features/wishes/testing/**` boleh dibuat bila benar-benar diperlukan untuk membuat detector testable.
- Jangan mengubah production Firebase/wishes implementation, UI, contract data, dependency, package/lockfile, Prisma/PostgreSQL, Cloudinary, Auth.js, routes, Aiven, Vercel, atau environment.
- Jangan menjalankan `pnpm test:db`, live Firestore read/write, atau Stage 10 cleanup.
- Jangan commit. Berhenti setelah verification dan kirim handoff review.

Handoff wajib memuat algoritme AST, aturan type-only vs runtime edge, mutation matrix dengan hasil detector dan dependency chain, repository scan result, seluruh hasil gate, daftar file berubah (pisahkan planner docs), bukti temporary graph cleanup, external effects nol, dan `Commit: not committed`.
```

## Stage 9.2A — Namespace Re-export Boundary Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya koreksi Stage 9.2A (`FIRE-07A`). Baca bagian Stage 9.2 Correction Review dalam `docs/reviews/stage-09-firestore-isolation-review.md` serta kontrak Stage 9.2 di atas.

Temuan: parser AST pada `src/features/wishes/boundary.test.ts` belum menangani `ts.isNamespaceExport(statement.exportClause)`. `export * as wishes from "./firebase-adapter"` adalah runtime re-export, tetapi detector saat ini tidak menambahkan edge. Jalur server melalui barrel seperti itu luput dari boundary scan.

Tugas:
1. Perluas `extractRuntimeSpecifiers()` agar `ExportDeclaration` dengan `NamespaceExport` dan `moduleSpecifier` string menghasilkan runtime edge ketika `statement.isTypeOnly` false. Pertahankan pengabaian `export type * as ... from`.
2. Tambahkan mutation test yang menggunakan `findTransitiveFirebasePaths()` terhadap graph temporer: Server Component -> barrel dengan multiline `export * as ... from` -> `src/features/wishes/firebase-adapter.ts`; assert violation berisi full dependency chain. Tambahkan kasus `export type * as ... from` yang tidak menghasilkan violation. Gunakan fixture temporary dan cleanup yang sudah tersedia.
3. Pastikan semua mutation tests Stage 9.2 tetap lulus dan repository scan aktual menghasilkan nol violation.

Scope hanya `src/features/wishes/boundary.test.ts`. Jangan edit, revert, stage, atau commit dokumen planner (`docs/agent/prompts.md` dan `docs/reviews/stage-09-firestore-isolation-review.md`). Jangan mengubah production Firebase/wishes/UI, package/lockfile, Prisma/PostgreSQL, Cloudinary, Auth.js, route, environment, atau layanan eksternal. Jangan melakukan live Firestore read/write, menjalankan `pnpm test:db`, memulai Stage 10, atau commit.

Verifikasi: targeted `boundary.test.ts`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm seed:verify`, dan `git diff --check`; pastikan tidak ada fixture temporer tertinggal dan tidak ada external mutation.

Handoff: laporkan perubahan tepat pada NamespaceExport, hasil dua mutation cases, full chain, hasil repository scan dan seluruh gate, file berubah, external effects nol, serta `Commit: not committed`. Berhenti untuk review.
```

## Stage 9.2B — Type-only Namespace Graph Test Correction

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya koreksi `FIRE-07B` dalam Stage 9.2B. Baca `docs/reviews/stage-09-firestore-isolation-review.md` bagian Stage 9.2A Final Review.

Masalah: test negatif `export type * as ... from` saat ini memakai `import type { wishes }` di server root. Karena import root tersebut bukan runtime edge, detector tidak pernah mencapai barrel. Tes nol pelanggaran itu belum membuktikan bahwa `export type * as` diabaikan.

Ubah hanya fixture/test di `src/features/wishes/boundary.test.ts`:
1. Pada tes negatif, buat server root mengimpor barrel secara runtime lewat side-effect import (`import "@/features/wishes/barrel";`). Biarkan barrel memakai multiline `export type * as ... from`. Panggil `findTransitiveFirebasePaths()` dan pastikan nol violation.
2. Tambahkan positive control dalam tes yang sama atau tes terpisah dengan graph/path yang sama: ubah isi barrel menjadi multiline runtime `export * as ... from`, panggil detector lagi, dan assert full chain server root → barrel → `firebase-adapter.ts`. Bukti ini harus gagal bila detector tidak menelusuri barrel atau mengabaikan kedua bentuk export tanpa membedakannya.
3. Pertahankan semua tes Stage 9.2A lain dan actual repository scan. Jangan mengubah fungsi production/test detector kecuali fixture mengungkap cacat nyata; bila demikian, berhenti dan laporkan scope baru.

Scope hanya `src/features/wishes/boundary.test.ts`. Jangan edit, revert, stage, atau commit `docs/agent/prompts.md` dan `docs/reviews/stage-09-firestore-isolation-review.md`. Jangan mengubah production wishes/Firebase/UI, dependency, package/lockfile, data, konfigurasi, atau layanan eksternal. Jangan menjalankan live Firestore read/write, `pnpm test:db`, Stage 10, atau commit.

Verifikasi: targeted boundary suite, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm seed:verify`, dan `git diff --check`. Pastikan fixture temporer terhapus. Kirim handoff dengan hasil negative dan positive control, full chain, seluruh gate, scope diff, external effects nol, dan `Commit: not committed`.
```

## Stage 9 — Finalize and Commit Accepted Implementation (Only After Reviewer Acceptance)

```text
Gunakan prompt ini hanya setelah reviewer menyatakan Stage 9 ACCEPTED setelah koreksi Stage 9.2B. Lakukan finalisasi dan commit implementasi saja.

1. Pastikan branch `develop`, inspeksi `git status`, dan cocokkan tepat file implementasi berikut: `src/features/wishes/**`, `src/lib/firebase.ts`, serta `src/app/(templates)/wedding/classic-rose/[variant]/components/WishesSection.tsx`. Bila ada perubahan implementasi di luar daftar itu, berhenti dan laporkan.
2. Jangan edit, revert, stage, atau commit dua dokumen planner: `docs/agent/prompts.md` dan `docs/reviews/stage-09-firestore-isolation-review.md`. Keduanya sengaja tetap menjadi perubahan terpisah milik planner; status worktree secara keseluruhan boleh tetap menampilkan kedua dokumen tersebut setelah commit.
3. Jalankan pemeriksaan cepat final: `pnpm test`, `pnpm typecheck`, `pnpm lint`, dan `git diff --check`. Tidak perlu live Firestore atau `pnpm test:db`.
4. Stage hanya tiga path implementasi pada langkah 1. Inspeksi `git diff --cached --name-status` dan `git diff --cached --check`; pastikan tidak ada kredensial, `.env.local`, package/lockfile, file sementara, atau dokumen planner pada index. Bila scope tidak tepat atau gate gagal, berhenti tanpa commit.
5. Commit dengan pesan `feat: isolate realtime wishes in Firestore`. Laporkan hash lengkap, hasil gate, daftar file dalam commit, dan `git status --short --branch`. Jelaskan bahwa dua dokumen planner tetap uncommitted; jangan menyebut worktree sepenuhnya bersih.

Jangan mengubah fitur, data Firestore, PostgreSQL, Cloudinary, Aiven, atau Vercel. Jangan memulai Stage 10. Berhenti setelah handoff finalisasi.
```

## Stage 10A — Cleanup Gate and Dependency Audit (Read-only)

```text
Anda adalah programmer agent untuk AyaWarta. Mulai Stage 10 dengan substage 10A yang non-mutatif terhadap file terlacak/source/docs, database, dan layanan eksternal. Pemilik telah mengizinkan Stage 10, tetapi penghapusan file harus menunggu seluruh Mandatory Cleanup Gates terbukti dan dependensi operasional terlepas dari sumber lama. Stage 9 selesai pada commit implementasi c998a2a dan dokumen eced7d0. Jangan mulai Stage 10B atau menghapus file dalam tugas ini.

Baca AGENTS.md beserta seluruh Required Reading, khususnya docs/media-migration.md bagian Mandatory Cleanup Gates dan Failure Behavior, docs/qa-checklist.md bagian Cleanup Approval, docs/agent-workflow.md Stage 10, dan implementation plan Phase 10. Pastikan branch develop serta worktree bersih sebelum audit. Bila tidak, laporkan tanpa memodifikasi perubahan yang ada.

Fakta awal untuk diverifikasi ulang, bukan diasumsikan lulus:
- 12 file Git-tracked di public/images/SAMPLE (8) dan public/images/dummy-couples (4), total 12.060.994 byte. Catat daftar path dan ukuran persis, tetapi jangan hapus atau pindahkan.
- src/lib/invitations.ts dan src/lib/dummy-data/wedding/dummy-wedding.ts masih menyimpan data runtime lama; route publik sudah memakai repository Prisma.
- scripts/data/invitation-media-manifest.ts masih mengimpor src/lib/invitations.ts dan membaca sumber lokal/Cloudinary lama. src/features/invitations/seed-report-reader.ts dan src/features/media/identity-auditor.ts memanggil generator manifest tersebut. src/features/media/image-resolution.ts merujuk foto hero lokal. Karena itu penghapusan langsung dapat merusak prisma:seed, media:dry-run, media:verify, media:audit-identity, dan test terkait. Buktikan atau koreksi peta ketergantungan ini secara read-only.
- Seed produksi dalam src/features/invitations/seed-data.ts adalah sumber bootstrap relasional dan tidak otomatis termasuk hard-coded runtime lama yang boleh dihapus.

Tugas audit:
1. Buat matriks seluruh Mandatory Cleanup Gates dengan status PASS / FAIL / UNPROVEN, bukti file/command/artifact, dan konsekuensi bila belum lulus. Tinjau manifest 31 physical assets/37 usages, 4 hero/4 audio, laporan upload dan identitas, target cloud baru, migrasi lokal, dua seed idempotent, 4 route Prisma, audio dudi-aini, build, scan referensi, dan persetujuan cleanup dari pesan pemilik. Izin pemilik untuk memulai Stage 10 bukan persetujuan final penghapusan: tandai gate persetujuan reviewer atas inventaris penghapusan Stage 10C sebagai UNPROVEN dalam 10A; minta keputusan itu setelah 10B dan sebelum 10C. Jangan menyebut audio berfungsi hanya dari tag HTML; bedakan delivery/identitas byte dari bukti pemutaran bila tersedia.
2. Klasifikasikan setiap referensi ke /images/SAMPLE, /images/dummy-couples, akun Cloudinary lama, dan dummy invitation sebagai: runtime aktif, seed/bootstrap, alat migrasi/verifikasi, tes, atau dokumentasi historis. Bedakan referensi aktif yang harus dihilangkan dari catatan historis yang boleh tetap ada. Audit imports transitif, bukan hanya pencarian teks.
3. Untuk setiap CLI/package script dan suite tes yang bergantung pada sumber lama, catat apakah tetap berjalan bila 12 gambar dan dua file data lama dihapus. Fokus pada prisma:seed untuk database baru, seed:verify, media:dry-run, media:verify, media:verify-upload, media:audit-identity, media:migrate, pnpm test, pnpm typecheck, pnpm lint, pnpm build, dan smoke:routes. Jangan menjalankan seed/migrate mutator untuk membuktikan hal ini; gunakan pembacaan kode dan test read-only.
4. Usulkan urutan Stage 10B (melepaskan dependensi dan menjaga bootstrap/verifikasi pada fresh checkout) lalu Stage 10C (menghapus hanya file Git-tracked yang sudah terbukti tidak diperlukan). Usulan harus mempertahankan 4 record produksi, 31 target public IDs, kontrak MediaAsset, kemampuan seed aman untuk database Aiven kelak tanpa bergantung pada file ignored .media-migration atau gambar yang dihapus, serta pemeriksaan media yang masih relevan sesudah cleanup. Jika alat migrasi lama menjadi historis, jelaskan secara eksplisit apakah diarsipkan, dipensiunkan, atau diubah, termasuk konsekuensi pada package scripts, test, dan docs Stage 11. Jangan menurunkan ketatnya validasi report/URL demi membuat gate hijau.
5. Hitung proyeksi pengurangan ukuran tracked repository dan bukti seluruh target dapat dipulihkan dari Git. Jangan menghapus static UI/theme/payment assets, ignored .media-migration inputs/reports, atau aset akun Cloudinary lama. Jangan menyentuh Aiven, Vercel, Firebase, atau Cloudinary state.

Verifikasi non-mutatif: git status, git ls-files pada target, ukuran disk, source/import scan, pnpm seed:verify, pnpm test, pnpm typecheck, pnpm lint, pnpm build, dan route smoke test lokal bila service tersedia. pnpm build/test boleh menghasilkan artefak sementara di lokasi yang di-ignore (misalnya .next/cache), tetapi tidak boleh mengubah file terlacak, source/docs, database, atau state cloud. Verifikasi media boleh memakai report/GET read-only, tanpa upload atau overwrite. Jangan jalankan pnpm test:db karena suite tersebut memuat transaksi tulis/rollback. Jika layanan lokal tidak tersedia, tandai gate UNPROVEN tanpa mengubah environment. Jangan commit atau membuat perubahan source/docs dalam Stage 10A; laporkan git status akhir dan setiap artefak ignored yang dibuat.

Handoff: Stage: Stage 10A — Cleanup Gate and Dependency Audit; Status: ready for review atau blocked; gate matrix, exact target inventory, active dependency graph, command-survival matrix, keputusan yang diperlukan untuk 10B/10C, hasil verifikasi, Data or external effects (nol mutasi; laporkan jumlah GET read-only bila dilakukan), risks, Skills used: none, Commit: not committed. Berhenti untuk review planner.
```

## Stage 10A.1 — Cleanup Audit Evidence Correction

```text
Anda adalah programmer agent AyaWarta. Koreksi hanya handoff audit Stage 10A sesuai docs/reviews/stage-10a-cleanup-audit-review.md (CLEAN-01 sampai CLEAN-03). Gunakan handoff Stage 10A sebelumnya jika tersedia dalam percakapan; bila tidak, rekonstruksi dari bukti repository dan beri status UNPROVEN untuk pemeriksaan historis yang tidak dapat ditelusuri. Jangan mengarang hasil command. Jangan mulai Stage 10B/10C, jangan hapus file, jangan edit source/docs milik planner, jangan commit, dan jangan menjalankan seed/migrasi/upload mutator.

1. Ubah matriks Mandatory Cleanup Gates menjadi tepat satu status PASS, FAIL, atau UNPROVEN per gate. Gate "audio works for dudi-aini" adalah UNPROVEN sampai ada bukti pemutaran audio nyata di browser; catat identitas byte dan markup sebagai bukti parsial saja. Gate scan referensi lokal pada source/tooling/test aktif adalah FAIL selama dependensi aktif masih ada; dokumen historis yang dipertahankan bukan referensi runtime. Gate persetujuan penghapusan 10C tetap UNPROVEN; persetujuan memulai Stage 10 bukan izin menghapus 14 target.
2. Pisahkan bukti yang baru diperiksa dalam 10A dari bukti historis yang sudah diterima: docs/reviews/stage-06-idempotent-seed-review.md baris 18 menyebut dua run seed dilaporkan menghasilkan 82 row identik, Stage 5B mencatat audit identitas live, dan Stage 2 mencatat migrasi lokal. Sebut dua seed run sebagai bukti historis yang dilaporkan/diterima, bukan hasil current pnpm seed:verify; jika asal bukti run tidak dapat dilacak, beri gate UNPROVEN. Jangan menyatakan media:verify-upload melakukan GET live. Bila mungkin, konfirmasi migrasi lokal dengan pnpm exec prisma migrate status (read-only); bila tidak, accepted historical migration record boleh mendukung PASS dengan provenance yang jelas, dan gunakan UNPROVEN jika bukti historisnya juga tidak tersedia.
3. Perbaiki command-survival matrix dengan dua kolom lingkungan: checkout saat ini sesudah penghapusan hipotetis 14 file, serta fresh checkout tanpa .media-migration dan tanpa database yang sudah di-seed. Tandai prasyarat ignored report untuk media:verify-upload, ignored MP3 untuk media:verify-audio, DB lokal yang sudah di-seed untuk seed:verify/smoke:routes; seed:verify saat ini memiliki local-target guard dan bukan verifier Aiven. Jangan klaim pnpm build selamat setelah import TypeScript hilang: tsconfig mencakup scripts/**/*.ts; statusnya UNPROVEN/berisiko gagal sampai ada decoupling. Jangan klaim pnpm lint pasti gagal tanpa aturan lint yang membuktikannya; tampilkan sebagai UNPROVEN atau buktikan secara aman. Tidak perlu menghapus file untuk membuktikan prediksi.
4. Pertahankan inventaris 14 file dan 12.074.741 byte yang telah diverifikasi. Sertakan daftar gate yang tetap menghalangi 10C, urutan usulan 10B, metode pembuktian browser audio sebelum 10C, serta hasil git status akhir. Bila menjalankan pengecekan tambahan, semua harus read-only terhadap tracked files, database, dan cloud; artefak ignored dari build/test boleh muncul dan harus dilaporkan.

Kirim handoff revisi saja; jangan mengedit dokumen planner. Status Stage 10A.1: ready for review atau blocked. Data/external effects: nyatakan secara tepat. Skills used: none. Commit: not committed. Berhenti untuk review planner.
```

## Stage 10B — Portable Seed and Legacy Media Dependency Decoupling

```text
Anda adalah programmer agent AyaWarta. Kerjakan hanya Stage 10B sesudah membaca AGENTS.md dan seluruh Required Reading serta docs/reviews/stage-10a-cleanup-audit-review.md. Jika handoff Stage 10A.1 tersedia di percakapan, baca juga; bila tidak, review doc adalah ringkasan otoritatif dan audit ulang fakta yang dibutuhkan dari repository tanpa mengarang hasil historis. Stage 10A diterima sebagai audit, BUKAN izin menghapus 14 file media/data produksi lama. Periksa branch develop dan worktree terlebih dahulu; bila ada perubahan planner-owned pada docs/agent/prompts.md atau docs/reviews/stage-10a-cleanup-audit-review.md, jangan edit, revert, stage, atau commit perubahan tersebut dan laporkan; bila ada perubahan lain yang bertabrakan, berhenti. Restate scope dan verification sebelum edit. Jangan mulai Stage 10C, jangan commit.

Tujuan: lepaskan jalur seed produksi dan verifikasi operasional dari src/lib/invitations.ts, src/lib/dummy-data/wedding/dummy-wedding.ts, 12 gambar public/images/SAMPLE dan public/images/dummy-couples, serta artefak ignored .media-migration yang tidak tersedia pada fresh checkout. Empat invitation produksi, 31 public ID target, 37 logical usages historis, 4 hero, 4 audio, seluruh konten pelanggan, dan data PostgreSQL lokal harus tetap identik. Dua direktori gambar dan dua file data lama wajib tetap ada/tidak dimodifikasi dalam Stage 10B.

1. Rancang dan implementasikan sumber kanonikal produksi yang Git-tracked, server-only, tanpa kredensial dan tanpa byte media. Ambil metadata yang dibutuhkan seed (termasuk public ID, secure delivery URL, resource type, format, bytes, dimensi, dan originalName bila dibutuhkan) hanya dari laporan upload Stage 5B yang lolos schema/URL validation. Laporan tidak memiliki originalName langsung: jika diperlukan, turunkan basename dari sourceLocation yang tervalidasi persis seperti seed saat ini, lalu simpan hanya basename agar MediaAsset.originalName tetap identik tanpa menyimpan path/URL sumber lama. Cocokkan SHA-256 laporan upload dengan hash yang dipin di review Stage 5B (`03BE7F497480598C66FEC7BB88D8015C5071FDA2BE966ECA3AE8860EA928EAF2`); review Stage 5B yang diterima menjadi provenance historis audit identitas live 31/31, sementara laporan identity lokal yang di-ignore boleh menjadi bukti tambahan bila tersedia, bukan prasyarat fresh checkout. Jika laporan upload hilang/berubah atau ada ketidaksesuaian, berhenti dan laporkan, jangan mengarang URL atau metadata. Jangan menyalin sourceLocation lokal/URL akun lama ke sumber kanonikal operasional baru. Registry harus memiliki tepat 31 ID unik dan satu hero serta satu audio untuk masing-masing empat slug; seluruh relasi seed harus menunjuk ID yang ada.
2. Jadikan default pnpm prisma:seed pada checkout baru dapat menyiapkan input seed tanpa membaca ignored .media-migration, file lokal lama, URL akun Cloudinary lama, atau generateMediaManifest(). Pertahankan fail-closed validation atas cloud target uhwi7xvb, binding URL-ke-public-ID, resource type, format, bytes/dimensi, set equality, serta fail-on-missing required hero/partner/gallery/audio sebelum transaksi. Pertahankan satu transaksi atomik, upsert/idempotency, admin bootstrap, dan semua data pelanggan. Jika format laporan historis tetap didukung sebagai input recovery opsional, validasi tetap ketat dan jalur default tidak boleh membutuhkannya. Jangan menjalankan seed nyata dalam tahap ini.
3. Putus dependensi source lama pada tool/test aktif. Tentukan secara eksplisit command media mana yang tetap relevan setelah migrasi selesai, mana yang hanya historis, dan mana yang harus fail-closed/diubah/dipensiunkan. Sebelum menghapus file tooling sekali-pakai atau entry package script (bukan 14 target terlindungi), tulis daftar exact path/entry, alasan, serta konsekuensi terhadap test dan runbook dalam rencana pre-edit; jika scope berubah material, berhenti untuk review. Jangan membiarkan package script aktif berpura-pura berhasil dengan input yang sudah tidak tersedia; jangan menyembunyikan kegagalan dengan skip test. Tooling Cloudinary server-only, validator URL/public ID, dan image-processor yang berguna untuk upload admin masa depan harus tetap dipertahankan. Ulangi daftar exact path yang diubah/dihapus dalam handoff. Catatan historis Stage 5B dan laporan ignored operator jangan dihapus.
4. Tambahkan bukti hermetis bahwa jalur input seed default dan unit tests bekerja tanpa 14 file lama maupun .media-migration: gunakan dependency injection/fixture atau direktori uji terisolasi, jangan rename/hapus file operator di workspace. Bandingkan input media dari registry baru terhadap metadata 31 aset yang sudah diverifikasi dan terhadap state DB lokal secara read-only bila tersedia; jangan mengubah database. Tambahkan mutation tests untuk duplicate/missing/extra public ID, swapped URL, cloud/resource/format mismatch, metadata invalid, dan hilangnya relasi wajib. Pastikan tidak ada secret atau path lokal dinamis pada registry baru.
5. Pertahankan guard lokal pada prisma/seed.ts dan scripts/verify-seed.ts. Stage 10B hanya membuat DATA seed portable; tidak mengizinkan sambungan, migrasi, verifikasi, atau seed ke Aiven. Catat secara eksplisit bahwa CLI saat ini belum dapat menarget Aiven dan perubahan guard memerlukan tahap production-cutover yang disetujui terpisah. Jangan menyamakan kesiapan data dengan izin operasi production.

Batas keras: jangan menghapus/mengubah 14 target penghapusan yang dicatat Stage 10A (12 gambar dan dua modul legacy); jangan menyentuh akun Cloudinary lama/baru, Firestore, Vercel, Aiven, atau data PostgreSQL. Jangan mengubah Prisma schema/migrations, UI, route, auth, environment secrets, atau binary MP3. Jangan membuat admin dashboard. Jangan menambah dependency tanpa alasan dan review eksplisit. Jangan commit.

Verifikasi minimum: git status/diff; pnpm install --frozen-lockfile; pnpm test; pnpm typecheck; pnpm lint; pnpm build; pnpm seed:verify terhadap PostgreSQL lokal secara read-only bila DB lokal yang sudah di-seed tersedia (jika tidak, tandai UNPROVEN dan alasannya, jangan seed); smoke:routes lokal bila service tersedia; verifikasi offline registry/URL baru; scan impor transitif dan referensi lokal/Cloudinary lama pada code path aktif; scan credential, ignored artifact, dan binary pada diff. Jangan jalankan pnpm test:db bila suite tersebut menulis transaksi, pnpm prisma:seed, pnpm media:migrate --execute, atau audit GET live kecuali diberi instruksi khusus. Catat command lama yang sengaja dipensiunkan agar Stage 11 memperbarui runbook.

Handoff wajib: Stage 10B; Status ready for review atau blocked; changed files; kontrak registry/provenance 31 aset; bukti fresh-checkout input seed; daftar command media yang tetap/retired; scan dependensi aktif; hasil semua gate; bukti 14 target tetap byte-identical/tracked; data/external effects; risiko tersisa termasuk playback dudi-aini dan persetujuan Stage 10C; Skills used: none; Commit: not committed. Berhenti untuk review planner.
```

## Stage 10C — Planned After Stage 10B Review

The planner will provide the exact deletion inventory and implementation prompt after reviewing Stage 10B and the remaining cleanup gates. This heading does not authorize deletion.

## Stage 11 — Documentation and Final QA

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 11 — Documentation and Final QA. Stage 10 telah diterima.

Baca seluruh dokumen wajib di AGENTS.md dan bandingkan dengan implementasi aktual.

Gunakan `humanizer` hanya bila dokumentasi yang disentuh memiliki pola tulisan AI yang mengganggu. Jangan ubah makna teknis, command, nama file, atau acceptance criteria.

Tugas:
1. Update README dan dokumen operasional agar command, path, dependency, dan perilaku benar-benar sesuai implementasi.
2. Pastikan .env.example lengkap tanpa secret nyata.
3. Dokumentasikan local Laragon workflow, Prisma, admin bootstrap, Cloudinary management, dan Aiven/Vercel cutover.
4. Jalankan seluruh Final Verification Sequence pada implementation plan.
5. Buat release-readiness report berisi commit/diff scope, tests, build, data effects, ukuran repo, known risks, deferred work, dan langkah production cutover yang masih memerlukan otorisasi owner.

Batasan:
- Jangan provision Aiven, edit Vercel, migrate/seed production, deploy, atau delete cloud assets.
- Jangan melakukan refactor baru di luar perbaikan dokumentasi atau kegagalan QA yang kecil dan langsung terkait. Laporkan masalah besar sebagai follow-up.
- Jangan commit. Berhenti setelah handoff untuk final review.

Handoff wajib mengikuti AGENTS.md dan menyertakan release-readiness report lengkap.
```

## Correction Prompt After Review Findings

```text
Perbaiki hanya temuan review untuk Stage [N — NAME] di bawah ini. Baca kembali AGENTS.md dan dokumen stage terkait. Jangan memperluas scope dan jangan mulai stage berikutnya.

Temuan blocking:
[PASTE REVIEW FINDINGS]

Tugas:
1. Reproduksi setiap temuan.
2. Terapkan koreksi paling kecil yang menyelesaikan akar masalah.
3. Tambahkan/perbaiki test agar regresi tertangkap.
4. Jalankan ulang semua verification Stage [N], bukan hanya test baru.
5. Review diff untuk perubahan tidak terkait dan secret.

Jangan commit. Akhiri dengan handoff AGENTS.md yang memetakan setiap temuan ke koreksi dan bukti verifikasinya, lalu berhenti.
```

## Finalize and Commit an Accepted Stage

```text
Stage [N — NAME] telah ACCEPTED oleh reviewer.

Tugas finalisasi saja:
1. Pastikan worktree hanya berisi perubahan stage yang diterima.
2. Jalankan kembali pemeriksaan cepat yang paling kritis untuk stage tersebut.
3. Pastikan git diff --check bersih dan tidak ada credential/unrelated files.
4. Commit seluruh perubahan stage dengan pesan: "[COMMIT MESSAGE]".
5. Laporkan commit hash dan git status.

Jangan membuat perubahan fitur baru, jangan amend commit lama, dan jangan mulai stage berikutnya.
```

## Request a Review from the Planner

After Antigravity returns its handoff, send this to the planner/reviewer together with the agent output:

```text
Review hasil Stage [N — NAME] dari programmer agent. Periksa worktree/diff langsung, validasi klaim test dan scope terhadap AGENTS.md serta docs/qa-checklist.md, lalu berikan keputusan ACCEPTED atau CHANGES REQUIRED. Jangan implementasikan perbaikannya; tuliskan prompt koreksi yang bisa saya kirim ke programmer jika ada temuan.
```
