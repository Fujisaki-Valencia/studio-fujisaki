/* Home page: hero + collection entrances + newest works. */
(function () {
  "use strict";
  const C = window.CONFIG;

  SF.setMeta({ path: "index.html" });

  // collection entrance cards
  const collHost = document.querySelector("[data-collections]");
  if (collHost) {
    collHost.innerHTML = (C.COLLECTIONS || [])
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

  // newest few works
  const newHost = document.querySelector("[data-newest]");
  if (newHost) {
    SF.loadWallpapers()
      .then((items) => {
        const newest = items.slice(-3).reverse();
        if (!newest.length) {
          newHost.innerHTML = `<p class="empty-state">No wallpapers yet.</p>`;
          return;
        }
        newHost.innerHTML = newest
          .map(
            (w) => `
          <a class="card" href="wallpaper.html?slug=${encodeURIComponent(w.slug)}">
            <div class="thumb-wrap">
              <img src="${SF.escape(w.thumb)}" alt="${SF.escape(w.title)}"
                   loading="lazy" width="600" height="375">
            </div>
            <div class="card-body">
              <h3>${SF.escape(w.title)}</h3>
              <p>${SF.escape(w.artist)} · ${SF.escape(SF.collectionName(w.collection))}</p>
            </div>
          </a>`
          )
          .join("");
      })
      .catch(() => {
        newHost.innerHTML = `<p class="empty-state">Could not load wallpapers.</p>`;
      });
  }
})();
