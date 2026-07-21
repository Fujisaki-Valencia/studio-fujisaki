/* Wallpaper detail page. URL: wallpaper.html?slug=<slug> */
(function () {
  "use strict";
  const C = window.CONFIG;
  const slug = SF.qs("slug");
  const host = document.querySelector("[data-detail]");
  if (!host) return;

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

      // Vertical thumb is used as OG image so Pinterest previews stay tall.
      SF.setMeta({
        title: w.title,
        description: `${w.title}${byArtist} — free Japandi wallpaper. Download for PC (4K), phone and ultrawide.`,
        type: "article",
        image: C.SITE_URL + "/" + w.thumb,
        imageWidth: 600,
        imageHeight: 900,
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

      host.innerHTML = `
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="index.html">Home</a> ›
          <a href="gallery.html">All wallpapers</a> ›
          <span>${SF.escape(w.title)}</span>
        </nav>
        <div class="detail">
          <div class="preview">
            <img src="${SF.escape(w.thumb)}" alt="${SF.escape(w.title)}${byArtist ? " " + SF.escape(byArtist.trim()) : ""}" width="600" height="375">
          </div>
          <div class="detail-info">
            <p class="section-head kicker" style="margin-bottom:.6rem">Wallpaper</p>
            <h1>${SF.escape(w.title)}</h1>
            ${metaRows ? `<dl>${metaRows}</dl>` : ""}

            <div class="download-block">
              <a class="btn btn--solid" href="${SF.escape(w.pcUrl)}" download
                 rel="noopener">↓ Download for PC (4K)</a>
              <a class="btn btn--solid" href="${SF.escape(w.spUrl)}" download
                 rel="noopener">↓ Download for Phone</a>
              <a class="btn btn--solid" href="${SF.escape(w.uwUrl)}" download
                 rel="noopener">↓ Download for Ultrawide</a>
              <a class="btn btn--kofi" href="${SF.escape(C.KOFI_URL)}"
                 target="_blank" rel="noopener">☕ Support on Ko-fi</a>
            </div>

            <div class="credit">
              <strong>Credit.</strong>
              ${creditLead}Credit is kept here on the page and is never burned into the
              wallpaper image. See our <a href="license.html">License / Credits</a> for details.
            </div>
          </div>
        </div>`;
    })
    .catch(() => {
      host.innerHTML = `<div class="empty-state">Could not load this wallpaper.</div>`;
    });
})();
