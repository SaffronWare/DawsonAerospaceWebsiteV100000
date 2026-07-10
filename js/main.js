/* =========================================================
   DAC — site behavior
   ========================================================= */

const DAC = (() => {
  const STORAGE_KEY = "dac_projects";
  const SPONSOR_KEY = "dac_sponsors";
  const THEME_KEY = "dac_theme";

  /* ---------- data: projects ---------- */
  function getUserProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Could not read stored projects", e);
      return [];
    }
  }

  function saveUserProjects(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function getAllProjects() {
    const seed = typeof DAC_SEED_PROJECTS !== "undefined" ? DAC_SEED_PROJECTS : [];
    return [...seed, ...getUserProjects()];
  }

  /* ---------- data: sponsors ---------- */
  function getUserSponsors() {
    try {
      const raw = localStorage.getItem(SPONSOR_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Could not read stored sponsors", e);
      return [];
    }
  }

  function saveUserSponsors(list) {
    localStorage.setItem(SPONSOR_KEY, JSON.stringify(list));
  }

  function slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function uid() {
    return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- image upload → GitHub (via /api/upload serverless function) ---------- */
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadImageToGitHub(file, folder) {
    const base64 = await readFileAsBase64(file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, base64, folder })
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Upload endpoint returned an unexpected response.");
    }
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  /* ---------- theme ---------- */
  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
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
    toggle.addEventListener("click", () => {
      menu.classList.toggle("open");
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => menu.classList.remove("open"))
    );
  }

  /* ---------- badges ---------- */
  function statusBadgeClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "active") return "badge-status-active";
    if (s === "planned") return "badge-status-planned";
    return "badge-status-complete";
  }

  function projectCardHtml(p) {
    const img = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.parentElement.innerHTML=this.parentElement.dataset.fallback">`
      : placeholderMediaHtml();
    return `
      <article class="bracket project-card" data-division="${escapeAttr(p.division)}">
        <div class="project-media" data-fallback='${placeholderMediaHtml()}'>${img}</div>
        <div class="project-body">
          <div class="project-badges">
            <span class="badge badge-division">${escapeHtml(p.division)}</span>
            <span class="badge ${statusBadgeClass(p.status)}">${escapeHtml(p.status)}</span>
          </div>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description)}</p>
          <div class="tag-row">${(p.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
        </div>
      </article>`;
  }

  function placeholderMediaHtml() {
    return `<div class="ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5.5-5.5L3 19"/></svg></div>`;
  }

  function roadmapItemHtml(p) {
    const eta = p.eta || formatQuarter(p.createdAt);
    return `
      <div class="roadmap-item" data-division="${escapeAttr(p.division)}">
        <div class="roadmap-eta">${escapeHtml(eta)}</div>
        <div class="roadmap-info">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description)}</p>
        </div>
        <div class="roadmap-tags">
          <span class="badge badge-division">${escapeHtml(p.division)}</span>
          ${(p.tags || []).slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>`;
  }

  function formatQuarter(iso) {
    if (!iso) return "TBD";
    const d = new Date(iso);
    if (isNaN(d)) return "TBD";
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${d.getFullYear()}`;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  /* ---------- render: current projects ---------- */
  function renderProjectGrid() {
    const grid = document.getElementById("project-grid");
    if (!grid) return;
    const all = getAllProjects().filter((p) => p.category === "current");
    const filterBar = document.getElementById("project-filters");
    let active = "All";

    function draw() {
      const filtered = active === "All" ? all : all.filter((p) => p.division === active);
      grid.innerHTML = filtered.length
        ? filtered.map(projectCardHtml).join("")
        : `<div class="project-empty">No current projects filed under ${escapeHtml(active)} yet.</div>`;
    }

    if (filterBar) {
      filterBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter-btn");
        if (!btn) return;
        active = btn.dataset.filter;
        filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
        draw();
      });
    }

    draw();

    // allow division cards to deep-link into a filtered view
    document.querySelectorAll("[data-scroll-filter]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const division = el.dataset.scrollFilter;
        active = division;
        if (filterBar) {
          filterBar.querySelectorAll(".filter-btn").forEach((b) =>
            b.classList.toggle("active", b.dataset.filter === division)
          );
        }
        draw();
        document.getElementById("projects").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ---------- render: future projects (roadmap) ---------- */
  function renderRoadmap() {
    const list = document.getElementById("roadmap");
    if (!list) return;
    const all = getAllProjects()
      .filter((p) => p.category === "future")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    list.innerHTML = all.length
      ? all.map(roadmapItemHtml).join("")
      : `<div class="admin-empty">No future projects have been filed yet.</div>`;
  }

  /* ---------- division example lists (pulled live from project data) ---------- */
  function renderDivisionExamples() {
    document.querySelectorAll("[data-division-examples]").forEach((el) => {
      const division = el.dataset.divisionExamples;
      const items = getAllProjects()
        .filter((p) => p.division === division)
        .slice(0, 3);
      if (!items.length) {
        el.innerHTML = `<li>Kickoff projects being scoped for this term.</li>`;
        return;
      }
      el.innerHTML = items.map((p) => `<li>${escapeHtml(p.title)}</li>`).join("");
    });
  }

  /* ---------- admin: form ---------- */
  function initAdminForm() {
    const form = document.getElementById("project-form");
    if (!form) return;

    const titleInput = form.querySelector("[name=title]");
    const slugInput = form.querySelector("[name=slug]");
    let slugTouched = false;
    slugInput.addEventListener("input", () => (slugTouched = true));
    titleInput.addEventListener("input", () => {
      if (!slugTouched) slugInput.value = slugify(titleInput.value);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const submitBtn = form.querySelector("button[type=submit]");
      const fileInput = form.querySelector("[name=imageFile]");
      const file = fileInput && fileInput.files && fileInput.files[0];

      let imageUrl = (fd.get("imageUrl") || "").trim();

      if (file) {
        submitBtn.disabled = true;
        showNotice(`Uploading ${file.name} to GitHub…`, "");
        try {
          imageUrl = await uploadImageToGitHub(file, "projects");
        } catch (err) {
          showNotice(`Image upload failed: ${err.message}`, "warn");
          submitBtn.disabled = false;
          return;
        }
      }

      const now = new Date().toISOString();
      const project = {
        id: uid(),
        title: fd.get("title").trim(),
        slug: (fd.get("slug") || slugify(fd.get("title"))).trim(),
        description: fd.get("description").trim(),
        longDescription: (fd.get("longDescription") || "").trim(),
        imageUrl,
        gallery: (fd.get("gallery") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: fd.get("status"),
        tags: (fd.get("tags") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        category: fd.get("category"),
        division: fd.get("division"),
        createdAt: now,
        updatedAt: now
      };

      if (!project.division) {
        showNotice("Division is required.", "warn");
        submitBtn.disabled = false;
        return;
      }

      const list = getUserProjects();
      list.push(project);
      saveUserProjects(list);
      form.reset();
      slugTouched = false;
      submitBtn.disabled = false;
      showNotice(`"${project.title}" was added to ${project.division}.`, "ok");
      renderAdminList();
    });
  }

  function showNotice(text, kind, targetId) {
    const el = document.getElementById(targetId || "admin-notice");
    if (!el) return;
    el.textContent = text;
    el.className = "notice" + (kind ? " " + kind : "");
    el.style.display = "block";
  }

  /* ---------- admin: list + delete ---------- */
  function renderAdminList() {
    const list = document.getElementById("admin-list");
    if (!list) return;
    const items = getUserProjects();
    if (!items.length) {
      list.innerHTML = `<div class="admin-empty">No admin-added projects yet. Projects you add above will appear here, and on the public site, in this browser.</div>`;
      return;
    }
    list.innerHTML = items
      .slice()
      .reverse()
      .map(
        (p) => `
      <div class="admin-row">
        <div>
          <div class="admin-row-title">${escapeHtml(p.title)}</div>
          <div class="admin-row-meta">${escapeHtml(p.division)} · ${escapeHtml(p.category)} · ${escapeHtml(p.status)}</div>
        </div>
        <div class="admin-row-actions">
          <button class="icon-btn" data-delete="${p.id}" title="Delete project" aria-label="Delete project">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13"/></svg>
          </button>
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.delete;
        const next = getUserProjects().filter((p) => p.id !== id);
        saveUserProjects(next);
        renderAdminList();
      });
    });
  }

  /* ---------- admin: sponsors ---------- */
  function initSponsorForm() {
    const form = document.getElementById("sponsor-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const submitBtn = form.querySelector("button[type=submit]");
      const fileInput = form.querySelector("[name=logoFile]");
      const file = fileInput && fileInput.files && fileInput.files[0];

      if (!file) {
        showNotice("A logo file is required.", "warn", "sponsor-notice");
        return;
      }

      submitBtn.disabled = true;
      showNotice(`Uploading ${file.name} to GitHub…`, "", "sponsor-notice");
      let logoUrl;
      try {
        logoUrl = await uploadImageToGitHub(file, "sponsors");
      } catch (err) {
        showNotice(`Logo upload failed: ${err.message}`, "warn", "sponsor-notice");
        submitBtn.disabled = false;
        return;
      }

      const sponsor = {
        id: uid(),
        name: fd.get("name").trim(),
        tier: fd.get("tier"),
        link: (fd.get("link") || "").trim(),
        logoUrl,
        createdAt: new Date().toISOString()
      };

      const list = getUserSponsors();
      list.push(sponsor);
      saveUserSponsors(list);
      form.reset();
      submitBtn.disabled = false;
      showNotice(`"${sponsor.name}" was added to ${sponsor.tier}.`, "ok", "sponsor-notice");
      renderSponsorAdminList();
    });
  }

  function renderSponsorAdminList() {
    const list = document.getElementById("sponsor-list");
    if (!list) return;
    const items = getUserSponsors();
    if (!items.length) {
      list.innerHTML = `<div class="admin-empty">No sponsors added yet. Sponsors you add above will appear here and on the public Partners section.</div>`;
      return;
    }
    list.innerHTML = items
      .slice()
      .reverse()
      .map(
        (s) => `
      <div class="admin-row">
        <div>
          <div class="admin-row-title">${escapeHtml(s.name)}</div>
          <div class="admin-row-meta">${escapeHtml(s.tier)}</div>
        </div>
        <div class="admin-row-actions">
          <button class="icon-btn" data-delete-sponsor="${s.id}" title="Delete sponsor" aria-label="Delete sponsor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13"/></svg>
          </button>
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-delete-sponsor]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteSponsor;
        const next = getUserSponsors().filter((s) => s.id !== id);
        saveUserSponsors(next);
        renderSponsorAdminList();
      });
    });
  }

  /* ---------- render: partners (public site) ---------- */
  function renderPartners() {
    const grids = document.querySelectorAll("[data-tier]");
    if (!grids.length) return;
    const sponsors = getUserSponsors();

    grids.forEach((grid) => {
      const tier = grid.dataset.tier;
      const items = sponsors.filter((s) => s.tier === tier);
      if (!items.length) return; // keep the static placeholder slots already in the HTML
      grid.innerHTML = items
        .map((s) => {
          const inner = `<img src="${escapeAttr(s.logoUrl)}" alt="${escapeAttr(s.name)}" loading="lazy">`;
          return s.link
            ? `<a class="partner-slot partner-slot-logo" href="${escapeAttr(s.link)}" target="_blank" rel="noopener">${inner}</a>`
            : `<div class="partner-slot partner-slot-logo">${inner}</div>`;
        })
        .join("");
    });
  }

  /* ---------- init ---------- */
  function init() {
    initTheme();
    initMobileNav();
    renderDivisionExamples();
    renderProjectGrid();
    renderRoadmap();
    renderPartners();
    initAdminForm();
    renderAdminList();
    initSponsorForm();
    renderSponsorAdminList();

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  return { init, getAllProjects };
})();

document.addEventListener("DOMContentLoaded", DAC.init);
