# DAC — Dawson Aerospace Club website

Static site, no build step. Open `index.html` directly, or serve the folder
with any static host (GitHub Pages, Netlify, Vercel, S3, etc.).

## Structure

```
index.html          Main site (hero, Who We Are, Divisions, Projects, Partners, Donate, Contact)
admin.html           "Add Project" and "Add Sponsor" forms for team members
css/styles.css        All styles — light + dark theme via CSS variables
js/projects-data.js   Seed project data (matches the required schema)
js/main.js            Theme toggle, nav, filtering, admin logic, GitHub upload calls
api/upload.js          Vercel serverless function — commits uploaded images to this repo
assets/logo.png         Club logo
```

## Image uploads (project images + sponsor logos)

The admin page lets you attach a file for a project image or sponsor logo.
On submit, the browser sends it to `/api/upload`, a Vercel serverless
function that commits the file into this repo via the GitHub Contents API
and returns a real, permanent URL — so images are shared with everyone,
not stuck in one browser.

This **only works once deployed on Vercel** (or another host that runs
`/api` as a serverless function) — opening `admin.html` directly from
disk, or hosting on a plain static host like GitHub Pages, won't have
anywhere to send the upload request.

### Required environment variables (set in Vercel, not in code)

| Variable        | Value                                                   |
|------------------|------------------------------------------------------------|
| `gurt`           | A GitHub personal access token, scoped to just this repo, with **Contents: Read and write** permission |
| `GITHUB_REPO`    | Optional — the repo defaults to `https://github.com/SaffronWare/DawsonAerospaceWebsiteV100000.git` in `api/upload.js`. Only set this if you want to point uploads at a different repo. |
| `GITHUB_BRANCH`  | Optional, defaults to `main`                              |

`gurt` is the only variable you actually need to set. Set it under Vercel
→ Project → Settings → Environment Variables. Never put the token in any
committed file — it's read server-side only, inside `api/upload.js`, via
`process.env.gurt`.

Uploaded files land in `assets/uploads/projects/` or
`assets/uploads/sponsors/` in the repo and are served from
`raw.githubusercontent.com`.

## Project schema

Every project (seed or admin-added) follows:

```json
{
  "id": "uuid-or-stable-id",
  "title": "RC Plane",
  "slug": "rc-plane",
  "description": "Short description.",
  "longDescription": "Optional longer project description.",
  "imageUrl": "assets/uploads/projects/rc-plane.jpg",
  "gallery": [],
  "status": "Active",
  "tags": ["CAD", "Electronics", "Testing"],
  "category": "current",
  "division": "Avionics",
  "createdAt": "2026-07-09T00:00:00.000Z",
  "updatedAt": "2026-07-09T00:00:00.000Z"
}
```

Allowed `division` values: `Avionics`, `Formula FRC`, `Rocketry`, `General`.
Allowed `category` values: `current`, `future`.

## How project data flows

- `js/projects-data.js` holds the seed projects shipped with the site.
- `admin.html` writes new projects to `localStorage` under the key
  `dac_projects`, and new sponsors under `dac_sponsors`.
- `js/main.js` merges seed + `localStorage` projects at page load and
  renders them into the Current Projects grid (filterable by division)
  and the Future Projects roadmap. Sponsors render into the Partners
  section, grouped by tier.

**Important limitation:** `localStorage` is per-browser, not a shared
database. The **images** you upload are real and shared (they're committed
to the GitHub repo), but the surrounding project/sponsor details — title,
description, tags, tier, etc. — are only visible in the browser that added
them. For a real multi-editor workflow, swap `getUserProjects` /
`saveUserProjects` / `getUserSponsors` / `saveUserSponsors` in
`js/main.js` for calls to a real backend or CMS (a simple JSON API,
Airtable, Supabase, etc.) — the rest of the front end already expects the
same schema, so the swap is mostly in those four functions.

## Theme

Dark mode is a manual toggle (top right, both pages), backed by
`prefers-color-scheme` on first visit and then remembered in
`localStorage` (`dac_theme`). All colors are CSS variables in
`css/styles.css` under `:root` and `html[data-theme="dark"]`.

## Adding real content

- Replace partner placeholder slots in the Partners section with real
  sponsor logos.
- Point `imageUrl` on projects at real photos once available — cards fall
  back to a placeholder icon automatically if an image fails to load.
- The contact form is a front-end demo only; wire the `<form id="contact-form">`
  in `index.html` to a form service or backend endpoint to make it send.
