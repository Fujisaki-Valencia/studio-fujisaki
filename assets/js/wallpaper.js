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

      // Vertical thumb is used as OG image so Pinterest previews stay tall.
      SF.setMeta({
        title: w.title,
        description: `${w.title} by ${w.artist} — free Japandi wallpaper from ${w.museum}. Download for PC (4K) and phone.`,
        type: "article",
        image: C.SITE_URL + "/" + w.thumb,
        imageWidth: 600,
        imageHeight: 900,
        path: "wallpaper.html?slug=" + w.slug,
      });

      const collName = SF.collectionName(w.collection);

      host.innerHTML = `
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="index.html">Home</a> ›
          <a href="collection.html?c=${w.collection}">${SF.escape(collName)}</a> ›
          <span>${SF.escape(w.title)}</span>
        </nav>
        <div class="detail">
          <div class="preview">
            <img src="${SF.escape(w.thumb)}" alt="${SF.escape(w.title)} by ${SF.escape(w.artist)}" width="600" height="375">
          </div>
          <div class="detail-info">
            <p class="section-head kicker" style="margin-bottom:.6rem">${SF.escape(collName)}</p>
            <h1>${SF.escape(w.title)}</h1>
            <dl>
              <dt>Artist</dt><dd>${SF.escape(w.artist)}</dd>
              <dt>Era</dt><dd>${SF.escape(w.era)}</dd>
              <dt>Museum</dt><dd>${SF.escape(w.museum)}</dd>
            </dl>

            <div class="download-block">
              <a class="btn btn--solid" href="${SF.escape(w.pcUrl)}" download
                 rel="noopener">↓ Download for PC (4K)</a>
              <a class="btn btn--solid" href="${SF.escape(w.spUrl)}" download
                 rel="noopener">↓ Download for Phone</a>
              <a class="btn btn--kofi" href="${SF.escape(C.KOFI_URL)}"
                 target="_blank" rel="noopener">☕ Support on Ko-fi</a>
            </div>

            <div class="credit">
              <strong>Credit &amp; source.</strong>
              “${SF.escape(w.title)}” by ${SF.escape(w.artist)} (${SF.escape(w.era)}),
              collection of ${SF.escape(w.museum)}.
              The original artwork is in the public domain. Credit is kept here on the
              page and is never burned into the wallpaper image.
              See our <a href="license.html">License / Credits</a> for details.
            </div>
          </div>
        </div>`;
    })
    .catch(() => {
      host.innerHTML = `<div class="empty-state">Could not load this wallpaper.</div>`;
    });
})();
