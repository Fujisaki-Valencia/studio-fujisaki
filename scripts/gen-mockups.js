#!/usr/bin/env node
/*
 * gen-mockups — build lightweight WebP device mockups for one wallpaper and
 * register them in data/wallpapers.json.
 *
 * Input : <dir>/mockup-<device>.(png|jpg|webp)  for any of:
 *           ultrawide, macbook, ipad, iphone
 * Output: mockups/<slug>/<device>.webp   (committed to the repo, like thumbs)
 *         + sets the entry's `mockups` map in wallpapers.json (devices found only)
 *
 * Usage:
 *   node gen-mockups.js --slug <slug> [--dir originals/<slug>] [--width 900] [--quality 80]
 *
 * Requires: sharp
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const JSON_PATH = path.join(REPO, "data", "wallpapers.json");
const DEVICES = ["ultrawide", "macbook", "ipad", "iphone"];
const SRC_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const k = argv[i].slice(2);
      out[k] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    }
  }
  return out;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const slug = flags.slug;
  if (!slug) {
    console.error("Usage: node gen-mockups.js --slug <slug> [--dir <folder>]");
    process.exit(1);
  }
  const dir = flags.dir || path.join("originals", slug);
  const width = Number(flags.width) || 900;
  const quality = Number(flags.quality) || 80;

  let sharp;
  try {
    sharp = require("sharp");
  } catch (e) {
    console.error("This script needs `sharp`. Run `npm install` inside scripts/.");
    process.exit(1);
  }

  const outDir = path.join(REPO, "mockups", slug);
  fs.mkdirSync(outDir, { recursive: true });

  const mockups = {};
  for (const dev of DEVICES) {
    const src = SRC_EXTS.map((e) => path.join(REPO, dir, `mockup-${dev}${e}`)).find((p) =>
      fs.existsSync(p)
    );
    if (!src) continue;
    const rel = `mockups/${slug}/${dev}.webp`;
    await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(path.join(REPO, rel));
    mockups[dev] = rel;
    console.log(`✓ ${rel}`);
  }

  if (!Object.keys(mockups).length) {
    console.error(`No mockup-*.png found in ${dir} (looked for ${DEVICES.join(", ")}).`);
    process.exit(1);
  }

  // Register in wallpapers.json (if the entry exists).
  const json = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const entry = json.wallpapers.find((w) => w.slug === slug);
  if (!entry) {
    console.warn(`\n⚠ slug "${slug}" not in wallpapers.json — mockups built but not registered.`);
    console.warn("  Add the wallpaper first, then re-run.");
    process.exit(0);
  }
  entry.mockups = mockups;
  fs.writeFileSync(JSON_PATH, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ registered ${Object.keys(mockups).length} mockup(s) on "${slug}"`);
}

main().catch((err) => {
  console.error("gen-mockups failed:", err.message);
  process.exit(1);
});
