const STATUS_MESSAGES = {
  ok: {
    text: "You're verified. Fill out the form below to submit your site.",
    classes: "border-ftp-blue bg-ftp-blue/5 text-ftp-blue",
  },
  "not-member": {
    text:
      "You're not a member of the FTP-YYC Discord server. Join FTP-YYC first, then come back to submit.",
    classes: "border-ftp-red bg-ftp-red/5 text-ftp-red",
  },
  error: {
    text: "Something went wrong during sign-in. Please try again.",
    classes: "border-ftp-red bg-ftp-red/5 text-ftp-red",
  },
};

function showState(name) {
  document
    .querySelectorAll("[data-state]")
    .forEach((el) => el.classList.toggle("hidden", el.dataset.state !== name));
}

function showStatusBanner() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  if (!status || !STATUS_MESSAGES[status]) return;

  const banner = document.getElementById("status-banner");
  const { text, classes } = STATUS_MESSAGES[status];
  banner.textContent = text;
  banner.className = `mt-6 border-l-4 px-4 py-3 text-sm ${classes}`;
  banner.classList.remove("hidden");

  // Strip status from URL so reloads don't replay the banner.
  const cleanUrl = window.location.pathname + window.location.hash;
  window.history.replaceState({}, "", cleanUrl);
}

async function fetchMe() {
  const res = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json();
}

async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  window.location.assign("/join");
}

function wireFormStub() {
  const form = document.getElementById("submit-form");
  const note = document.getElementById("submit-note");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    note.textContent = "Submission endpoint comes online in the next phase.";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  showStatusBanner();

  const me = await fetchMe();
  if (me?.authenticated) {
    document.getElementById("discord-username").textContent = me.username;
    document.getElementById("logout-btn").addEventListener("click", logout);
    wireFormStub();
    showState("signed-in");
  } else {
    showState("signed-out");
  }
});
