/* Home page: every wallpaper (newest first), revealed as you scroll.
   A device toolbar swaps every card's image to the matching mockup. */
(function () {
  "use strict";
  const BATCH = 9; // how many cards to add per reveal

  SF.setMeta({ path: "index.html" });

  const grid = document.querySelector("[data-grid]");
  const sentinel = document.querySelector("[data-sentinel]");
  const status = document.querySelector("[data-status]");
  const barHost = document.querySelector("[data-devicebar]");
  if (!grid) return;

  let currentDevice = "artwork";

  function cardHTML(w) {
    const m = w.mockups || {};
    // Each device source rides on the <img> as a data-* attribute; the toolbar
    // just swaps src between them, no refetch of the data needed.
    const dataAttrs = SF.DEVICES.filter((d) => d.key !== "artwork" && m[d.key])
      .map((d) => `data-${d.key}="${SF.escape(m[d.key])}"`)
      .join(" ");
    const initial = currentDevice !== "artwork" && m[currentDevice] ? m[currentDevice] : w.thumb;
    return `
      <a class="card" href="${SF.escape(w.page || "wallpaper.html?slug=" + encodeURIComponent(w.slug))}">
        <div class="thumb-wrap">
          <img src="${SF.escape(initial)}" alt="${SF.escape(w.title)}"
               loading="lazy" width="600" height="375"
               data-thumb="${SF.escape(w.thumb)}" ${dataAttrs}>
        </div>
        <div class="card-body">
          <h3>${SF.escape(w.title)}</h3>
          <p>${SF.escape(w.artist || "")}</p>
        </div>
      </a>`;
  }

  function applyDevice(device) {
    currentDevice = device;
    if (device === "artwork") grid.removeAttribute("data-mode");
    else grid.setAttribute("data-mode", device);
    grid.querySelectorAll(".card img").forEach((img) => {
      const src =
        device === "artwork" ? img.dataset.thumb : img.dataset[device] || img.dataset.thumb;
      if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    });
  }

  SF.loadWallpapers()
    .then((items) => {
      // Newest first, by `date` (stable; undated entries sink to the bottom).
      const all = items
        .slice()
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      if (!all.length) {
        grid.innerHTML = `<p class="empty-state">No wallpapers yet.</p>`;
        return;
      }

      // Only show the toolbar if at least one wallpaper actually has mockups.
      if (barHost && all.some((w) => w.mockups && Object.keys(w.mockups).length)) {
        barHost.innerHTML = SF.deviceBar();
        SF.wireDeviceBar(barHost.querySelector(".device-bar"), applyDevice);
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

      let io = null;
      if ("IntersectionObserver" in window && sentinel) {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) renderNext();
          },
          { rootMargin: "600px 0px" }
        );
        renderNext();
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
