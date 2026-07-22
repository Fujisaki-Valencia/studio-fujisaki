#!/usr/bin/env node
/*
 * add-wallpaper — append one wallpaper block to data/wallpapers.json.
 *
 * Two ways to run:
 *   1) Flags:
 *      node add-wallpaper.js --title "Quiet No. 3" \
 *        [--artist "…"] [--era "…"] [--museum "…"]
 *   2) Interactive (no flags): you'll be prompted for each field.
 *
 * Only --title is required. artist / era / museum are optional (a work with no
 * source is fine — the wallpaper page simply hides the rows it doesn't have).
 * A `date` (now, ISO timestamp) is added automatically as the home-feed ordering
 * key (newest first, ties broken by time of day so same-day additions still stack
 * newest-on-top); override with --date. The slug is auto-generated from the
 * title (override with --slug).
 * thumb defaults to  thumbs/<slug>.webp  and its existence is verified.
 * pcUrl / spUrl / uwUrl (PC / phone / ultrawide — the standard 3-piece set)
 * default to REPLACE-ME placeholders here — `upload-r2` fills the real URLs in later.
 *
 * Before writing, it validates: JSON parses, required fields present,
 * slug is unique, and the thumb file exists.
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const REPO = path.resolve(__dirname, "..");
const JSON_PATH = path.join(REPO, "data", "wallpapers.json");

const REQUIRED = ["title"];
// Optional metadata — written only when provided.
const OPTIONAL = ["artist", "era", "museum"];
// Standard 3-piece download set — every entry must carry all three URLs.
const URL_FIELDS = ["pcUrl", "spUrl", "uwUrl"];

// Current instant as a full ISO timestamp (used as the ordering key, so
// same-day additions still sort newest-first instead of tying).
function nowISO() {
  return new Date().toISOString();
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/* An explicit --slug is used verbatim: it has to match the R2 key and the
   mockups/ folder, and slugify would rewrite the "NN_" ordering prefix this
   catalogue uses into "NN-". Only reject characters unsafe in a path or URL. */
function explicitSlug(s) {
  const slug = String(s).trim();
  if (!/^[A-Za-z0-9._-]+$/.test(slug)) {
    console.error(`Invalid --slug "${slug}": use only letters, digits, . _ -`);
    process.exit(1);
  }
  return slug;
}

function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

function ask(rl, q, def) {
  const suffix = def ? ` [${def}]` : "";
  return new Promise((res) =>
    rl.question(`${q}${suffix}: `, (ans) => res(ans.trim() || def || ""))
  );
}

async function collectInteractive(seed) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const data = { ...seed };
  data.title = await ask(rl, "Title (required)", data.title);
  data.artist = await ask(rl, "Artist (optional)", data.artist);
  data.era = await ask(rl, "Era (optional)", data.era);
  data.museum = await ask(rl, "Source / museum (optional)", data.museum);
  rl.close();
  return data;
}

function readJson() {
  let raw;
  try {
    raw = fs.readFileSync(JSON_PATH, "utf8");
  } catch (e) {
    console.error(`Cannot read ${JSON_PATH}: ${e.message}`);
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.wallpapers)) {
      throw new Error('Expected top-level { "wallpapers": [...] }');
    }
    return parsed;
  } catch (e) {
    console.error(`wallpapers.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

function validate(entry, existing) {
  const errors = [];
  for (const key of REQUIRED) {
    if (!entry[key]) errors.push(`missing required field: ${key}`);
  }
  for (const key of URL_FIELDS) {
    if (!entry[key]) errors.push(`missing required URL: ${key}`);
  }
  if (existing.some((w) => w.slug === entry.slug)) {
    errors.push(`slug "${entry.slug}" already exists`);
  }
  const thumbAbs = path.join(REPO, entry.thumb);
  if (!fs.existsSync(thumbAbs)) {
    errors.push(
      `thumb not found: ${entry.thumb} — run gen-thumb first (expected at ${thumbAbs})`
    );
  }
  return errors;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const hasFlags = REQUIRED.some((k) => flags[k]);

  let seed = {
    title: flags.title,
    artist: flags.artist,
    era: flags.era,
    museum: flags.museum,
  };

  const input = hasFlags ? seed : await collectInteractive(seed);

  const slug = flags.slug ? explicitSlug(flags.slug) : slugify(input.title || "");
  const R2 = process.env.R2_PUBLIC_BASE_URL || "https://REPLACE-ME.r2.example.com";

  const entry = { slug, title: input.title };
  // Ordering key for the home feed (newest first). Override with --date.
  entry.date = flags.date || nowISO();
  // Only write optional metadata that was actually provided.
  for (const key of OPTIONAL) {
    if (input[key]) entry[key] = input[key];
  }
  entry.thumb = flags.thumb || `thumbs/${slug}.webp`;
  entry.pcUrl = flags.pcUrl || `${R2}/${slug}/pc.jpg`;
  entry.spUrl = flags.spUrl || `${R2}/${slug}/sp.jpg`;
  entry.uwUrl = flags.uwUrl || `${R2}/${slug}/uw.jpg`;

  const json = readJson();
  const errors = validate(entry, json.wallpapers);
  if (errors.length) {
    console.error("Validation failed:");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  json.wallpapers.push(entry);

  // Re-validate the serialized result parses before writing.
  const serialized = JSON.stringify(json, null, 2) + "\n";
  JSON.parse(serialized); // throws if somehow malformed
  fs.writeFileSync(JSON_PATH, serialized);

  console.log(`✓ added "${entry.title}" (${slug}) to data/wallpapers.json`);
  console.log("  Next: run upload-r2 to attach the real download URLs, then git push.");
}

main().catch((err) => {
  console.error("add-wallpaper failed:", err.message);
  process.exit(1);
});
