/* =========================================================
   Studio Fujisaki — shared site helpers
   Depends on: config.js (window.CONFIG)
   Provides: header/footer rendering, data loading, SEO helpers.
   All internal paths are RELATIVE so the site works both at
   a project subpath and at a custom-domain root.
   ========================================================= */
(function () {
  "use strict";
  const C = window.CONFIG;

  /* ---------- tiny helpers ---------- */
  window.SF = window.SF || {};

  SF.qs = function (name) {
    return new URLSearchParams(location.search).get(name);
  };

  SF.escape = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  SF.collectionName = function (slug) {
    const c = (C.COLLECTIONS || []).find((x) => x.slug === slug);
    return c ? c.name : slug;
  };

  /* Load and cache wallpaper data. Returns a Promise<Array>. */
  let _dataPromise = null;
  SF.loadWallpapers = function () {
    if (!_dataPromise) {
      _dataPromise = fetch("data/wallpapers.json", { cache: "no-cache" })
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load wallpapers.json");
          return r.json();
        })
        .then((json) => (json && json.wallpapers) || []);
    }
    return _dataPromise;
  };

  /* ---------- SEO / social meta ---------- */
  function upsertMeta(attr, key, content) {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  /* opts: {title, description, image, imageWidth, imageHeight, type, path} */
  SF.setMeta = function (opts) {
    opts = opts || {};
    const title = opts.title
      ? `${opts.title} — ${C.BRAND_NAME}`
      : `${C.BRAND_NAME} — ${C.TAGLINE}`;
    const desc = opts.description || C.TAGLINE;
    const url = C.SITE_URL + "/" + (opts.path || "");

    document.title = title;
    upsertMeta("name", "description", desc);

    upsertMeta("property", "og:site_name", C.BRAND_NAME);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", opts.type || "website");
    upsertMeta("property", "og:url", url);

    upsertMeta("name", "twitter:card",
      opts.image ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", desc);

    if (opts.image) {
      upsertMeta("property", "og:image", opts.image);
      upsertMeta("name", "twitter:image", opts.image);
      // Pinterest / vertical OG support
      if (opts.imageWidth) upsertMeta("property", "og:image:width", String(opts.imageWidth));
      if (opts.imageHeight) upsertMeta("property", "og:image:height", String(opts.imageHeight));
    }
  };

  /* ---------- header / footer ---------- */
  const NAV = [
    { href: "index.html", label: "Home", page: "home" },
    { href: "gallery.html", label: "Wallpapers", page: "gallery" },
    { href: "about.html", label: "About", page: "about" },
    { href: "license.html", label: "License", page: "license" },
  ];

  function renderHeader() {
    const host = document.querySelector("[data-header]");
    if (!host) return;
    const current = document.body.getAttribute("data-page");
    const links = NAV.map(
      (n) =>
        `<a href="${n.href}"${n.page === current ? ' aria-current="page"' : ""}>${n.label}</a>`
    ).join("");
    host.innerHTML = `
      <header class="site-header">
        <div class="container">
          <a class="brand" href="index.html">${SF.escape(C.BRAND_NAME)}
            <span>Japandi Wallpapers</span>
          </a>
          <nav class="nav" aria-label="Primary">${links}</nav>
        </div>
      </header>`;
  }

  function renderFooter() {
    const host = document.querySelector("[data-footer]");
    if (!host) return;
    const year = new Date().getFullYear();
    host.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="brand-block">
            <h4>${SF.escape(C.BRAND_NAME)}</h4>
            <p>${SF.escape(C.TAGLINE)}</p>
            <p style="margin-top:1rem">
              <a class="btn btn--kofi" href="${SF.escape(C.KOFI_URL)}"
                 target="_blank" rel="noopener">☕ Support on Ko-fi</a>
            </p>
          </div>
          <div>
            <h4>Browse</h4>
            <a href="index.html">Home</a>
            <a href="gallery.html">All wallpapers</a>
          </div>
          <div>
            <h4>Site</h4>
            <a href="about.html">About</a>
            <a href="license.html">License / Credits</a>
            <a href="privacy.html">Privacy Policy</a>
          </div>
        </div>
        <div class="container footer-bottom">
          © ${year} ${SF.escape(C.BRAND_NAME)}. Japandi wallpapers, free for personal use.
        </div>
      </footer>`;
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderHeader();
    renderFooter();
  });
})();
