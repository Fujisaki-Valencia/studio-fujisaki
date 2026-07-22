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

  /* ---------- device preview (mockups) ---------- */
  // Minimal line-style SVG icons, sized to the current font (1em).
  const ICONS = {
    artwork:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-6 6"/></svg>',
    ultrawide:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6.5" width="20" height="9" rx="1.2"/><path d="M9 19h6M12 15.5V19"/></svg>',
    macbook:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="10" rx="1.2"/><path d="M2 18.5h20M9.5 15h5"/></svg>',
    ipad:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="1.6"/><path d="M11 18.5h2"/></svg>',
    iphone:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 19h3"/></svg>',
  };
  // Reuse the same device icons outside this module (e.g. download buttons).
  SF.deviceIcon = function (key) { return ICONS[key] || ""; };
  // Order and labels of the toggle. "artwork" is the default (plain thumbnail).
  SF.DEVICES = [
    { key: "artwork", label: "Artwork" },
    { key: "ultrawide", label: "Ultrawide" },
    { key: "macbook", label: "MacBook" },
    { key: "ipad", label: "iPad" },
    { key: "iphone", label: "iPhone" },
  ];

  // Build the toolbar markup. `only` optionally limits to devices that exist.
  SF.deviceBar = function (only) {
    const devices = SF.DEVICES.filter(
      (d) => d.key === "artwork" || !only || only.includes(d.key)
    );
    const btns = devices
      .map(
        (d, i) =>
          `<button type="button" class="device-btn${i === 0 ? " is-active" : ""}" ` +
          `data-device="${d.key}" aria-pressed="${i === 0}" title="${d.label}" ` +
          `aria-label="Preview: ${d.label}">${ICONS[d.key]}<span>${d.label}</span></button>`
      )
      .join("");
    return `<div class="device-bar" role="group" aria-label="Preview device">${btns}</div>`;
  };

  // Wire a toolbar: calls onChange(deviceKey) when the active button changes.
  SF.wireDeviceBar = function (bar, onChange) {
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      const btn = e.target.closest(".device-btn");
      if (!btn || btn.classList.contains("is-active")) return;
      bar.querySelectorAll(".device-btn").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      onChange(btn.getAttribute("data-device"));
    });
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

  function upsertCanonical(href) {
    let el = document.head.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  // Pinterest domain-ownership verification — a permanent tag emitted on every
  // page (including those without setMeta, e.g. 404), sourced from the constant.
  if (C.PINTEREST_DOMAIN_VERIFY) {
    upsertMeta("name", "p:domain_verify", C.PINTEREST_DOMAIN_VERIFY);
  }

  /* opts: {title, description, image, imageWidth, imageHeight, type, path} */
  SF.setMeta = function (opts) {
    opts = opts || {};
    const title = opts.title
      ? `${opts.title} — ${C.BRAND_NAME}`
      : `${C.BRAND_NAME} — ${C.TAGLINE}`;
    const desc = opts.description || C.TAGLINE;
    const url = C.SITE_URL + "/" + (opts.path || "");

    // Fall back to the site's default OG image when a page supplies none.
    let image = opts.image, iw = opts.imageWidth, ih = opts.imageHeight;
    if (!image && C.DEFAULT_OG_IMAGE) {
      image = C.SITE_URL + "/" + C.DEFAULT_OG_IMAGE;
      iw = C.DEFAULT_OG_IMAGE_WIDTH;
      ih = C.DEFAULT_OG_IMAGE_HEIGHT;
    }

    document.title = title;
    upsertMeta("name", "description", desc);
    upsertCanonical(url);

    upsertMeta("property", "og:site_name", C.BRAND_NAME);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", opts.type || "website");
    upsertMeta("property", "og:url", url);

    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", desc);

    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
      if (iw) upsertMeta("property", "og:image:width", String(iw));
      if (ih) upsertMeta("property", "og:image:height", String(ih));
    }
  };

  /* ---------- header / footer ---------- */
  /* ---------- Ko-fi button ---------- */
  // Line-style coffee icon to match the site's minimal iconography (no emoji).
  const KOFI_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"/><path d="M17 9h2.4a2.5 2.5 0 0 1 0 5H17"/><path d="M7.5 3.2c0 1-1 1.4-1 2.4M11 3.2c0 1-1 1.4-1 2.4"/></svg>';
  SF.kofiButton = function () {
    return (
      `<a class="btn btn--kofi" href="${SF.escape(C.KOFI_URL)}" ` +
      `target="_blank" rel="noopener">${KOFI_ICON}<span>Support on Ko-fi</span></a>`
    );
  };

  const NAV = [
    { href: "index.html", label: "Home", page: "home" },
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
          <a class="brand" href="index.html">
            <img class="brand-lockup" src="assets/img/logo-lockup.png"
              alt="${SF.escape(C.BRAND_NAME)} — Japandi Wallpapers" width="500" height="128">
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
              ${SF.kofiButton()}
            </p>
          </div>
          <div>
            <h4>Site</h4>
            <a href="index.html">Home</a>
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
