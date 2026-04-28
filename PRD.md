# FTP-YYC Webring — Implementation Plan

**Repo:** jfran03/ftpyycring  
**Goal:** Public `/join` form backed by Discord OAuth and automated GitHub PR creation, preserving human review before merge.

---

## Phase 0 — Data Extraction ✅

Move member data out of `index.html` into a standalone JSON file so the bot has a clean target to edit.

- [x] Create `data/members.json`
- [x] Create `javascript/data.js` — cached `fetch('/data/members.json')` loader
- [x] Refactor `javascript/script.js` to await loader before rendering
- [x] Refactor `javascript/d3-ring-chart.js` to await loader, convert to ES module
- [x] Remove inline `webringData` script block from `index.html`
- [x] Update `README.md` — point contributors at `data/members.json`

---

## Phase 1 — `/join` Page + Discord OAuth ✅

Public form page and Discord guild membership verification. No submission yet.

- [x] `join.html` — three-state UI (loading / signed-out / signed-in), status banner, form scaffolding
- [x] `javascript/join.js` — calls `/api/auth/me` on load, toggles state, wires logout, stubs form submit
- [x] `api/lib/discord.js` — `buildAuthorizeUrl`, `exchangeCode`, `fetchUser`, `fetchUserGuilds`, `isInGuild`
- [x] `api/lib/jwt.js` — `signSession` / `verifySession` (HS256, 15 min, `jose`)
- [x] `api/auth/discord/start.js` — generates state cookie, redirects to Discord authorize URL
- [x] `api/auth/discord/callback.js` — verifies state, exchanges code, checks guild, sets `ftp_session` HttpOnly cookie
- [x] `api/auth/me.js` — returns `{ authenticated, username, expiresAt }` from cookie or 401
- [x] `api/auth/logout.js` — clears session cookie
- [x] `package.json` — `type: module`, Node 20, `hono` + `jose` deps
- [x] `vercel.json` — `cleanUrls: true`
- [x] `.env.example` — documents all required env vars

**Env vars needed:** `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `DISCORD_REDIRECT_URI`, `JWT_SECRET`

---

## Phase 2 — `POST /api/submit` + GitHub PR Creation ✅

Wire the form to actually create a PR on the submitter's behalf.

- [x] `api/lib/validation.js` — validate `name`, `profession`, `url` per field rules
- [x] `api/lib/url.js` — `formatUrl` / `isLooseDuplicate` (shared normalisation, mirrors `javascript/helpers.js`)
- [x] `api/lib/github.js` — `getMainSha`, `getMembersFile`, `createBranch`, `commitMembersUpdate`, `openPR`, `findOpenPRsByUrl`, `findOpenPRsByDiscordUser`
- [x] `api/submit.js` — POST handler:
  - Read + validate JWT from `ftp_session` cookie (401 on miss/invalid); JWT `sub` = Discord user ID (snowflake), `username` = Discord handle
  - Validate request body fields (400 with field-level errors)
  - Run four checks in parallel via `Promise.allSettled`:
    1. Duplicate URL — scan `data/members.json` in repo using `isLooseDuplicate`
    2. Open PR check — search GitHub for open PRs whose body includes the same normalized URL string
    3. URL reachability — HEAD, then GET fallback if needed; 3 s timeout; require 2xx
    4. One open PR per Discord account — GitHub search for open PRs whose body contains the submitter's **Discord user ID** (same value as JWT `sub`, also shown in the PR table so maintainers can read it); reject 409 if one exists
  - Aggregate all failures into one response (400 / 409)
  - On pass: create branch → patch `data/members.json` → commit → open PR with template body → return `{ prUrl }` 201
- [x] Update `javascript/join.js` — `fetch('/api/submit', { credentials: 'same-origin' })`, show PR link on success and field errors on failure

**PR body template:**
```
## New Webring Member Submission
| Field | Value |
|---|---|
| Name | {name} |
| Profession | {profession} |
| URL | {url} |
| Discord | {discord_username} |
| Discord user ID | {discord_user_id} |
| Submitted | {ISO 8601 timestamp} |
---
*This PR was created automatically via the webring submission form.*
*A human review is required before merging.*
```

The **Discord user ID** row is the stable identifier (Discord snowflake from OAuth). It is visible to maintainers in every PR and is what `findOpenPRsByDiscordUser` matches via GitHub code search (`"{id}" in:body`).

**Branch naming:** `webring/add-{sanitized-name}-{timestamp}`  
**Commit message:** `add: {name} to webring`

**Env vars needed:** `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`

---

## Phase 3 — URL Blocklist

Discord OAuth already gates on server membership, and Phase 2's one-account-one-PR check handles duplicate submissions. The only remaining gap is a server member submitting a known spam or phishing domain. Rate limiting (Upstash) and bot filtering (Turnstile) were evaluated and dropped as redundant given the existing gates.

- [ ] `api/lib/blocklist.js` — static blocklist of known spam/phishing hosts, checked against the submitted URL's hostname before PR creation; reject 400 if matched
- [ ] Wire blocklist check into `api/submit.js` alongside the existing `Promise.allSettled` checks

No new env vars or external services required.

---

## Phase 4 — Polish

- [ ] Success state on `/join` — show PR link and "what happens next" copy
- [ ] Error UX — field-level inline errors, 429 retry message with countdown
- [ ] Update `README.md` — surface `/join` as the primary path at the top of "Joining the Webring"
- [ ] End-to-end smoke test — submit via form against `jfran03/ftpyycring`, verify PR lands correctly, close the test PR
