#!/usr/bin/env node
/*
 * gen-pin — build Pinterest-shaped (2:3, 1000×1500) pin images for a wallpaper.
 *
 * Why: every image in this repo is landscape — mockups are 900×675 and thumbs
 * 600×338 — and Pinterest's feed is built for vertical 2:3. Landscape pins are
 * rendered small and get buried. These are upload-only assets: they are not
 * served by the site and are NOT committed (see .gitignore).
 *
 * Three variants per wallpaper, so one wallpaper can become several pins:
 *   01-artwork.jpg  the artwork itself, cropped vertical      → visual reach
 *   02-phone.jpg    the phone render on a Japandi background  → "iPhone wallpaper" searches
 *   03-text.jpg     artwork + a captioned panel               → click-through
 *
 * Source images come from originals/<slug>/{sp,pc}.* when present, otherwise
 * they are downloaded from the entry's spUrl / pcUrl on R2.
 *
 * Usage:
 *   node gen-pin.js --slug <slug>      # one wallpaper
 *   node gen-pin.js --all              # every wallpaper in wallpapers.json
 *   [--outdir pins] [--quality 88]
 *
 * Requires: sharp
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = path.resolve(__dirname, "..");
const JSON_PATH = path.join(REPO, "data", "wallpapers.json");

const W = 1000;
const H = 1500;

// Japandi tokens, mirrored from assets/css/style.css :root.
const BG = "#f4f2ed";
const BG_ALT = "#ece9e2";
const INK = "#33322e";
const MUTED = "#79766d";
const ACCENT = "#7f7c6e";
const LINE = "#ddd8cf";

// Font stacks resolved by librsvg at composite time. Kept to faces that ship
// with both Windows and macOS so pins render identically wherever this runs.
const SERIF = "Georgia, 'Times New Roman', 'Yu Mincho', serif";
const SANS = "'Helvetica Neue', Arial, 'Yu Gothic', sans-serif";

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

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/* Greedy word wrap. `perLine` is a character budget, not a pixel measure —
   good enough because the font size is chosen per variant, not per title. */
function wrap(text, perLine, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  // Signal truncation rather than silently dropping the rest of the title.
  const used = lines.join(" ").split(/\s+/).length;
  if (used < words.length) lines[lines.length - 1] += "…";
  return lines;
}

/* Load a wallpaper source image: local originals/ first, then R2. */
async function loadSource(w, kind) {
  const local = [".jpg", ".jpeg", ".png", ".webp"]
    .map((e) => path.join(REPO, "originals", w.slug, `${kind}${e}`))
    .find((p) => fs.existsSync(p));
  if (local) return fs.readFileSync(local);

  const url = kind === "sp" ? w.spUrl : w.pcUrl;
  if (!url || url.includes("REPLACE-ME")) {
    throw new Error(`no local originals/${w.slug}/${kind}.* and no usable ${kind}Url`);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function svgBuf(markup) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${markup}</svg>`);
}

/* A rounded-corner version of `buf` at w×h, as a PNG with alpha. */
async function rounded(buf, w, h, radius) {
  const img = await sharp(buf).resize(w, h, { fit: "cover" }).png().toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<rect width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  return sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

/* ---------- variant 01: the artwork, cropped to 2:3 ---------- */
async function pinArtwork(w, sp) {
  // A small brand mark keeps the pin attributable when it is re-shared.
  const mark = svgBuf(`
    <rect x="0" y="${H - 96}" width="${W}" height="96" fill="${BG}" fill-opacity="0.92"/>
    <text x="${W / 2}" y="${H - 38}" text-anchor="middle" font-family="${SANS}"
          font-size="24" letter-spacing="6" fill="${ACCENT}">STUDIO FUJISAKI</text>`);
  // Centre, not "attention": these wallpapers are poster-style with wide flat
  // margins, and the saliency crop latches onto one bright motif and slides the
  // frame off the composition. The artwork sits centred by construction.
  return sharp(sp)
    .resize(W, H, { fit: "cover", position: "centre" })
    .composite([{ input: mark, top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

/* ---------- variant 02: phone render on a Japandi ground ---------- */
async function pinPhone(w, sp) {
  const PW = 430;
  const PH = 932; // 1290×2796 source ratio, preserved
  const px = Math.round((W - PW) / 2);
  const py = 210;

  const screen = await rounded(sp, PW, PH, 46);
  const short = wrap(w.title, 30, 2);
  const fitsTwo = !short[short.length - 1].endsWith("…");
  const title = fitsTwo ? short : wrap(w.title, 36, 3);
  const size = fitsTwo ? 42 : 36;
  const lead = fitsTwo ? 52 : 45;

  const overlay = svgBuf(`
    <rect width="${W}" height="${H}" fill="${BG_ALT}"/>
    <text x="${W / 2}" y="130" text-anchor="middle" font-family="${SANS}"
          font-size="26" letter-spacing="8" fill="${ACCENT}">FREE IPHONE WALLPAPER</text>
    <rect x="${px - 10}" y="${py - 10}" width="${PW + 20}" height="${PH + 20}" rx="56" ry="56"
          fill="none" stroke="${LINE}" stroke-width="2"/>
    ${title
      .map(
        (l, i) =>
          `<text x="${W / 2}" y="${py + PH + 96 + i * lead}" text-anchor="middle" ` +
          `font-family="${SERIF}" font-size="${size}" fill="${INK}">${esc(l)}</text>`
      )
      .join("")}
    <text x="${W / 2}" y="${py + PH + 96 + title.length * lead + 34}" text-anchor="middle"
          font-family="${SANS}" font-size="24" fill="${MUTED}">${esc(
    [w.artist, w.era].filter(Boolean).join(" · ")
  )}</text>`);

  return sharp(overlay)
    .composite([{ input: screen, top: py, left: px }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

/* ---------- variant 03: artwork + captioned panel ---------- */
/* Built from the phone image, not the PC one: these wallpapers are poster-style
   with wide flat margins, so cropping the 16:9 PC render to a landscape band
   yields mostly empty ground. The tall phone render crops to the artwork. */
async function pinText(w, sp) {
  const IMG_H = 940;
  const art = await sharp(sp)
    .resize(W, IMG_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // Long museum titles get a third line at a smaller size rather than an
  // ellipsis — the full title is what people search Pinterest for.
  const credit = [w.artist, w.era].filter(Boolean).join(" · ");
  const short = wrap(w.title, 26, 2);
  const fitsTwo = !short[short.length - 1].endsWith("…");
  const title = fitsTwo ? short : wrap(w.title, 30, 3);
  const size = fitsTwo ? 52 : 44;
  const lead = fitsTwo ? 62 : 54;
  const titleTop = IMG_H + 150;

  const overlay = svgBuf(`
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <text x="${W / 2}" y="${IMG_H + 78}" text-anchor="middle" font-family="${SANS}"
          font-size="26" letter-spacing="8" fill="${ACCENT}">FREE 4K WALLPAPER</text>
    ${title
      .map(
        (l, i) =>
          `<text x="${W / 2}" y="${titleTop + i * lead}" text-anchor="middle" ` +
          `font-family="${SERIF}" font-size="${size}" fill="${INK}">${esc(l)}</text>`
      )
      .join("")}
    ${
      credit
        ? `<text x="${W / 2}" y="${titleTop + title.length * lead + 18}" text-anchor="middle" ` +
          `font-family="${SANS}" font-size="26" fill="${MUTED}">${esc(credit)}</text>`
        : ""
    }
    <line x1="${W / 2 - 60}" y1="${H - 108}" x2="${W / 2 + 60}" y2="${H - 108}"
          stroke="${LINE}" stroke-width="2"/>
    <text x="${W / 2}" y="${H - 58}" text-anchor="middle" font-family="${SANS}"
          font-size="24" letter-spacing="6" fill="${ACCENT}">STUDIO FUJISAKI</text>`);

  return sharp(overlay)
    .composite([{ input: art, top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

async function buildFor(w, outRoot, quality) {
  const dir = path.join(outRoot, w.slug);
  fs.mkdirSync(dir, { recursive: true });

  const sp = await loadSource(w, "sp");

  const variants = [
    ["01-artwork.jpg", await pinArtwork(w, sp)],
    ["02-phone.jpg", await pinPhone(w, sp)],
    ["03-text.jpg", await pinText(w, sp)],
  ];

  for (const [name, buf] of variants) {
    const out = path.join(dir, name);
    // Re-encode at the requested quality only when it differs from the default.
    const final =
      quality === 88 ? buf : await sharp(buf).jpeg({ quality, mozjpeg: true }).toBuffer();
    fs.writeFileSync(out, final);
    console.log(`✓ ${path.relative(REPO, out)}  (${(final.length / 1024).toFixed(0)} KB)`);
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (!flags.slug && !flags.all) {
    console.error("Usage: node gen-pin.js --slug <slug> | --all  [--outdir pins] [--quality 88]");
    process.exit(1);
  }

  const json = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const targets = flags.all
    ? json.wallpapers
    : json.wallpapers.filter((w) => w.slug === flags.slug);

  if (!targets.length) {
    console.error(`slug "${flags.slug}" not found in wallpapers.json`);
    process.exit(1);
  }

  const outRoot = path.join(REPO, flags.outdir || "pins");
  const quality = Number(flags.quality) || 88;

  let failed = 0;
  for (const w of targets) {
    console.log(`\n${w.slug}`);
    try {
      await buildFor(w, outRoot, quality);
    } catch (err) {
      // One unreachable source must not abandon the rest of a --all run.
      failed++;
      console.error(`  ✗ skipped: ${err.message}`);
    }
  }

  console.log(
    `\n✓ ${targets.length - failed}/${targets.length} wallpaper(s) → ${path.relative(REPO, outRoot)}/`
  );
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error("gen-pin failed:", err.message);
  process.exit(1);
});
