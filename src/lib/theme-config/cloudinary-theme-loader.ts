import type { ImageLoaderProps } from "next/image";
import classicRoseMedia from "@/config/classic-rose-cloudinary.json";

const themePrefix = `/${classicRoseMedia.cloudName}/image/upload/`;
const assetPrefix = "/ayawarta/production/themes/classic-rose/";

export function isClassicRoseCloudinaryAsset(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(themePrefix) &&
      url.pathname.includes(assetPrefix);
  } catch {
    return false;
  }
}

/** Let Cloudinary deliver responsive variants directly, outside Next's image proxy. */
export function classicRoseCloudinaryLoader({ src, width }: ImageLoaderProps): string {
  if (!isClassicRoseCloudinaryAsset(src)) {
    throw new Error("Classic Rose image loader received an unrelated asset");
  }
  const url = new URL(src);
  url.pathname = url.pathname.replace(
    themePrefix,
    `${themePrefix}c_limit,w_${Math.max(1, Math.round(width))}/f_auto/q_auto/`
  );
  return url.toString();
}
