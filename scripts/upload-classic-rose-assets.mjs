import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { parse as parseEnv } from "dotenv";
import sharp from "sharp";

const root = process.cwd();
const assetRoot = path.join(root, "assets/themes/classic-rose");
const manifestPath = path.join(root, "src/config/classic-rose-cloudinary.json");
const variants = ["red", "green", "blue", "orange", "black", "white"];
const variantAssets = ["texture", "preview", "bunga", "border-foto", "bismillah"];
const sampleAssets = ["couple", "walking", "details", "groom", "bride"];
const mode = process.argv[2] ?? "--dry-run";

if (!["--dry-run", "--execute", "--verify"].includes(mode)) {
  throw new Error("Usage: node scripts/upload-classic-rose-assets.mjs [--dry-run|--execute|--verify]");
}

const env = parseEnv(await readFile(path.join(root, ".env.local")));
const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
if (!cloudName || cloudName.toLowerCase() === "doig3gwek") {
  throw new Error("A valid target Cloudinary cloud name is required in .env.local");
}

const entries = [];
for (const variant of variants) {
  for (const name of variantAssets) entries.push({ group: variant, name });
}
for (const name of sampleAssets) entries.push({ group: "sample", name });

const assets = await Promise.all(entries.map(async ({ group, name }) => {
  const file = path.join(assetRoot, group, `${name}.webp`);
  const buffer = await readFile(file);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height || metadata.format !== "webp") {
    throw new Error(`Invalid WebP asset: ${group}/${name}`);
  }
  return {
    group,
    name,
    file,
    sha256,
    bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    publicId: `ayawarta/production/themes/classic-rose/${group}/${name}-${sha256.slice(0, 16)}`,
  };
}));

console.log(`Classic Rose: ${assets.length} WebP assets, ${Math.round(assets.reduce((sum, asset) => sum + asset.bytes, 0) / 1024)} KB total, cloud ${cloudName}`);
if (mode === "--dry-run") process.exit(0);

if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
  throw new Error("Cloudinary API credentials are required in .env.local");
}
cloudinary.config({
  cloud_name: cloudName,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

function assertRemote(asset, remote) {
  if (!remote || remote.public_id !== asset.publicId || remote.resource_type !== "image" || remote.format !== "webp") {
    throw new Error(`Cloudinary identity mismatch: ${asset.group}/${asset.name}`);
  }
  if (remote.bytes !== asset.bytes || remote.width !== asset.width || remote.height !== asset.height) {
    throw new Error(`Cloudinary dimensions or bytes mismatch: ${asset.group}/${asset.name}`);
  }
  if (remote.context?.custom?.source_sha256 !== asset.sha256) {
    throw new Error(`Cloudinary source hash metadata mismatch: ${asset.group}/${asset.name}`);
  }
  const url = new URL(remote.secure_url);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" ||
      !url.pathname.startsWith(`/${cloudName}/image/upload/v`) ||
      !url.pathname.endsWith(`/${asset.publicId}.webp`) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error(`Cloudinary delivery URL mismatch: ${asset.group}/${asset.name}`);
  }
  return remote.secure_url;
}

async function getRemoteById() {
  const response = await cloudinary.api.resources_by_ids(assets.map((asset) => asset.publicId), {
    resource_type: "image",
    type: "upload",
    context: true,
  });
  return new Map((response.resources ?? []).map((resource) => [resource.public_id, resource]));
}

try {
  const ping = await cloudinary.api.ping();
  if (ping.status !== "ok") throw new Error("Cloudinary ping did not return ok");
  const existing = await getRemoteById();
  if (mode === "--verify" && existing.size !== assets.length) {
    throw new Error(`Only ${existing.size} of ${assets.length} theme assets exist remotely`);
  }

  if (mode === "--execute") {
    let uploaded = 0;
    for (const asset of assets) {
      if (existing.has(asset.publicId)) {
        assertRemote(asset, existing.get(asset.publicId));
        continue;
      }
      await cloudinary.uploader.upload(asset.file, {
        public_id: asset.publicId,
        resource_type: "image",
        type: "upload",
        overwrite: false,
        unique_filename: false,
        context: { source_sha256: asset.sha256 },
        tags: ["ayawarta", "classic-rose", "static-theme"],
      });
      uploaded += 1;
      if (uploaded % 5 === 0 || uploaded === assets.length) {
        console.log(`Uploaded ${uploaded} new assets`);
      }
    }
    console.log(`Upload complete: ${uploaded} new, ${assets.length - uploaded} already verified`);
  }

  const remoteById = await getRemoteById();
  if (remoteById.size !== assets.length) {
    throw new Error(`Only ${remoteById.size} of ${assets.length} theme assets verified remotely`);
  }

  const manifest = { cloudName, variants: {}, sample: {} };
  for (const asset of assets) {
    const url = assertRemote(asset, remoteById.get(asset.publicId));
    if (asset.group === "sample") manifest.sample[asset.name] = url;
    else {
      manifest.variants[asset.group] ??= {};
      manifest.variants[asset.group][asset.name] = url;
    }
  }

  if (mode === "--execute") {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w" });
    console.log("Verified Cloudinary manifest written to src/config/classic-rose-cloudinary.json");
  } else {
    const committed = JSON.parse(await readFile(manifestPath, "utf8"));
    if (JSON.stringify(committed) !== JSON.stringify(manifest)) {
      throw new Error("Committed Cloudinary manifest differs from verified remote assets");
    }
    console.log("All Cloudinary theme assets and the committed manifest are verified");
  }
} catch (error) {
  console.error(`Cloudinary asset operation failed: ${error instanceof Error ? error.name : "UnknownError"}`);
  process.exitCode = 1;
}
