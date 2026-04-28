import { verifySession } from "./lib/jwt.js";
import { parseCookies } from "./lib/cookies.js";
import { validateSubmission } from "./lib/validation.js";
import { formatUrl, isLooseDuplicate, slugifyName } from "./lib/url.js";
import { getBlockedHostMatch } from "./lib/blocklist.js";
import {
  getMainSha,
  getMembersFile,
  createBranch,
  commitMembersUpdate,
  openPR,
  findOpenPRsByUrl,
  findOpenPRsByDiscordUser,
  getGithubBaseBranch,
} from "./lib/github.js";

const REACHABILITY_TIMEOUT_MS = 3000;

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); } catch { resolve(null); }
    });
    req.on("error", () => resolve(null));
  });
}

async function checkReachable(url) {
  const tryFetch = async (method) => {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(REACHABILITY_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  };
  if (await tryFetch("HEAD")) return true;
  return tryFetch("GET");
}

function renderPrBody({ name, profession, url, discord_username, discord_user_id }) {
  const submittedAt = new Date().toISOString();
  return [
    "## New Webring Member Submission",
    "| Field | Value |",
    "|---|---|",
    `| Name | ${name} |`,
    `| Profession | ${profession} |`,
    `| URL | ${url} |`,
    `| Discord | ${discord_username} |`,
    `| Discord user ID | ${discord_user_id} |`,
    `| Submitted | ${submittedAt} |`,
    "---",
    "*This PR was created automatically via the webring submission form.*",
    "*A human review is required before merging.*",
  ].join("\n");
}

function settledValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function collectCheckErrors({ dup, prByUrl, reachable, prByUser, blockedHost }) {
  const errors = [];
  if (settledValue(dup, false)) {
    errors.push({
      field: "url",
      code: "duplicate_url",
      status: 409,
      message: "This site is already in the webring.",
    });
  }
  if (settledValue(prByUrl, false)) {
    errors.push({
      field: "url",
      code: "pr_open_url",
      status: 409,
      message: "An open pull request already exists for this URL.",
    });
  }
  if (reachable.status === "rejected" || settledValue(reachable, false) !== true) {
    errors.push({
      field: "url",
      code: "unreachable_url",
      status: 400,
      message: "URL did not respond with a successful status within 3 seconds.",
    });
  }
  if (settledValue(prByUser, false)) {
    errors.push({
      field: "_form",
      code: "pr_open_user",
      status: 409,
      message: "You already have an open submission. Please wait for it to be reviewed.",
    });
  }
  const matchedBlockedHost = settledValue(blockedHost, null);
  if (matchedBlockedHost) {
    errors.push({
      field: "url",
      code: "blocked_host",
      status: 400,
      message: `This domain is not allowed (${matchedBlockedHost}).`,
    });
  }
  return errors;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies["ftp_session"];
  if (!token) return res.status(401).json({ error: "unauthenticated" });

  let session;
  try {
    session = await verifySession(token);
  } catch {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const body = await readJsonBody(req);
  const { errors: validationErrors, data } = validateSubmission(body);
  if (validationErrors.length) {
    return res.status(400).json({ errors: validationErrors });
  }

  let membersFile;
  try {
    membersFile = await getMembersFile();
  } catch (err) {
    console.error("getMembersFile failed", err);
    const gh404 =
      err?.status === 404 ||
      err?.body?.status === "404";
    const hint = gh404
      ? `GitHub returned 404 for data/members.json — check GITHUB_REPO_OWNER / GITHUB_REPO_NAME, that branch ${getGithubBaseBranch()} exists and contains data/members.json (set GITHUB_BASE_BRANCH if not using main), and that your fine-grained token includes this repository under Repository access.`
      : undefined;
    return res.status(502).json({
      error: "github_unavailable",
      ...(hint ? { hint } : {}),
    });
  }

  const formattedSubmittedUrl = formatUrl(data.url);

  const [dup, prByUrl, reachable, prByUser, blockedHost] = await Promise.allSettled([
    Promise.resolve(
      Array.isArray(membersFile.parsed?.sites) &&
        membersFile.parsed.sites.some((s) => isLooseDuplicate(s.website, data.url))
    ),
    findOpenPRsByUrl(formattedSubmittedUrl),
    checkReachable(data.url),
    findOpenPRsByDiscordUser(session.sub),
    Promise.resolve(getBlockedHostMatch(new URL(data.url).hostname)),
  ]);

  const checkErrors = collectCheckErrors({
    dup,
    prByUrl,
    reachable,
    prByUser,
    blockedHost,
  });
  if (checkErrors.length) {
    const status = checkErrors.some((e) => e.status === 409) ? 409 : 400;
    const errors = checkErrors.map(({ status: _s, ...rest }) => rest);
    return res.status(status).json({ errors });
  }

  const branch = `webring/add-${slugifyName(data.name) || "member"}-${Date.now()}`;

  try {
    const baseSha = await getMainSha();
    await createBranch(branch, baseSha);
    await commitMembersUpdate({
      branch,
      sha: membersFile.sha,
      parsed: membersFile.parsed,
      newEntry: {
        name: data.name,
        Profession: data.profession,
        website: data.url,
      },
      message: `add: ${data.name} to webring`,
    });
    const pr = await openPR({
      branch,
      title: `Add ${data.name} to webring`,
      body: renderPrBody({
        name: data.name,
        profession: data.profession,
        url: data.url,
        discord_username: session.username,
        discord_user_id: session.sub,
      }),
    });
    return res.status(201).json({ prUrl: pr.html_url });
  } catch (err) {
    console.error("PR creation failed", err);
    return res.status(502).json({ error: "github_pr_failed" });
  }
}
