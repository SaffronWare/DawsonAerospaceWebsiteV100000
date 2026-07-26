// /api/upload — Vercel serverless function
//
// Handles all photo-slot writes for the site:
//   action "upload" — commit an image file into the repo, then record its
//                      URL (and optional sponsor name/link) in a shared
//                      manifest file so every visitor sees the same photo,
//                      not just the browser that uploaded it.
//   action "meta"   — update just the name/link for a slot, no new image.
//   action "clear"  — remove a slot's photo (and any name/link) from the
//                      manifest, back to a placeholder for everyone.
//
// The manifest lives at assets/photo-manifest.json in this repo, and is
// read by every visitor's browser directly from
// raw.githubusercontent.com — no server round trip needed to view it,
// only to change it.
//
// Required environment variable (set in Vercel, never in code):
//   gurt — GitHub personal access token (Contents: read/write, scoped to this repo only)
//
// The repo defaults to DEFAULT_REPO_URL below. Override with GITHUB_REPO
// if you want uploads to go somewhere else. GITHUB_BRANCH defaults to "main".

const DEFAULT_REPO_URL = "https://github.com/SaffronWare/DawsonAerospaceWebsiteV100000.git";
const MANIFEST_PATH = "assets/photo-manifest.json";

function parseOwnerRepo(value) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const urlMatch = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)$/i);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const shortMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

async function githubRequest(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...(options.headers || {})
    }
  });
  return res;
}

async function getManifest(owner, repo, branch, token) {
  const res = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/contents/${MANIFEST_PATH}?ref=${branch}`,
    token
  );
  if (res.status === 404) return { manifest: {}, sha: null };
  if (!res.ok) throw new Error("Could not read the current photo manifest from GitHub.");
  const data = await res.json();
  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  let manifest;
  try {
    manifest = JSON.parse(decoded);
  } catch (e) {
    manifest = {};
  }
  return { manifest, sha: data.sha };
}

async function putManifest(owner, repo, branch, token, manifest, sha, message) {
  const content = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8").toString("base64");
  const res = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/contents/${MANIFEST_PATH}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content,
        branch,
        ...(sha ? { sha } : {})
      })
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Could not save the photo manifest to GitHub.");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action = "upload", filename, base64, folder, slotId, name, link } = req.body || {};

    if (!slotId) {
      return res.status(400).json({ error: "slotId is required" });
    }

    const parsed = parseOwnerRepo(process.env.GITHUB_REPO || DEFAULT_REPO_URL);
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.gurt;

    if (!parsed || !token) {
      return res.status(500).json({ error: "Server is missing GitHub config. Check that gurt is set in Vercel env vars." });
    }
    const { owner, repo } = parsed;

    let imageUrl = null;

    if (action === "upload") {
      if (!filename || !base64) {
        return res.status(400).json({ error: "filename and base64 are required for an upload" });
      }
      const allowedFolders = ["projects", "sponsors", "site"];
      const safeFolder = allowedFolders.includes(folder) ? folder : "site";
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
      const path = `assets/uploads/${safeFolder}/${Date.now()}-${safeName}`;

      const uploadRes = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        token,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Add ${safeFolder} photo for slot ${slotId}: ${safeName}`,
            content: base64,
            branch
          })
        }
      );
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        return res.status(uploadRes.status).json({ error: uploadData.message || "GitHub upload failed" });
      }
      imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    }

    // Read-modify-write the shared manifest so every visitor sees the same result.
    const { manifest, sha } = await getManifest(owner, repo, branch, token);
    const existing = manifest[slotId] || {};

    if (action === "clear") {
      manifest[slotId] = { url: "", name: "", link: "", updatedAt: new Date().toISOString() };
    } else if (action === "meta") {
      manifest[slotId] = {
        ...existing,
        name: name !== undefined ? name : existing.name || "",
        link: link !== undefined ? link : existing.link || "",
        updatedAt: new Date().toISOString()
      };
    } else {
      manifest[slotId] = {
        url: imageUrl,
        name: name !== undefined ? name : existing.name || "",
        link: link !== undefined ? link : existing.link || "",
        updatedAt: new Date().toISOString()
      };
    }

    await putManifest(owner, repo, branch, token, manifest, sha, `Update photo manifest: ${slotId} (${action})`);

    return res.status(200).json({ ok: true, slotId, entry: manifest[slotId] });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Request failed" });
  }
}
