// /api/upload — Vercel serverless function
//
// Receives a base64-encoded image from the admin page and commits it
// straight into this repo via the GitHub Contents API, so uploaded
// images are real, permanent files — not just something sitting in
// one person's browser.
//
// Required environment variables (set these in Vercel, never in code):
//   gurt          — GitHub personal access token (Contents: read/write, scoped to this repo only)
//   GITHUB_BRANCH — optional, defaults to "main"
//
// The repo itself defaults to DEFAULT_REPO_URL below, so you don't have
// to set GITHUB_REPO in Vercel unless you want to point this at a
// different repo (e.g. testing on a fork).

const DEFAULT_REPO_URL = "https://github.com/SaffronWare/DawsonAerospaceWebsiteV100000.git";

function parseOwnerRepo(value) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\.git$/, "").replace(/\/$/, "");
  // Full URL form: https://github.com/owner/repo
  const urlMatch = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)$/i);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  // Short form: owner/repo
  const shortMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, base64, folder } = req.body || {};

    if (!filename || !base64) {
      return res.status(400).json({ error: "filename and base64 are required" });
    }

    // Only allow known upload folders — prevents writing to arbitrary repo paths.
    const allowedFolders = ["projects", "sponsors"];
    const safeFolder = allowedFolders.includes(folder) ? folder : "projects";

    // Strip anything that isn't a safe filename character.
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const path = `assets/uploads/${safeFolder}/${Date.now()}-${safeName}`;

    const parsed = parseOwnerRepo(process.env.GITHUB_REPO || DEFAULT_REPO_URL);
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.gurt;

    if (!parsed || !token) {
      return res.status(500).json({
        error: "Server is missing GitHub config. Check that gurt is set in Vercel env vars."
      });
    }

    const { owner, repo } = parsed;

    const ghResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
          message: `Add ${safeFolder} image: ${safeName}`,
          content: base64, // must be raw base64, no "data:image/...;base64," prefix
          branch
        })
      }
    );

    const ghData = await ghResponse.json();

    if (!ghResponse.ok) {
      return res.status(ghResponse.status).json({
        error: ghData.message || "GitHub upload failed"
      });
    }

    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    return res.status(200).json({ url, path });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
}
