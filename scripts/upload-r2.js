#!/usr/bin/env node
/*
 * upload-r2 — upload a wallpaper's full-size pc.jpg / sp.jpg / uw.jpg to Cloudflare
 * R2 (the standard 3-piece set: PC / phone / ultrawide), then write the resulting
 * absolute URLs into data/wallpapers.json.
 *
 * Usage:
 *   node upload-r2.js --slug <slug> --dir <folder-with-pc.jpg-sp.jpg-uw.jpg>
 *
 * Example:
 *   node upload-r2.js --slug irises-screen --dir ./originals/irises-screen
 *
 * Credentials come ONLY from environment variables (loaded from .env via dotenv).
 * They are NEVER read from config.js or committed to the repo. Required env:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET, R2_PUBLIC_BASE_URL, R2_ENDPOINT
 *
 * Requires: @aws-sdk/client-s3, dotenv  (npm install)
 */
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const REPO = path.resolve(__dirname, "..");
const JSON_PATH = path.join(REPO, "data", "wallpapers.json");

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

function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Missing environment variables (set them in .env):");
    missing.forEach((k) => console.error("  - " + k));
    console.error("See .env.example. Never commit real credentials.");
    process.exit(1);
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const slug = flags.slug;
  const dir = flags.dir;
  if (!slug || !dir) {
    console.error("Usage: node upload-r2.js --slug <slug> --dir <folder>");
    process.exit(1);
  }

  requireEnv([
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_BASE_URL",
    "R2_ENDPOINT",
  ]);

  const files = [
    { local: path.join(dir, "pc.jpg"), key: `${slug}/pc.jpg`, field: "pcUrl" },
    { local: path.join(dir, "sp.jpg"), key: `${slug}/sp.jpg`, field: "spUrl" },
    { local: path.join(dir, "uw.jpg"), key: `${slug}/uw.jpg`, field: "uwUrl" },
  ];

  for (const f of files) {
    if (!fs.existsSync(f.local)) {
      console.error(`Expected file not found: ${f.local}`);
      process.exit(1);
    }
  }

  let S3Client, PutObjectCommand;
  try {
    ({ S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"));
  } catch (e) {
    console.error("This script needs `@aws-sdk/client-s3`. Run `npm install` inside scripts/.");
    process.exit(1);
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const base = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const urls = {};

  for (const f of files) {
    const body = fs.readFileSync(f.local);
    process.stdout.write(`Uploading ${f.key} … `);
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: f.key,
        Body: body,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    urls[f.field] = `${base}/${f.key}`;
    console.log("done");
  }

  // Reflect the resulting URLs into wallpapers.json.
  const json = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const entry = json.wallpapers.find((w) => w.slug === slug);
  if (!entry) {
    console.warn(
      `\n⚠ slug "${slug}" not found in wallpapers.json — uploaded, but URLs not written.`
    );
    console.warn(`  pcUrl: ${urls.pcUrl}`);
    console.warn(`  spUrl: ${urls.spUrl}`);
    console.warn(`  uwUrl: ${urls.uwUrl}`);
    console.warn("  Run add-wallpaper first, then re-run upload-r2.");
    process.exit(0);
  }
  entry.pcUrl = urls.pcUrl;
  entry.spUrl = urls.spUrl;
  entry.uwUrl = urls.uwUrl;
  fs.writeFileSync(JSON_PATH, JSON.stringify(json, null, 2) + "\n");

  console.log(`✓ URLs written to wallpapers.json for "${slug}":`);
  console.log(`  pcUrl: ${urls.pcUrl}`);
  console.log(`  spUrl: ${urls.spUrl}`);
  console.log(`  uwUrl: ${urls.uwUrl}`);
}

main().catch((err) => {
  console.error("upload-r2 failed:", err.message);
  process.exit(1);
});
