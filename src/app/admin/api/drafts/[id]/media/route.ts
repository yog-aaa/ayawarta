import { requireAdminSession } from "@/features/auth/service";
import { requireA5Enabled } from "@/features/admin/a5-feature";
import { MAX_ADMIN_IMAGE_INPUT_BYTES, parseAdminImageSlot } from "@/features/admin/media-image";
import { uploadAdminDraftImage } from "@/features/admin/media-service";
import type { AdminDraftResult } from "@/features/admin/draft-service";

export const runtime = "nodejs";

function json(result: AdminDraftResult<unknown>, status?: number): Response {
  const codeStatus = result.ok ? 200 : {
    validation: 400, unauthorized: 401, forbidden: 403, not_found: 404,
    conflict: 409, dependency_failure: 503, unexpected: 500,
  }[result.code];
  return Response.json(result, { status: status ?? codeStatus, headers: { "Cache-Control": "no-store" } });
}

async function boundedBody(request: Request): Promise<Buffer | null> {
  if (!request.body) return null;
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_ADMIN_IMAGE_INPUT_BYTES)) return null;
  const reader = request.body.getReader();
  const parts: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ADMIN_IMAGE_INPUT_BYTES) { await reader.cancel(); return null; }
      parts.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return size > 0 ? Buffer.concat(parts, size) : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdminSession();
  } catch (error) {
    const code = error instanceof Error && error.message === "Unauthorized" ? "unauthorized" :
      error instanceof Error && error.message === "Forbidden" ? "forbidden" : "dependency_failure";
    return json({ ok: false, code, message: code === "unauthorized" ? "Silakan masuk sebagai administrator." :
      code === "forbidden" ? "Akses administrator tidak tersedia." : "Autentikasi belum dapat diperiksa." });
  }
  try { requireA5Enabled(); }
  catch { return json({ ok: false, code: "dependency_failure", message: "Penyediaan media undangan baru belum diaktifkan." }); }

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return json({ ok: false, code: "forbidden", message: "Asal permintaan tidak sesuai." });
  const slot = request.headers.get("x-ayawarta-media-slot");
  try { parseAdminImageSlot(slot); }
  catch { return json({ ok: false, code: "validation", message: "Kolom foto tidak valid.", fieldErrors: { slot: ["Pilih kolom foto yang valid."] } }); }
  const version = Number(request.headers.get("x-ayawarta-draft-version"));
  if (!Number.isSafeInteger(version) || version < 1) return json({ ok: false, code: "validation", message: "Versi draf tidak valid.", fieldErrors: { expectedDraftVersion: ["Muat ulang draf."] } });
  const key = request.headers.get("idempotency-key") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key)) {
    return json({ ok: false, code: "validation", message: "Kunci unggahan tidak valid.", fieldErrors: { idempotencyKey: ["Coba pilih ulang foto."] } });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    return json({ ok: false, code: "validation", message: "Jenis foto tidak didukung.", fieldErrors: { file: ["Gunakan JPEG, PNG, atau WebP."] } });
  }
  const bytes = await boundedBody(request).catch(() => null);
  if (!bytes) return json({ ok: false, code: "validation", message: "Foto kosong atau melebihi 15 MB.", fieldErrors: { file: ["Pilih foto berukuran paling besar 15 MB."] } }, 413);
  const { id } = await context.params;
  return json(await uploadAdminDraftImage({ draftId: id, expectedDraftVersion: version, idempotencyKey: key, slot: slot!, contentType, bytes }));
}
