#!/usr/bin/env node
/*
 * gen-sitemap — regenerate ../sitemap.xml from wallpapers.json.
 * (Optional helper.) The site base URL is read from --base or SITE_URL env,
 * falling back to the placeholder domain.
 *
 * Usage:  node gen-sitemap.js --base https://your-domain.com
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const base = (process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : process.env.SITE_URL || "https://fujisaki-valencia.github.io/studio-fujisaki"
).replace(/\/+$/, "");

const data = JSON.parse(fs.readFileSync(path.join(REPO, "data", "wallpapers.json"), "utf8"));

const urls = [
  `  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  `  <url><loc>${base}/about.html</loc><priority>0.5</priority></url>`,
  `  <url><loc>${base}/license.html</loc><priority>0.4</priority></url>`,
  `  <url><loc>${base}/privacy.html</loc><priority>0.3</priority></url>`,
  ...data.wallpapers.map(
    (w) => `  <url><loc>${base}/wallpaper.html?slug=${w.slug}</loc><priority>0.6</priority></url>`
  ),
];

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.join("\n") +
  `\n</urlset>\n`;

fs.writeFileSync(path.join(REPO, "sitemap.xml"), xml);
console.log(`✓ sitemap.xml regenerated with base ${base} (${data.wallpapers.length} wallpapers)`);
