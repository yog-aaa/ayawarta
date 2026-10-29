import { stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.join(process.cwd(), "public/images/themes/classic-rose");
const variants = ["red", "green", "blue", "orange", "black", "white"];
const canvasColors = {
  red: "#f5ebec",
  green: "#edf1e9",
  blue: "#edf2f7",
  orange: "#f6ede5",
  black: "#202024",
  white: "#f8f4ea",
};
const ornaments = [
  ["bunga", 640],
  ["border-foto", 960],
  ["bismillah", 640],
];

async function makeSeamlessTile(source, output, canvasColor) {
  const { width, height } = await sharp(source).metadata();
  const square = Math.min(width, height);
  const base = await sharp(source)
    .extract({
      left: Math.floor((width - square) / 2),
      top: Math.floor((height - square) / 2),
      width: square,
      height: square,
    })
    .resize(512, 512)
    .flatten({ background: canvasColor })
    .png()
    .toBuffer();

  const horizontal = await sharp(base).flop().png().toBuffer();
  const vertical = await sharp(base).flip().png().toBuffer();
  const both = await sharp(base).flip().flop().png().toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: canvasColor,
    },
  })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: horizontal, left: 512, top: 0 },
      { input: vertical, left: 0, top: 512 },
      { input: both, left: 512, top: 512 },
    ])
    .webp({ quality: 76, effort: 5 })
    .toFile(output);
}

for (const variant of variants) {
  const directory = path.join(root, variant);
  await makeSeamlessTile(
    path.join(directory, "bg.png"),
    path.join(directory, "texture.webp"),
    canvasColors[variant]
  );

  await sharp(path.join(directory, "bg.png"))
    .resize({ width: 840, height: 1180, fit: "cover" })
    .webp({ quality: 74, effort: 5 })
    .toFile(path.join(directory, "preview.webp"));

  for (const [name, maxWidth] of ornaments) {
    await sharp(path.join(directory, `${name}.png`))
      .resize({ width: maxWidth, height: maxWidth, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(path.join(directory, `${name}.webp`));
  }

  const oldBytes = (await stat(path.join(directory, "bg.png"))).size;
  const newBytes = (await stat(path.join(directory, "texture.webp"))).size;
  console.log(`${variant}: background ${(oldBytes / 1024 / 1024).toFixed(1)} MB -> ${(newBytes / 1024).toFixed(0)} KB`);
}
