#!/usr/bin/env node
/*
 * gen-thumb — make a lightweight WebP thumbnail (width 600px) from a full-size image.
 *
 * Usage:
 *   node gen-thumb.js <input-image> [output-slug]
 *
 * Examples:
 *   node gen-thumb.js ./originals/great-wave/pc.jpg great-wave-kanagawa
 *   node gen-thumb.js ./originals/great-wave/pc.jpg
 *     -> writes ../thumbs/<input-basename>.webp
 *
 * Output: ../thumbs/<slug>.webp  (relative to the repo, matching JSON "thumb" paths)
 *
 * Requires: sharp  (npm install)
 */
const path = require("path");
const fs = require("fs");

let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error("This script needs `sharp`. Run `npm install` inside scripts/.");
  process.exit(1);
}

const WIDTH = 600;
const QUALITY = 80;

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node gen-thumb.js <input-image> [output-slug]");
    process.exit(1);
  }
  if (!fs.existsSync(input)) {
    console.error(`Input not found: ${input}`);
    process.exit(1);
  }

  const rawSlug = process.argv[3] || path.parse(input).name;
  const slug = slugify(rawSlug);

  const thumbsDir = path.resolve(__dirname, "..", "thumbs");
  fs.mkdirSync(thumbsDir, { recursive: true });
  const outPath = path.join(thumbsDir, `${slug}.webp`);

  await sharp(input)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);

  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`✓ thumb written: thumbs/${slug}.webp  (${kb} KB)`);
  console.log(`  Use this in wallpapers.json as: "thumb": "thumbs/${slug}.webp"`);
}

main().catch((err) => {
  console.error("gen-thumb failed:", err.message);
  process.exit(1);
});
