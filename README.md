# DAC — Dawson Aerospace Club website

Static site, no build step. Open `index.html` directly, or serve the folder
with any static host. Photo uploads from the admin page need Vercel (or
another host that runs `/api` as a serverless function) — see below.

## Structure

```
index.html          Main site — full-viewport hero photo, Who We Are, Projects
                     (horizontal Avionics / Formula FRC / Rocketry panels),
                     Partners, Donate, Contact
admin.html            Photo Manager — upload a photo into any slot on the site
css/styles.css         All styles — light + dark theme via CSS variables
js/main.js             Theme toggle, nav, photo-slot rendering, division panel
                        scroller, GitHub upload calls, admin photo manager
api/upload.js           Vercel serverless function — commits uploaded images
                         to this repo via the GitHub API
assets/logo.png          Club logo
```

There is no project/sponsor content database anymore — no add/edit forms,
no schema. The site's text is written directly into `index.html`. The
only thing admin.html manages is **photos**, dropped into fixed slots.

## The hero photo

The full-screen photo at the very top of the homepage is **not** managed
from the admin page — add it straight to the repo:

```
assets/photo1.jpg   (or assets/photo1.png)
```

`index.html` looks for `photo1.jpg` first, falls back to `photo1.png`,
and shows a placeholder with instructions if neither exists yet.

## Every other photo — the slot system

Every other photo on the site (Who We Are, each division's project
photos, sponsor logos, the Donate photo) is a **photo slot**: a named
spot on the page that starts empty and shows a placeholder until
someone uploads into it from `admin.html`.

Go to `admin.html`, find the slot you want (grouped by section — Who We
Are, Avionics, Formula FRC, Rocketry, Donate, Partners), choose a file,
and click Upload. The image is committed into this GitHub repo, so it's
real and shared with every visitor immediately — not just saved in your
browser. Sponsor slots also have simple Name and Website fields that
save automatically when you leave the field.

Click **Remove** on a slot to clear it back to a placeholder (this only
clears the reference on your device — the uploaded file itself stays in
the repo under `assets/uploads/`, so nothing is destroyed).

### Where slots live in code

The full list of slots is defined once, in `js/main.js`, as
`SLOT_REGISTRY`. Each slot has an `id`, a human `label`, and an upload
`folder`. To add a new slot: add an entry to `SLOT_REGISTRY`, then place
an element with `data-photo-slot="that-id"` anywhere in `index.html` —
`admin.html` will automatically pick it up too, no separate wiring
needed.

## Image uploads — how they work

`admin.html` sends the chosen file to `/api/upload`, a Vercel serverless
function that:

1. Commits the image into this repo via the GitHub Contents API
2. Records that photo's URL (plus name/link, for sponsor slots) in a
   single shared file: `assets/photo-manifest.json`, also committed to
   the repo

Every visitor's browser — `index.html` and `admin.html` alike — reads
that manifest directly from `raw.githubusercontent.com` on page load, no
authentication required. That's what makes an uploaded photo show up for
**everyone**, immediately, not just the browser that uploaded it.

Clicking **Remove** on a slot calls the same endpoint with a "clear"
action, which updates the shared manifest so the slot goes back to a
placeholder for every visitor. The originally uploaded file stays in
`assets/uploads/` either way — nothing is deleted from the repo, only the
manifest reference.

This **only works once deployed on Vercel** (or another host running
`/api` as a serverless function). Opening `admin.html` from disk, or
hosting on a plain static host like GitHub Pages, has nowhere to send the
upload request — the Upload/Remove buttons will fail with a network
error. Viewing already-uploaded photos on `index.html`, however, works
anywhere, since reading the manifest is a plain public fetch with no
server involved.

### Required environment variable (set in Vercel, not in code)

| Variable | Value |
|---|---|
| `gurt` | A GitHub personal access token, scoped to just this repo, with **Contents: Read and write** permission |

The repo itself is hardcoded as a default inside `api/upload.js`
(`https://github.com/SaffronWare/DawsonAerospaceWebsiteV100000.git`).
Optional overrides, only needed if you want to point uploads somewhere
else: `GITHUB_REPO` (full URL or `owner/repo`) and `GITHUB_BRANCH`
(defaults to `main`).

**If you ever change `GITHUB_REPO`,** also update the matching
`MANIFEST_REPO` constant at the top of `js/main.js` — the browser can't
read Vercel's environment variables, so it needs its own copy of which
repo to fetch the public manifest from.

## Theme

The site now starts in **light mode** by default regardless of the
visitor's system setting. The toggle (top right, both pages) still works
and is remembered per-browser via `localStorage` (`dac_theme`) once
someone switches it.
