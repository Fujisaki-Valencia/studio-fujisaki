/* Gallery page: every wallpaper, newest first. */
(function () {
  "use strict";
  SF.setMeta({
    title: "All wallpapers",
    description: "Every free Japandi wallpaper from Studio Fujisaki, newest first.",
    path: "gallery.html",
  });

  const grid = document.querySelector("[data-gallery-grid]");
  const count = document.querySelector("[data-gallery-count]");
  if (!grid) return;

  SF.loadWallpapers()
    .then((items) => {
      const all = items.slice().reverse(); // newest first
      if (count) {
        count.textContent = all.length
          ? `${all.length} wallpaper${all.length === 1 ? "" : "s"}`
          : "";
      }
      if (!all.length) {
        grid.className = "";
        grid.innerHTML = `<p class="empty-state">No wallpapers yet.</p>`;
        return;
      }
      grid.className = "card-grid";
      grid.innerHTML = all
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
      grid.innerHTML = `<p class="empty-state">Could not load wallpapers.</p>`;
    });
})();
