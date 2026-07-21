#!/usr/bin/env node
/*
 * add-wallpaper — append one wallpaper block to data/wallpapers.json.
 *
 * Two ways to run:
 *   1) Flags:
 *      node add-wallpaper.js \
 *        --title "Irises" --artist "Ogata Korin" --era "Edo period, c. 1710s" \
 *        --museum "Nezu Museum" --collection sage-and-stone
 *   2) Interactive (no flags): you'll be prompted for each field.
 *
 * The slug is auto-generated from the title (override with --slug).
 * thumb defaults to  thumbs/<slug>.webp  and its existence is verified.
 * pcUrl / spUrl are left as REPLACE-ME placeholders here — `upload-r2`
 * fills the real URLs in later.
 *
 * Before writing, it validates: JSON parses, required fields present,
 * slug is unique, and the thumb file exists.
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const REPO = path.resolve(__dirname, "..");
const JSON_PATH = path.join(REPO, "data", "wallpapers.json");

const VALID_COLLECTIONS = ["ink-and-mist", "sage-and-stone", "warm-sand"];
const REQUIRED = ["title", "artist", "era", "museum", "collection"];

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
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
  data.title = await ask(rl, "Title", data.title);
  data.artist = await ask(rl, "Artist", data.artist);
  data.era = await ask(rl, "Era", data.era);
  data.museum = await ask(rl, "Museum", data.museum);
  data.collection = await ask(
    rl,
    `Collection (${VALID_COLLECTIONS.join(" / ")})`,
    data.collection
  );
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
  if (entry.collection && !VALID_COLLECTIONS.includes(entry.collection)) {
    errors.push(
      `collection "${entry.collection}" is not one of: ${VALID_COLLECTIONS.join(", ")}`
    );
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
    collection: flags.collection,
  };

  const input = hasFlags ? seed : await collectInteractive(seed);

  const slug = flags.slug ? slugify(flags.slug) : slugify(input.title);
  const R2 = process.env.R2_PUBLIC_BASE_URL || "https://REPLACE-ME.r2.example.com";

  const entry = {
    slug,
    title: input.title,
    artist: input.artist,
    era: input.era,
    museum: input.museum,
    collection: input.collection,
    thumb: flags.thumb || `thumbs/${slug}.webp`,
    pcUrl: flags.pcUrl || `${R2}/${slug}/pc.jpg`,
    spUrl: flags.spUrl || `${R2}/${slug}/sp.jpg`,
  };

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
