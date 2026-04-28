const API = "https://api.github.com";
const MEMBERS_PATH = "data/members.json";

function requireEnv() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) {
    throw new Error("GitHub env vars missing (GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME)");
  }
  return { token, owner, repo };
}

async function gh(path, { method = "GET", body, env } = {}) {
  const { token } = env ?? requireEnv();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ftp-yyc-webring-bot",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const message = data?.message || res.statusText;
    const err = new Error(`GitHub ${method} ${path} failed: ${res.status} ${message}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function repoPath(suffix) {
  const { owner, repo } = requireEnv();
  return `/repos/${owner}/${repo}${suffix}`;
}

/** Branch to read members.json from, fork new branches off of, and target PRs into. Default `main`. */
export function getGithubBaseBranch() {
  const b = process.env.GITHUB_BASE_BRANCH?.trim();
  return b || "main";
}

export async function getMainSha() {
  const refPath = `heads/${getGithubBaseBranch()}`;
  const data = await gh(repoPath(`/git/ref/${encodeURIComponent(refPath)}`));
  return data.object.sha;
}

export async function getMembersFile() {
  const ref = encodeURIComponent(getGithubBaseBranch());
  const data = await gh(
    repoPath(`/contents/${encodeURIComponent(MEMBERS_PATH).replace(/%2F/g, "/")}?ref=${ref}`)
  );
  const raw = Buffer.from(data.content, data.encoding || "base64").toString("utf8");
  const parsed = JSON.parse(raw);
  return { sha: data.sha, parsed };
}

export async function createBranch(branchName, baseSha) {
  return gh(repoPath("/git/refs"), {
    method: "POST",
    body: { ref: `refs/heads/${branchName}`, sha: baseSha },
  });
}

export async function commitMembersUpdate({ branch, sha, parsed, newEntry, message }) {
  const next = { ...parsed, sites: [...parsed.sites, newEntry] };
  const json = `${JSON.stringify(next, null, 2)}\n`;
  const content = Buffer.from(json, "utf8").toString("base64");
  return gh(repoPath(`/contents/${MEMBERS_PATH}`), {
    method: "PUT",
    body: { message, content, sha, branch },
  });
}

export async function openPR({ branch, title, body }) {
  return gh(repoPath("/pulls"), {
    method: "POST",
    body: { title, body, head: branch, base: getGithubBaseBranch() },
  });
}

async function searchOpenPrs(query) {
  const { owner, repo } = requireEnv();
  const q = `is:pr is:open repo:${owner}/${repo} ${query}`;
  const data = await gh(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`);
  return (data?.total_count ?? 0) > 0;
}

export async function findOpenPRsByUrl(formattedUrl) {
  return searchOpenPrs(`"${formattedUrl}" in:body`);
}

/** Matches PR bodies that include this Discord snowflake (also shown in the PR table for maintainers). */
export async function findOpenPRsByDiscordUser(discordUserId) {
  const id = String(discordUserId || "").trim();
  if (!id) return false;
  return searchOpenPrs(`"${id}" in:body`);
}
