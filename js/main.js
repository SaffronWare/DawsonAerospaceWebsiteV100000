/* =========================================================
   DAC — site behavior
   Photo-slot driven site. Every photo's URL (and, for sponsors,
   name/link) lives in a single shared manifest file committed
   to the repo at assets/photo-manifest.json — read by every
   visitor directly from raw.githubusercontent.com, and written
   only via the /api/upload serverless function from admin.html.
   This is what makes an uploaded photo visible to everyone, not
   just the browser that uploaded it.
   ========================================================= */

// Must match the repo api/upload.js writes to. If you point
// GITHUB_REPO at a different repo in Vercel, update this too.
const MANIFEST_REPO = { owner: "SaffronWare", repo: "DawsonAerospaceWebsiteV100000", branch: "main" };
const MANIFEST_PATH = "assets/photo-manifest.json";

const SLOT_REGISTRY = [
  {
    group: "Who We Are",
    slots: [
      { id: "who-we-are", label: "Team / shop photo", folder: "site" }
    ]
  },
  {
    group: "Avionics",
    slots: [
      { id: "avionics-current-1", label: "Current project — main photo", folder: "projects" },
      { id: "avionics-current-2", label: "Current project — photo 2", folder: "projects" },
      { id: "avionics-current-3", label: "Current project — photo 3", folder: "projects" },
      { id: "avionics-future-1", label: "Future project photo", folder: "projects" }
    ]
  },
  {
    group: "Formula FRC",
    slots: [
      { id: "formula-frc-current-1", label: "Current project — main photo", folder: "projects" },
      { id: "formula-frc-current-2", label: "Current project — photo 2", folder: "projects" },
      { id: "formula-frc-current-3", label: "Current project — photo 3", folder: "projects" },
      { id: "formula-frc-future-1", label: "Future project photo", folder: "projects" }
    ]
  },
  {
    group: "Rocketry",
    slots: [
      { id: "rocketry-current-1", label: "Current project — main photo", folder: "projects" },
      { id: "rocketry-current-2", label: "Current project — photo 2", folder: "projects" },
      { id: "rocketry-current-3", label: "Current project — photo 3", folder: "projects" },
      { id: "rocketry-future-1", label: "Future project photo", folder: "projects" }
    ]
  },
  {
    group: "Donate",
    slots: [
      { id: "donate", label: "Donate section photo", folder: "site" }
    ]
  },
  {
    group: "Partners",
    slots: [
      { id: "sponsor-1", label: "Sponsor 1", folder: "sponsors", sponsor: true },
      { id: "sponsor-2", label: "Sponsor 2", folder: "sponsors", sponsor: true },
      { id: "sponsor-3", label: "Sponsor 3", folder: "sponsors", sponsor: true },
      { id: "sponsor-4", label: "Sponsor 4", folder: "sponsors", sponsor: true }
    ]
  }
];

const DAC = (() => {
  const THEME_KEY = "dac_theme";
  let manifest = {};

  /* ---------- shared manifest (read: public, no auth needed) ---------- */
  async function fetchManifest() {
    const url = `https://raw.githubusercontent.com/${MANIFEST_REPO.owner}/${MANIFEST_REPO.repo}/${MANIFEST_REPO.branch}/${MANIFEST_PATH}?t=${Date.now()}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return {}; // manifest not created yet — every slot just renders empty
      return await res.json();
    } catch (e) {
      console.error("Could not load photo manifest", e);
      return {};
    }
  }

  function getSlotUrl(slotId) { return (manifest[slotId] && manifest[slotId].url) || ""; }
  function getSponsorMeta(slotId) {
    const entry = manifest[slotId] || {};
    return { name: entry.name || "", link: entry.link || "" };
  }

  /* ---------- writes: go through /api/upload (needs the token, server-side only) ---------- */
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function callPhotoApi(payload) {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Upload endpoint returned an unexpected response.");
    }
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function uploadSlotPhoto(slotId, file, folder) {
    const base64 = await readFileAsBase64(file);
    return callPhotoApi({ action: "upload", slotId, filename: file.name, base64, folder });
  }

  async function clearSlotPhoto(slotId) {
    return callPhotoApi({ action: "clear", slotId });
  }

  async function saveSponsorMeta(slotId, name, link) {
    return callPhotoApi({ action: "meta", slotId, name, link });
  }

  /* ---------- theme — defaults to light regardless of system preference ---------- */
  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const theme = stored === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem(THEME_KEY, next);
      });
    }
  }

  /* ---------- mobile nav ---------- */
  function initMobileNav() {
    const toggle = document.getElementById("nav-toggle");
    const menu = document.getElementById("mobile-nav");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => menu.classList.toggle("open"));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  function placeholderSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5.5-5.5L3 19"/></svg>`;
  }

  /* ---------- hero photo: assets/photo1.jpg or .png, added directly to the repo ---------- */
  function initHeroPhoto() {
    const wrap = document.getElementById("hero-photo");
    const img = document.getElementById("hero-img");
    if (!wrap || !img) return;
    let triedPng = false;
    img.addEventListener("error", () => {
      if (!triedPng) {
        triedPng = true;
        img.src = "assets/photo1.png";
      } else {
        wrap.innerHTML = `<div class="slot-empty">${placeholderSvg()}<span>Add assets/photo1.jpg or photo1.png to the repo</span></div>`;
      }
    });
    img.src = "assets/photo1.jpg";
  }

  /* ---------- render: fill every [data-photo-slot] element on the public site ---------- */
  function renderPhotoSlots() {
    document.querySelectorAll("[data-photo-slot]").forEach((el) => {
      const slotId = el.dataset.photoSlot;
      const url = getSlotUrl(slotId);
      const label = el.dataset.photoLabel || "Photo";
      if (url) {
        el.innerHTML = `<img src="${escapeAttr(url)}" alt="${escapeAttr(label)}" loading="lazy">`;
      } else {
        el.innerHTML = `<div class="slot-empty">${placeholderSvg()}<span>${escapeHtml(label)}</span></div>`;
      }
    });
  }

  /* ---------- render: sponsors (photo + name + optional link) ---------- */
  function renderSponsors() {
    document.querySelectorAll("[data-sponsor-slot]").forEach((wrapper) => {
      const slotId = wrapper.dataset.sponsorSlot;
      const meta = getSponsorMeta(slotId);
      const nameEl = wrapper.querySelector("[data-sponsor-name]");
      if (nameEl) {
        nameEl.textContent = meta.name || "";
        nameEl.style.display = meta.name ? "block" : "none";
      }
      if (meta.link) {
        wrapper.style.cursor = "pointer";
        wrapper.onclick = () => window.open(meta.link, "_blank", "noopener");
      } else {
        wrapper.style.cursor = "";
        wrapper.onclick = null;
      }
    });
  }

  /* ---------- division panel horizontal scroller (Projects section) ---------- */
  function initDivisionScroller() {
    const scroller = document.getElementById("division-scroller");
    if (!scroller) return;
    const panels = Array.from(scroller.querySelectorAll(".division-panel"));
    const dots = Array.from(document.querySelectorAll(".division-dot"));
    const prevBtn = document.getElementById("division-prev");
    const nextBtn = document.getElementById("division-next");

    function goTo(index) {
      const clamped = Math.max(0, Math.min(panels.length - 1, index));
      scroller.scrollTo({ left: clamped * scroller.clientWidth, behavior: "smooth" });
    }
    function currentIndex() { return Math.round(scroller.scrollLeft / scroller.clientWidth); }
    function updateDots() {
      const idx = currentIndex();
      dots.forEach((d, i) => d.classList.toggle("active", i === idx));
    }

    dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));
    if (prevBtn) prevBtn.addEventListener("click", () => goTo(currentIndex() - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(currentIndex() + 1));

    let scrollTimer;
    scroller.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(updateDots, 80);
    });
    updateDots();
  }

  /* ---------- admin: photo manager ---------- */
  function slotCardHtml(slot) {
    const meta = slot.sponsor ? getSponsorMeta(slot.id) : null;
    return `
      <div class="slot-card bracket" data-slot-card="${slot.id}">
        <div class="tick-tr"></div><div class="tick-bl"></div>
        <div class="slot-card-title">${escapeHtml(slot.label)}</div>
        <div class="photo-slot" data-photo-slot="${slot.id}" data-photo-label="${escapeAttr(slot.label)}"></div>
        ${slot.sponsor ? `
        <div class="sponsor-fields">
          <input type="text" placeholder="Sponsor name" data-sponsor-name-input value="${escapeAttr(meta.name)}">
          <input type="url" placeholder="https://sponsor-website.com" data-sponsor-link-input value="${escapeAttr(meta.link)}">
        </div>` : ""}
        <input type="file" accept="image/*" class="slot-card-file" data-slot-file>
        <div class="slot-card-actions">
          <button class="btn btn-primary btn-sm" data-slot-upload>Upload</button>
          <button class="btn btn-ghost btn-sm" data-slot-clear ${getSlotUrl(slot.id) ? "" : "disabled"}>Remove</button>
        </div>
        <div class="slot-card-status" data-slot-status></div>
      </div>`;
  }

  function renderAdminPhotoManager() {
    const root = document.getElementById("photo-manager");
    if (!root) return;

    root.innerHTML = SLOT_REGISTRY.map(
      (group) => `
      <div class="photo-manager-group">
        <div class="photo-manager-group-title">${escapeHtml(group.group)}</div>
        <div class="slot-manager-grid">
          ${group.slots.map(slotCardHtml).join("")}
        </div>
      </div>`
    ).join("");

    renderPhotoSlots(); // fill the just-created placeholders using the loaded manifest

    const allSlots = SLOT_REGISTRY.flatMap((g) => g.slots);
    allSlots.forEach((slot) => {
      const card = root.querySelector(`[data-slot-card="${slot.id}"]`);
      if (!card) return;

      const fileInput = card.querySelector("[data-slot-file]");
      const uploadBtn = card.querySelector("[data-slot-upload]");
      const clearBtn = card.querySelector("[data-slot-clear]");
      const statusEl = card.querySelector("[data-slot-status]");
      const nameInput = card.querySelector("[data-sponsor-name-input]");
      const linkInput = card.querySelector("[data-sponsor-link-input]");

      function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.className = "slot-card-status" + (kind ? " " + kind : "");
      }

      if (slot.sponsor && (nameInput || linkInput)) {
        const saveMeta = async () => {
          setStatus("Saving…");
          try {
            await saveSponsorMeta(slot.id, nameInput ? nameInput.value.trim() : "", linkInput ? linkInput.value.trim() : "");
            manifest = await fetchManifest();
            renderSponsors();
            setStatus("Saved.", "ok");
          } catch (err) {
            setStatus(`Failed: ${err.message}`, "warn");
          }
        };
        if (nameInput) nameInput.addEventListener("change", saveMeta);
        if (linkInput) linkInput.addEventListener("change", saveMeta);
      }

      uploadBtn.addEventListener("click", async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
          setStatus("Choose a file first.", "warn");
          return;
        }
        uploadBtn.disabled = true;
        setStatus(`Uploading ${file.name}…`);
        try {
          await uploadSlotPhoto(slot.id, file, slot.folder);
          manifest = await fetchManifest();
          renderPhotoSlots();
          renderSponsors();
          clearBtn.disabled = false;
          setStatus("Uploaded — visible to everyone now.", "ok");
          fileInput.value = "";
        } catch (err) {
          setStatus(`Failed: ${err.message}`, "warn");
        } finally {
          uploadBtn.disabled = false;
        }
      });

      clearBtn.addEventListener("click", async () => {
        clearBtn.disabled = true;
        setStatus("Removing…");
        try {
          await clearSlotPhoto(slot.id);
          manifest = await fetchManifest();
          renderPhotoSlots();
          renderSponsors();
          setStatus("Removed for everyone.", "ok");
        } catch (err) {
          setStatus(`Failed: ${err.message}`, "warn");
          clearBtn.disabled = false;
        }
      });
    });
  }

  /* ---------- init ---------- */
  async function init() {
    initTheme();
    initMobileNav();
    initHeroPhoto();
    initDivisionScroller();

    manifest = await fetchManifest();
    renderPhotoSlots();
    renderSponsors();
    renderAdminPhotoManager();

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", DAC.init);
