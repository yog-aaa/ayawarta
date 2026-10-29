import path from "node:path";
import { mkdir, stat } from "node:fs/promises";
import sharp from "sharp";

const names = ["couple", "walking", "details", "groom", "bride"];
const sources = process.argv.slice(2);

if (sources.length !== names.length) {
  throw new Error(`Pass ${names.length} source images in this order: ${names.join(", ")}`);
}

const destination = path.join(
  process.cwd(),
  "assets/themes/classic-rose/sample"
);
await mkdir(destination, { recursive: true });

for (let index = 0; index < names.length; index += 1) {
  const name = names[index];
  const width = name === "groom" || name === "bride" ? 480 : 960;
  const output = path.join(destination, `${name}.webp`);
  await sharp(sources[index])
    .resize(width, width, { fit: "cover", position: "attention" })
    .webp({ quality: 78, effort: 5 })
    .toFile(output);
  const bytes = (await stat(output)).size;
  console.log(`${name}: ${(bytes / 1024).toFixed(0)} KB`);
}
