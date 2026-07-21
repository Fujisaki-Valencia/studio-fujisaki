/* Home page: every wallpaper (newest first), revealed as you scroll. */
(function () {
  "use strict";
  const BATCH = 9; // how many cards to add per reveal

  SF.setMeta({ path: "index.html" });

  const grid = document.querySelector("[data-grid]");
  const sentinel = document.querySelector("[data-sentinel]");
  const status = document.querySelector("[data-status]");
  if (!grid) return;

  function cardHTML(w) {
    return `
      <a class="card" href="wallpaper.html?slug=${encodeURIComponent(w.slug)}">
        <div class="thumb-wrap">
          <img src="${SF.escape(w.thumb)}" alt="${SF.escape(w.title)}"
               loading="lazy" width="600" height="375">
        </div>
        <div class="card-body">
          <h3>${SF.escape(w.title)}</h3>
          <p>${SF.escape(w.artist || "")}</p>
        </div>
      </a>`;
  }

  SF.loadWallpapers()
    .then((items) => {
      const all = items.slice().reverse(); // newest first
      if (!all.length) {
        grid.innerHTML = `<p class="empty-state">No wallpapers yet.</p>`;
        return;
      }

      let shown = 0;
      function renderNext() {
        const next = all.slice(shown, shown + BATCH);
        grid.insertAdjacentHTML("beforeend", next.map(cardHTML).join(""));
        shown += next.length;
        if (shown >= all.length && io) {
          io.disconnect();
          if (status) {
            status.hidden = false;
            status.textContent = `${all.length} wallpaper${all.length === 1 ? "" : "s"}`;
          }
        }
      }

      // Progressive reveal via IntersectionObserver; falls back to showing all.
      let io = null;
      if ("IntersectionObserver" in window && sentinel) {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) renderNext();
          },
          { rootMargin: "600px 0px" } // start loading before the sentinel is visible
        );
        renderNext(); // first batch
        io.observe(sentinel);
      } else {
        grid.insertAdjacentHTML("beforeend", all.map(cardHTML).join(""));
        shown = all.length;
      }
    })
    .catch(() => {
      grid.innerHTML = `<p class="empty-state">Could not load wallpapers.</p>`;
    });
})();
