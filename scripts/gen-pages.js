#!/usr/bin/env node
/*
 * gen-pages — build one STATIC HTML page per wallpaper.
 *
 * Why this exists: `wallpaper.html?slug=…` builds its <title> / <meta> in the
 * browser (assets/js/site.js → SF.setMeta). Crawlers that do not run JavaScript
 * — Pinterest's in particular — therefore see only the generic shell, so Rich
 * Pins and social previews break. These generated pages carry the full head
 * (title, description, canonical, OG/Twitter, JSON-LD) as static markup.
 *
 * Output: <page>.html at the REPO ROOT — not a subfolder — so the site's
 * "every internal path is relative" rule keeps working unchanged.
 * <page> is the slug with any leading "NN_" ordering prefix removed.
 * The resolved filename is written back onto each entry as `page`, so the rest
 * of the site (home.js cards, gen-sitemap) never has to re-derive it.
 *
 * The <body> holds a static, no-JS fallback of the wallpaper's real content
 * (heading, credits, download links). assets/js/wallpaper.js replaces it with
 * the interactive version on load; search engines and no-JS visitors keep it.
 *
 * Usage:
 *   node gen-pages.js            # rebuild every page
 *   node gen-pages.js --prune    # …and delete pages of wallpapers that are gone
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const JSON_PATH = path.join(REPO, "data", "wallpapers.json");
const MANIFEST = path.join(REPO, "data", "generated-pages.json");

// Hand-written pages and other root files a generated page must never clobber.
const RESERVED = new Set([
  "index", "about", "license", "privacy", "404", "wallpaper",
  "config", "sitemap", "robots",
]);

/* Read config.js without a browser: it is a plain `window.CONFIG = {…}` assignment. */
function loadConfig() {
  const src = fs.readFileSync(path.join(REPO, "config.js"), "utf8");
  const win = {};
  new Function("window", src)(win);
  if (!win.CONFIG) throw new Error("config.js did not set window.CONFIG");
  return win.CONFIG;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Same icon set as assets/js/site.js's device-preview toolbar (ICONS), kept in
// sync by hand: this Node script has no access to that browser-side module.
const DOWNLOAD_ICONS = {
  ultrawide:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6.5" width="20" height="9" rx="1.2"/><path d="M9 19h6M12 15.5V19"/></svg>',
  macbook:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="10" rx="1.2"/><path d="M2 18.5h20M9.5 15h5"/></svg>',
  iphone:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 19h3"/></svg>',
};

/* Filename for a wallpaper: slug minus the leading "NN_" / "NN-" ordering prefix. */
function pageNameFor(slug) {
  return String(slug).replace(/^\d+[_-]/, "") || String(slug);
}

/* The og:image for a wallpaper — its MacBook mockup, or the thumb as fallback. */
function ogImageFor(w) {
  const mk = w.mockups || {};
  return mk.macbook
    ? { rel: mk.macbook, width: 900, height: 675 }
    : { rel: w.thumb, width: 600, height: 338 };
}

function descriptionFor(w) {
  const byArtist = w.artist ? ` by ${w.artist}` : "";
  return `${w.title}${byArtist} — free Japandi wallpaper. Download for PC & tablet, phone and ultrawide.`;
}

/* Schema.org payload. Pinterest reads OG tags, but this also feeds Google. */
function jsonLdFor(w, C, absUrl, absImage) {
  const node = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: w.title,
    description: descriptionFor(w),
    contentUrl: absImage,
    url: absUrl,
    isFamilyFriendly: true,
    license: C.SITE_URL + "/license.html",
    publisher: { "@type": "Organization", name: C.BRAND_NAME, url: C.SITE_URL + "/" },
  };
  if (w.artist) node.creator = { "@type": "Person", name: w.artist };
  if (w.museum) node.sourceOrganization = { "@type": "Organization", name: w.museum };
  if (w.date) node.datePublished = w.date;
  // JSON-LD sits inside <script>, so only "</" needs neutralising — not HTML entities.
  return JSON.stringify(node, null, 2).replace(/<\//g, "<\\/");
}

/* The static fallback that lives inside [data-detail] until wallpaper.js runs. */
function fallbackBody(w) {
  const byArtist = w.artist ? ` by ${w.artist}` : "";
  const rows = [
    ["Artist", w.artist],
    ["Era", w.era],
    ["Source", w.museum],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`)
    .join("");

  return `      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a> ›
        <span>${esc(w.title)}</span>
      </nav>
      <div class="detail">
        <div class="preview-col">
          <div class="preview">
            <img src="${esc(w.thumb)}" alt="${esc(w.title + byArtist)}" width="600" height="375">
          </div>
        </div>
        <div class="detail-info">
          <p class="section-head kicker" style="margin-bottom:.6rem">Wallpaper</p>
          <h1>${esc(w.title)}</h1>
          ${rows ? `<dl>${rows}</dl>` : ""}
          <div class="download-block">
            <a class="btn btn--solid" href="${esc(w.uwUrl)}" download rel="noopener">${DOWNLOAD_ICONS.ultrawide}<span>Download for Ultrawide</span></a>
            <a class="btn btn--solid" href="${esc(w.pcUrl)}" download rel="noopener">${DOWNLOAD_ICONS.macbook}<span>Download for PC &amp; Tablet</span></a>
            <a class="btn btn--solid" href="${esc(w.spUrl)}" download rel="noopener">${DOWNLOAD_ICONS.iphone}<span>Download for Phone</span></a>
          </div>
        </div>
      </div>`;
}

function pageHTML(w, C) {
  const title = `${w.title} — ${C.BRAND_NAME}`;
  const desc = descriptionFor(w);
  const img = ogImageFor(w);
  const absUrl = `${C.SITE_URL}/${w.page}`;
  const absImage = `${C.SITE_URL}/${img.rel}`;
  const byArtist = w.artist ? ` by ${w.artist}` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="p:domain_verify" content="${esc(C.PINTEREST_DOMAIN_VERIFY)}">

  <!-- Generated by scripts/gen-pages.js — do not edit by hand. -->
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(absUrl)}">
  <link rel="icon" href="assets/img/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">

  <meta property="og:site_name" content="${esc(C.BRAND_NAME)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${esc(absUrl)}">
  <meta property="og:image" content="${esc(absImage)}">
  <meta property="og:image:width" content="${img.width}">
  <meta property="og:image:height" content="${img.height}">
  <meta property="og:image:alt" content="${esc(w.title + byArtist)}">
${w.date ? `  <meta property="article:published_time" content="${esc(w.date)}">\n` : ""}${w.artist ? `  <meta property="article:author" content="${esc(w.artist)}">\n` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(absImage)}">

  <script type="application/ld+json">
${jsonLdFor(w, C, absUrl, absImage)}
  </script>

  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body data-page="wallpaper" data-slug="${esc(w.slug)}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div data-header></div>

  <main id="main">
    <section class="section container" data-detail>
${fallbackBody(w)}
    </section>
  </main>

  <div data-footer></div>

  <script src="config.js"></script>
  <script src="assets/js/site.js"></script>
  <script src="assets/js/wallpaper.js"></script>
</body>
</html>
`;
}

function main() {
  const prune = process.argv.includes("--prune");
  const C = loadConfig();
  const json = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const wallpapers = json.wallpapers || [];

  // Resolve filenames first so collisions are caught before anything is written.
  const taken = new Map();
  const errors = [];
  for (const w of wallpapers) {
    const name = pageNameFor(w.slug);
    if (RESERVED.has(name)) {
      errors.push(`slug "${w.slug}" resolves to reserved page name "${name}.html"`);
    } else if (taken.has(name)) {
      errors.push(`slugs "${taken.get(name)}" and "${w.slug}" both resolve to "${name}.html"`);
    } else {
      taken.set(name, w.slug);
    }
    w.page = `${name}.html`;
  }
  if (errors.length) {
    console.error("gen-pages aborted — filename conflicts:");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  const written = [];
  for (const w of wallpapers) {
    fs.writeFileSync(path.join(REPO, w.page), pageHTML(w, C));
    written.push(w.page);
    console.log(`✓ ${w.page}`);
  }

  // Remove pages left behind by wallpapers that were renamed or deleted. Only
  // files this script wrote before are touched — never hand-written pages.
  if (prune && fs.existsSync(MANIFEST)) {
    const previous = JSON.parse(fs.readFileSync(MANIFEST, "utf8")).pages || [];
    for (const old of previous) {
      if (written.includes(old)) continue;
      const abs = path.join(REPO, old);
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
        console.log(`− removed stale ${old}`);
      }
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify({ pages: written }, null, 2) + "\n");
  // Persist the `page` field so home.js / gen-sitemap read it instead of guessing.
  fs.writeFileSync(JSON_PATH, JSON.stringify(json, null, 2) + "\n");

  console.log(`\n✓ ${written.length} wallpaper page(s) generated; \`page\` written to wallpapers.json`);
  if (!prune) console.log("  (run with --prune to also delete pages of removed wallpapers)");
}

try {
  main();
} catch (err) {
  console.error("gen-pages failed:", err.message);
  process.exit(1);
}
