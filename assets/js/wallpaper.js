/* Wallpaper detail page. URL: wallpaper.html?slug=<slug> */
(function () {
  "use strict";
  const C = window.CONFIG;
  const slug = SF.qs("slug");
  const host = document.querySelector("[data-detail]");
  if (!host) return;

  // Best enlarged source for a device: artwork = full-size R2 image; a device
  // mockup = that mockup webp (thumb as last-resort fallback).
  function enlargedSrc(w, device) {
    if (device === "artwork") return w.pcUrl;
    return (w.mockups && w.mockups[device]) || w.thumb;
  }

  /* Lightbox: enlarged preview overlay with its own device toggle.
     Created once, reused; the toolbar is rebuilt per open. */
  function openLightbox(w, initialDevice, mockupKeys) {
    let box = document.querySelector("[data-lightbox]");
    if (!box) {
      box = document.createElement("div");
      box.className = "lightbox";
      box.setAttribute("data-lightbox", "");
      box.innerHTML =
        '<button class="lightbox__close" type="button" aria-label="Close">×</button>' +
        '<div class="lightbox__stage"><img class="lightbox__img" alt=""></div>' +
        '<div class="lightbox__bar" data-lightbox-bar></div>';
      document.body.appendChild(box);
      const close = function () {
        box.classList.remove("is-open");
        document.body.style.overflow = "";
      };
      box.addEventListener("click", function (e) {
        // Close on backdrop / empty stage / the × button — not on image or toolbar.
        if (
          e.target === box ||
          e.target.classList.contains("lightbox__stage") ||
          e.target.classList.contains("lightbox__close")
        )
          close();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    }

    const img = box.querySelector(".lightbox__img");
    const barHost = box.querySelector("[data-lightbox-bar]");
    const show = function (device) {
      img.src = enlargedSrc(w, device);
      img.alt = w.title;
    };
    show(initialDevice);

    // Device toggle inside the lightbox (only when the work has mockups).
    if (mockupKeys && mockupKeys.length) {
      barHost.hidden = false;
      barHost.innerHTML = SF.deviceBar(mockupKeys);
      const bar = barHost.querySelector(".device-bar");
      bar.querySelectorAll(".device-btn").forEach(function (b) {
        const on = b.getAttribute("data-device") === initialDevice;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      SF.wireDeviceBar(bar, show);
    } else {
      barHost.hidden = true;
      barHost.innerHTML = "";
    }

    box.classList.add("is-open");
    document.body.style.overflow = "hidden";
    box.querySelector(".lightbox__close").focus();
  }

  SF.loadWallpapers()
    .then((items) => {
      const w = items.find((x) => x.slug === slug);
      if (!w) {
        SF.setMeta({ title: "Not found" });
        host.innerHTML = `<div class="empty-state">
          <p>Sorry, this wallpaper could not be found.</p>
          <p><a class="btn" href="index.html">Back to home</a></p>
        </div>`;
        return;
      }

      const byArtist = w.artist ? ` by ${w.artist}` : "";

      // OG image: this wallpaper's MacBook mockup (4:3), falling back to its thumb.
      const hasMacbook = w.mockups && w.mockups.macbook;
      SF.setMeta({
        title: w.title,
        description: `${w.title}${byArtist} — free Japandi wallpaper. Download for PC & tablet, phone and ultrawide.`,
        type: "article",
        image: C.SITE_URL + "/" + (hasMacbook ? w.mockups.macbook : w.thumb),
        imageWidth: hasMacbook ? 900 : 600,
        imageHeight: hasMacbook ? 675 : 338,
        path: "wallpaper.html?slug=" + w.slug,
      });

      // Only show the metadata rows that this wallpaper actually has.
      const metaRows = [
        ["Artist", w.artist],
        ["Era", w.era],
        ["Source", w.museum],
      ]
        .filter(([, v]) => v)
        .map(([k, v]) => `<dt>${k}</dt><dd>${SF.escape(v)}</dd>`)
        .join("");

      // Neutral credit line, built only from the fields that are present.
      const creditParts = [
        w.artist ? SF.escape(w.artist) : "",
        w.era ? `(${SF.escape(w.era)})` : "",
      ].filter(Boolean).join(" ");
      const creditLead = creditParts
        ? `“${SF.escape(w.title)}” — ${creditParts}${w.museum ? `, ${SF.escape(w.museum)}` : ""}. `
        : "";

      // Which device mockups this wallpaper actually has (drives the toolbar).
      const mk = w.mockups || {};
      const mockupKeys = SF.DEVICES
        .filter((d) => d.key !== "artwork" && mk[d.key])
        .map((d) => d.key);

      host.innerHTML = `
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="index.html">Home</a> ›
          <span>${SF.escape(w.title)}</span>
        </nav>
        <div class="detail">
          <div class="preview-col">
            ${mockupKeys.length ? SF.deviceBar(mockupKeys) : ""}
            <div class="preview" data-preview>
              <img src="${SF.escape(w.thumb)}" alt="${SF.escape(w.title)}${byArtist ? " " + SF.escape(byArtist.trim()) : ""}" width="600" height="375" data-thumb="${SF.escape(w.thumb)}">
            </div>
          </div>
          <div class="detail-info">
            <p class="section-head kicker" style="margin-bottom:.6rem">Wallpaper</p>
            <h1>${SF.escape(w.title)}</h1>
            ${metaRows ? `<dl>${metaRows}</dl>` : ""}

            <div class="download-block">
              <a class="btn btn--solid" href="${SF.escape(w.pcUrl)}" download
                 rel="noopener">↓ Download for PC &amp; Tablet</a>
              <a class="btn btn--solid" href="${SF.escape(w.spUrl)}" download
                 rel="noopener">↓ Download for Phone</a>
              <a class="btn btn--solid" href="${SF.escape(w.uwUrl)}" download
                 rel="noopener">↓ Download for Ultrawide</a>
              ${SF.kofiButton()}
            </div>

            <div class="credit">
              <strong>Credit.</strong>
              ${creditLead}Credit is kept here on the page and is never burned into the
              wallpaper image. See our <a href="license.html">License / Credits</a> for details.
            </div>
          </div>
        </div>`;

      const preview = host.querySelector("[data-preview]");
      let currentDevice = "artwork"; // tracks the on-page preview mode

      // Wire the preview toolbar (present only when the wallpaper has mockups).
      const bar = host.querySelector(".device-bar");
      if (bar && preview) {
        const img = preview.querySelector("img");
        SF.wireDeviceBar(bar, (device) => {
          currentDevice = device;
          img.src = device === "artwork" ? img.dataset.thumb : mk[device] || img.dataset.thumb;
          preview.classList.toggle("is-mockup", device !== "artwork");
        });
      }

      // Click the preview to view it enlarged. The lightbox opens in the current
      // mode and carries its own device toggle.
      if (preview) {
        preview.addEventListener("click", function () {
          openLightbox(w, currentDevice, mockupKeys);
        });
      }
    })
    .catch(() => {
      host.innerHTML = `<div class="empty-state">Could not load this wallpaper.</div>`;
    });
})();
