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
2. Gunakan npm sebagai package manager dan jangan mengubah pnpm-lock.yaml.
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
- Jangan mengubah `.env.local` atau `pnpm-lock.yaml`.
- Jangan commit. Berhenti setelah handoff untuk review.
- Gunakan `cmd.exe /c` atau `npm.cmd` untuk npm/Prisma di Windows.

Handoff wajib menyertakan target database aman, nama dan SQL migration, bukti tiga migration lama tidak berubah, hasil Prisma validate/generate/migrate status, unit test, integration test, typecheck, lint, build, serta konfirmasi tidak ada seed atau external effect.
```

## Stage 3 — Invitation Domain, Repository, and Mapper

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 3 — Invitation Domain, Repository, and Mapper. Stage 2B telah diterima dan dikomit.

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
- Jangan membuat unit test bergantung pada PostgreSQL; suite live tetap hanya melalui `npm run test:db`.
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
1. Buat typed manifest untuk seluruh media dinamis lokal dan semua URL Cloudinary akun lama.
2. Cakup rika-fauzi, shidqi-mita, dudi-aini, dan default-preview sebagai data production, termasuk tepat satu hero eksplisit per slug.
3. Target wajib mengikuti ayawarta/production/invitations/{slug}/{category}/...
4. Buat generator public ID deterministik, validasi input/path traversal, dan unit test.
5. Buat migration script dengan mode dry-run dan safe report contract.
6. Buat verification script contract, tetapi jangan melakukan upload.
7. Jalankan dry-run dan laporkan count per slug/category serta target public IDs.

Batasan keras:
- Jangan upload, mengunduh ulang remote asset, mengubah database, mengganti URL aplikasi, atau menghapus file.
- Jangan masukkan external `galleryVideoUrl` ke manifest Cloudinary; field tersebut adalah content pointer PostgreSQL.
- Jangan mencetak credential.
- Jangan commit. Berhenti setelah handoff untuk review manifest.

Handoff wajib menyertakan manifest summary lengkap, test results, dan daftar external effects yang akan terjadi jika Stage 5B disetujui.
```

## Stage 5B — Cloudinary Upload and Verification

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 5B — Cloudinary Upload and Verification. Manifest Stage 5A telah direview dan disetujui.

Baca ulang AGENTS.md dan docs/media-migration.md. Gunakan manifest yang telah disetujui tanpa memperluas daftar aset.

Tugas:
1. Jalankan preflight credential berdasarkan nama key tanpa mencetak nilai.
2. Pastikan cloud name adalah akun baru yang dituju.
3. Upload local sources dan salin/re-upload URL akun lama ke public ID baru yang telah disetujui.
4. Gunakan perilaku idempotent/deterministik agar retry tidak membuat duplikat acak.
5. Verifikasi HTTPS delivery URL, cloud name, resource type, byte size, dimension jika relevan, serta audio dudi-aini.
6. Verifikasi tepat satu hero wajib untuk setiap production slug dan pastikan hasilnya dapat di-resolve ke `Invitation.heroAssetId`.
7. Simpan safe migration report tanpa credential.
8. Bandingkan expected dan actual count.

Batasan keras:
- Jangan menghapus atau rename aset akun lama.
- Jangan menghapus file lokal.
- Jangan switch source aplikasi atau seed database.
- Jika satu required asset gagal, hentikan stage sebagai gagal dan pertahankan semua fallback.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib melaporkan count sukses/gagal per slug/category, report path, verifikasi akun baru, dan konfirmasi aset lama serta file lokal tidak dihapus.
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

## Stage 9 — Firestore Isolation and Wishes Hardening

```text
Anda adalah programmer agent untuk proyek AyaWarta. Kerjakan hanya Stage 9 — Firestore Isolation and Wishes Hardening. Stage 8 telah diterima.

Baca semua dokumen wajib di AGENTS.md, khususnya docs/architecture.md bagian Wishes and RSVP dan implementation plan Phase 9.

Tugas:
1. Pertahankan path collection Firestore dan format record yang sudah ada.
2. Isolasi subscription/write logic dalam client boundary terkecil yang masuk akal.
3. Pastikan unsubscribe benar.
4. Tambahkan/perbaiki loading, empty, submitting, validation, dan failure state tanpa mengubah contract data.
5. Smoke-test membaca dan mengirim wish/attendance dengan aman.
6. Jalankan tests, typecheck, lint, dan build yang relevan.

Batasan:
- Jangan pindahkan wishes/RSVP ke PostgreSQL.
- Jangan mengubah collection path atau attendance value.
- Jangan mengerjakan cleanup atau deployment.
- Jangan commit. Berhenti setelah handoff untuk review.

Handoff wajib menyertakan bukti path tetap sama, subscription cleanup, read/submit behavior, dan external effects jika test menulis data.
```

## Stage 10 — Verified Repository Cleanup

```text
Anda adalah programmer agent untuk proyek AyaWarta. Evaluasi dan kerjakan hanya Stage 10 — Verified Repository Cleanup. Stage 9 telah diterima dan cleanup telah diberi persetujuan eksplisit.

Baca AGENTS.md, docs/media-migration.md bagian Mandatory Cleanup Gates, dan docs/qa-checklist.md bagian Cleanup Approval.

Tugas:
1. Evaluasi setiap cleanup gate satu per satu dan laporkan bukti.
2. Jika satu gate gagal atau tidak terbukti, STOP tanpa menghapus apa pun dan status harus blocked.
3. Jika seluruh gate lulus, hapus hanya public/images/SAMPLE, public/images/dummy-couples, hard-coded invitation data yang sudah digantikan Prisma, dan dead files/imports terkait.
4. Scan seluruh source untuk local dynamic paths dan URL akun Cloudinary lama.
5. Hitung pengurangan ukuran repository.
6. Jalankan full typecheck, tests, lint, production build, serta route smoke tests.
7. Pastikan file dapat dipulihkan dari Git dan aset akun lama tidak disentuh.

Batasan:
- Jangan menghapus aset Cloudinary mana pun.
- Jangan menggunakan destructive Git reset/checkout.
- Jangan menyentuh Aiven atau Vercel.
- Jangan menghapus static UI/theme/payment assets.
- Jangan commit. Berhenti setelah handoff untuk review akhir cleanup.

Handoff wajib menyertakan gate checklist, daftar exact deletion, stale-reference scan, size before/after, dan full verification results.
```

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
