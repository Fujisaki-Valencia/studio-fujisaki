/* Collection page: shows one collection's works as a card grid.
   URL: collection.html?c=<slug>  (no slug → lists all collections) */
(function () {
  "use strict";
  const C = window.CONFIG;
  const slug = SF.qs("c");
  const coll = (C.COLLECTIONS || []).find((x) => x.slug === slug);

  const titleEl = document.querySelector("[data-coll-title]");
  const kickerEl = document.querySelector("[data-coll-kicker]");
  const descEl = document.querySelector("[data-coll-desc]");
  const gridEl = document.querySelector("[data-coll-grid]");
  const crumbEl = document.querySelector("[data-coll-crumb]");

  if (!coll) {
    // no / unknown collection → offer the list
    SF.setMeta({ title: "Collections", path: "collection.html" });
    if (kickerEl) kickerEl.textContent = "Browse";
    if (titleEl) titleEl.textContent = "Collections";
    if (descEl) descEl.textContent = "Choose a mood.";
    if (gridEl) {
      gridEl.className = "grid grid--3";
      gridEl.innerHTML = (C.COLLECTIONS || [])
        .map(
          (c) => `
        <a class="collection-card" href="collection.html?c=${c.slug}">
          <h3>${SF.escape(c.name)}</h3>
          <p>${SF.escape(c.description)}</p>
          <span class="more">View collection →</span>
        </a>`
        )
        .join("");
    }
    return;
  }

  SF.setMeta({
    title: coll.name,
    description: coll.description,
    path: "collection.html?c=" + coll.slug,
  });
  if (kickerEl) kickerEl.textContent = "Collection";
  if (titleEl) titleEl.textContent = coll.name;
  if (descEl) descEl.textContent = coll.description;
  if (crumbEl) crumbEl.textContent = coll.name;

  SF.loadWallpapers()
    .then((items) => {
      const works = items.filter((w) => w.collection === coll.slug);
      if (!works.length) {
        gridEl.className = "";
        gridEl.innerHTML = `<p class="empty-state">No wallpapers in this collection yet.</p>`;
        return;
      }
      gridEl.className = "card-grid";
      gridEl.innerHTML = works
        .map(
          (w) => `
        <a class="card" href="wallpaper.html?slug=${encodeURIComponent(w.slug)}">
          <div class="thumb-wrap">
            <img src="${SF.escape(w.thumb)}" alt="${SF.escape(w.title)}"
                 loading="lazy" width="600" height="375">
          </div>
          <div class="card-body">
            <h3>${SF.escape(w.title)}</h3>
            <p>${SF.escape(w.artist)}</p>
          </div>
        </a>`
        )
        .join("");
    })
    .catch(() => {
      gridEl.innerHTML = `<p class="empty-state">Could not load wallpapers.</p>`;
    });
})();
