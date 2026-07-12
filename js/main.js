/* =========================================================
   DAC — site behavior
   ========================================================= */

const DAC = (() => {
  const STORAGE_KEY = "dac_projects";
  const SPONSOR_KEY = "dac_sponsors";
  const HISTORY_KEY = "dac_history";
  const THEME_KEY = "dac_theme";
  const HISTORY_LIMIT = 300;

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

  function addProject(project) {
    const list = getUserProjects();
    list.push(project);
    saveUserProjects(list);
    logHistory({ action: "created", entityType: "project", title: project.title, before: null, after: project });
  }

  function updateProject(id, fields) {
    const list = getUserProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const before = list[idx];
    const after = { ...before, ...fields, id: before.id, createdAt: before.createdAt, updatedAt: new Date().toISOString() };
    list[idx] = after;
    saveUserProjects(list);
    logHistory({ action: "updated", entityType: "project", title: after.title, before, after });
    return after;
  }

  function deleteProject(id) {
    const list = getUserProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [removed] = list.splice(idx, 1);
    saveUserProjects(list);
    logHistory({ action: "deleted", entityType: "project", title: removed.title, before: removed, after: null });
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

  function addSponsor(sponsor) {
    const list = getUserSponsors();
    list.push(sponsor);
    saveUserSponsors(list);
    logHistory({ action: "created", entityType: "sponsor", title: sponsor.name, before: null, after: sponsor });
  }

  function updateSponsor(id, fields) {
    const list = getUserSponsors();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const before = list[idx];
    const after = { ...before, ...fields, id: before.id, createdAt: before.createdAt, updatedAt: new Date().toISOString() };
    list[idx] = after;
    saveUserSponsors(list);
    logHistory({ action: "updated", entityType: "sponsor", title: after.name, before, after });
    return after;
  }

  function deleteSponsor(id) {
    const list = getUserSponsors();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const [removed] = list.splice(idx, 1);
    saveUserSponsors(list);
    logHistory({ action: "deleted", entityType: "sponsor", title: removed.name, before: removed, after: null });
  }

  /* ---------- data: history (preserved even after deletes) ---------- */
  function getHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Could not read history", e);
      return [];
    }
  }

  function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  function logHistory(entry) {
    const list = getHistory();
    list.push({
      id: uid(),
      timestamp: new Date().toISOString(),
      ...entry
    });
    // keep the log from growing forever, but keep plenty of history
    while (list.length > HISTORY_LIMIT) list.shift();
    saveHistory(list);
  }

  function restoreFromHistory(historyId) {
    const history = getHistory();
    const entry = history.find((h) => h.id === historyId);
    if (!entry || entry.action !== "deleted" || !entry.before) return;

    if (entry.entityType === "project") {
      const list = getUserProjects();
      list.push(entry.before);
      saveUserProjects(list);
      logHistory({ action: "restored", entityType: "project", title: entry.before.title, before: null, after: entry.before });
    } else if (entry.entityType === "sponsor") {
      const list = getUserSponsors();
      list.push(entry.before);
      saveUserSponsors(list);
      logHistory({ action: "restored", entityType: "sponsor", title: entry.before.name, before: null, after: entry.before });
    }
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

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

  /* ---------- admin: project form (create + edit) ---------- */
  let editingProjectId = null;

  function initAdminForm() {
    const form = document.getElementById("project-form");
    if (!form) return;

    const titleInput = form.querySelector("[name=title]");
    const slugInput = form.querySelector("[name=slug]");
    const submitBtn = form.querySelector("button[type=submit]");
    const cancelBtn = document.getElementById("project-cancel-edit");
    let slugTouched = false;
    slugInput.addEventListener("input", () => (slugTouched = true));
    titleInput.addEventListener("input", () => {
      if (!slugTouched) slugInput.value = slugify(titleInput.value);
    });

    function enterEditMode(project) {
      editingProjectId = project.id;
      form.querySelector("[name=title]").value = project.title;
      form.querySelector("[name=slug]").value = project.slug;
      slugTouched = true;
      form.querySelector("[name=description]").value = project.description;
      form.querySelector("[name=longDescription]").value = project.longDescription || "";
      form.querySelector("[name=division]").value = project.division;
      form.querySelector("[name=category]").value = project.category;
      form.querySelector("[name=status]").value = project.status;
      form.querySelector("[name=tags]").value = (project.tags || []).join(", ");
      form.querySelector("[name=imageUrl]").value = project.imageUrl || "";
      form.querySelector("[name=gallery]").value = (project.gallery || []).join(", ");
      submitBtn.textContent = "Save Changes";
      if (cancelBtn) cancelBtn.style.display = "inline-flex";
      showNotice(`Editing "${project.title}" — make your changes and Save.`, "");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function exitEditMode() {
      editingProjectId = null;
      slugTouched = false;
      form.reset();
      submitBtn.textContent = "Add Project";
      if (cancelBtn) cancelBtn.style.display = "none";
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        exitEditMode();
        showNotice("Edit cancelled.", "");
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
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

      const division = fd.get("division");
      if (!division) {
        showNotice("Division is required.", "warn");
        submitBtn.disabled = false;
        return;
      }

      const fields = {
        title: fd.get("title").trim(),
        slug: (fd.get("slug") || slugify(fd.get("title"))).trim(),
        description: fd.get("description").trim(),
        longDescription: (fd.get("longDescription") || "").trim(),
        imageUrl,
        gallery: (fd.get("gallery") || "").split(",").map((s) => s.trim()).filter(Boolean),
        status: fd.get("status"),
        tags: (fd.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
        category: fd.get("category"),
        division
      };

      if (editingProjectId) {
        const updated = updateProject(editingProjectId, fields);
        submitBtn.disabled = false;
        exitEditMode();
        showNotice(`"${updated.title}" was updated.`, "ok");
      } else {
        const now = new Date().toISOString();
        const project = { id: uid(), ...fields, createdAt: now, updatedAt: now };
        addProject(project);
        submitBtn.disabled = false;
        exitEditMode();
        showNotice(`"${project.title}" was added to ${project.division}.`, "ok");
      }

      renderAdminLists();
      renderHistoryList();
    });

    window.__dacEditProject = (id) => {
      const project = getUserProjects().find((p) => p.id === id);
      if (project) enterEditMode(project);
    };
  }

  function showNotice(text, kind, targetId) {
    const el = document.getElementById(targetId || "admin-notice");
    if (!el) return;
    el.textContent = text;
    el.className = "notice" + (kind ? " " + kind : "");
    el.style.display = "block";
  }

  /* ---------- admin: project lists (current + future), with edit + delete ---------- */
  function adminProjectRowHtml(p) {
    return `
      <div class="admin-row">
        <div>
          <div class="admin-row-title">${escapeHtml(p.title)}</div>
          <div class="admin-row-meta">${escapeHtml(p.division)} · ${escapeHtml(p.category)} · ${escapeHtml(p.status)}</div>
        </div>
        <div class="admin-row-actions">
          <button class="icon-btn" data-edit="${p.id}" title="Edit project" aria-label="Edit project">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20h4L18.5 9.5a2 2 0 000-2.8l-1.2-1.2a2 2 0 00-2.8 0L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
          </button>
          <button class="icon-btn" data-delete="${p.id}" title="Delete project" aria-label="Delete project">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13"/></svg>
          </button>
        </div>
      </div>`;
  }

  function renderAdminLists() {
    const currentList = document.getElementById("admin-list-current");
    const futureList = document.getElementById("admin-list-future");
    if (!currentList && !futureList) return;

    const items = getUserProjects();
    const current = items.filter((p) => p.category === "current");
    const future = items.filter((p) => p.category === "future");

    if (currentList) {
      currentList.innerHTML = current.length
        ? current.slice().reverse().map(adminProjectRowHtml).join("")
        : `<div class="admin-empty">No admin-added current projects yet.</div>`;
    }
    if (futureList) {
      futureList.innerHTML = future.length
        ? future.slice().reverse().map(adminProjectRowHtml).join("")
        : `<div class="admin-empty">No admin-added future/queued projects yet.</div>`;
    }

    document.querySelectorAll("#admin-list-current [data-edit], #admin-list-future [data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => window.__dacEditProject && window.__dacEditProject(btn.dataset.edit));
    });
    document.querySelectorAll("#admin-list-current [data-delete], #admin-list-future [data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const project = getUserProjects().find((p) => p.id === btn.dataset.delete);
        if (!project) return;
        if (!confirm(`Delete "${project.title}"? It stays recoverable in the change history below.`)) return;
        deleteProject(project.id);
        renderAdminLists();
        renderHistoryList();
      });
    });
  }

  // kept for compatibility with any external references
  function renderAdminList() { renderAdminLists(); }

  /* ---------- admin: sponsors (create + edit + delete) ---------- */
  let editingSponsorId = null;

  function initSponsorForm() {
    const form = document.getElementById("sponsor-form");
    if (!form) return;

    const submitBtn = form.querySelector("button[type=submit]");
    const cancelBtn = document.getElementById("sponsor-cancel-edit");
    const logoInput = form.querySelector("[name=logoFile]");

    function enterEditMode(sponsor) {
      editingSponsorId = sponsor.id;
      form.querySelector("[name=name]").value = sponsor.name;
      form.querySelector("[name=tier]").value = sponsor.tier;
      form.querySelector("[name=link]").value = sponsor.link || "";
      logoInput.required = false;
      submitBtn.textContent = "Save Changes";
      if (cancelBtn) cancelBtn.style.display = "inline-flex";
      showNotice(`Editing "${sponsor.name}" — attach a new logo only if you want to replace it.`, "", "sponsor-notice");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function exitEditMode() {
      editingSponsorId = null;
      form.reset();
      logoInput.required = true;
      submitBtn.textContent = "Add Sponsor";
      if (cancelBtn) cancelBtn.style.display = "none";
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        exitEditMode();
        showNotice("Edit cancelled.", "", "sponsor-notice");
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const file = logoInput && logoInput.files && logoInput.files[0];

      if (!file && !editingSponsorId) {
        showNotice("A logo file is required.", "warn", "sponsor-notice");
        return;
      }

      let logoUrl = null;
      if (file) {
        submitBtn.disabled = true;
        showNotice(`Uploading ${file.name} to GitHub…`, "", "sponsor-notice");
        try {
          logoUrl = await uploadImageToGitHub(file, "sponsors");
        } catch (err) {
          showNotice(`Logo upload failed: ${err.message}`, "warn", "sponsor-notice");
          submitBtn.disabled = false;
          return;
        }
      }

      const fields = {
        name: fd.get("name").trim(),
        tier: fd.get("tier"),
        link: (fd.get("link") || "").trim()
      };
      if (logoUrl) fields.logoUrl = logoUrl;

      if (editingSponsorId) {
        const updated = updateSponsor(editingSponsorId, fields);
        submitBtn.disabled = false;
        exitEditMode();
        showNotice(`"${updated.name}" was updated.`, "ok", "sponsor-notice");
      } else {
        const sponsor = { id: uid(), ...fields, logoUrl, createdAt: new Date().toISOString() };
        addSponsor(sponsor);
        submitBtn.disabled = false;
        exitEditMode();
        showNotice(`"${sponsor.name}" was added to ${sponsor.tier}.`, "ok", "sponsor-notice");
      }

      renderSponsorAdminList();
      renderPartners();
      renderHistoryList();
    });

    window.__dacEditSponsor = (id) => {
      const sponsor = getUserSponsors().find((s) => s.id === id);
      if (sponsor) enterEditMode(sponsor);
    };
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
          <button class="icon-btn" data-edit-sponsor="${s.id}" title="Edit sponsor" aria-label="Edit sponsor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20h4L18.5 9.5a2 2 0 000-2.8l-1.2-1.2a2 2 0 00-2.8 0L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
          </button>
          <button class="icon-btn" data-delete-sponsor="${s.id}" title="Delete sponsor" aria-label="Delete sponsor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13"/></svg>
          </button>
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-edit-sponsor]").forEach((btn) => {
      btn.addEventListener("click", () => window.__dacEditSponsor && window.__dacEditSponsor(btn.dataset.editSponsor));
    });
    list.querySelectorAll("[data-delete-sponsor]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sponsor = getUserSponsors().find((s) => s.id === btn.dataset.deleteSponsor);
        if (!sponsor) return;
        if (!confirm(`Delete "${sponsor.name}"? It stays recoverable in the change history below.`)) return;
        deleteSponsor(sponsor.id);
        renderSponsorAdminList();
        renderPartners();
        renderHistoryList();
      });
    });
  }

  /* ---------- admin: change history (create/update/delete, with restore) ---------- */
  function historyRowHtml(entry) {
    const actionLabel = {
      created: "Added",
      updated: "Edited",
      deleted: "Deleted",
      restored: "Restored"
    }[entry.action] || entry.action;

    const canRestore = entry.action === "deleted";

    return `
      <div class="admin-row">
        <div>
          <div class="admin-row-title">${actionLabel} — ${escapeHtml(entry.title)}</div>
          <div class="admin-row-meta">${escapeHtml(entry.entityType)} · ${escapeHtml(formatDateTime(entry.timestamp))}</div>
        </div>
        <div class="admin-row-actions">
          ${canRestore ? `<button class="icon-btn" data-restore="${entry.id}" title="Restore" aria-label="Restore">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9a8 8 0 1114 6.5M4 9V4m0 5h5"/></svg>
          </button>` : ""}
        </div>
      </div>`;
  }

  function renderHistoryList() {
    const list = document.getElementById("history-list");
    if (!list) return;
    const items = getHistory().slice().reverse();
    if (!items.length) {
      list.innerHTML = `<div class="admin-empty">No changes yet. Every add, edit, and delete you make will be logged here — deletions can be restored from this list.</div>`;
      return;
    }
    list.innerHTML = items.map(historyRowHtml).join("");

    list.querySelectorAll("[data-restore]").forEach((btn) => {
      btn.addEventListener("click", () => {
        restoreFromHistory(btn.dataset.restore);
        renderAdminLists();
        renderSponsorAdminList();
        renderPartners();
        renderHistoryList();
      });
    });
  }

  /* ---------- render: partners (public site) ---------- */
  function renderPartners() {
    const grid = document.querySelector('[data-tier="any"]');
    if (!grid) return;
    const sponsors = getUserSponsors();
    if (!sponsors.length) return; // keep the static placeholder slots already in the HTML

    grid.innerHTML = sponsors
      .map((s) => {
        const inner = `<img src="${escapeAttr(s.logoUrl)}" alt="${escapeAttr(s.name)}" loading="lazy">`;
        return s.link
          ? `<a class="partner-slot partner-slot-logo" href="${escapeAttr(s.link)}" target="_blank" rel="noopener" title="${escapeAttr(s.name)}">${inner}</a>`
          : `<div class="partner-slot partner-slot-logo" title="${escapeAttr(s.name)}">${inner}</div>`;
      })
      .join("");
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
    renderAdminLists();
    initSponsorForm();
    renderSponsorAdminList();
    renderHistoryList();

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  return { init, getAllProjects };
})();

document.addEventListener("DOMContentLoaded", DAC.init);
