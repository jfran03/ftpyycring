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

function wireSnippetCopyButtons() {
  const buttons = document.querySelectorAll("[data-copy-target]");
  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-copy-target");
      const codeEl = targetId ? document.getElementById(targetId) : null;
      if (!codeEl) return;

      const label = button.querySelector(".copy-label");

      try {
        await navigator.clipboard.writeText(codeEl.textContent || "");
        if (label) label.textContent = "COPIED";
        button.style.color = "#6ee7b7";
        button.style.borderColor = "#6ee7b7";
      } catch {
        if (label) label.textContent = "FAILED";
        button.style.color = "#fca5a5";
        button.style.borderColor = "#fca5a5";
      }

      window.setTimeout(() => {
        if (label) label.textContent = "COPY";
        button.style.color = "#94a3b8";
        button.style.borderColor = "#64748b";
      }, 1200);
    });
  });
}

function clearFieldErrors(form) {
  form.querySelectorAll("[data-error-for]").forEach((el) => {
    el.textContent = "";
    el.classList.add("hidden");
  });
}

function setFieldError(form, field, message) {
  const target = form.querySelector(`[data-error-for="${field}"]`);
  if (!target) return false;
  target.textContent = message;
  target.classList.remove("hidden");
  return true;
}

function setSubmitNote(text, isError = false) {
  const note = document.getElementById("submit-note");
  note.textContent = text;
  note.className = isError
    ? "font-ftpMono text-xs text-ftp-red"
    : "font-ftpMono text-xs text-black-900/60";
}

function renderErrors(form, errors) {
  const globals = [];
  for (const err of errors ?? []) {
    if (!setFieldError(form, err.field, err.message)) {
      globals.push(err.message);
    }
  }
  setSubmitNote(
    globals.length ? globals.join(" ") : "Please fix the errors above and try again.",
    true
  );
}

function showSuccess(prUrl) {
  const form = document.getElementById("submit-form");
  const success = document.getElementById("submit-success");
  const link = document.getElementById("submit-pr-link");
  link.href = prUrl;
  form.classList.add("hidden");
  success.classList.remove("hidden");
}

function wireFormSubmit() {
  const form = document.getElementById("submit-form");
  const submitBtn = document.getElementById("submit-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    setSubmitNote("Submitting…");
    submitBtn.disabled = true;

    const formData = new FormData(form);
    const payload = {
      name: (formData.get("name") || "").toString().trim(),
      profession: (formData.get("profession") || "").toString().trim(),
      url: (formData.get("url") || "").toString().trim(),
    };

    let res;
    try {
      res = await fetch("/api/submit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      submitBtn.disabled = false;
      setSubmitNote("Network error — please try again.", true);
      return;
    }

    if (res.status === 401) {
      submitBtn.disabled = false;
      setSubmitNote("Your session expired. Please sign in again.", true);
      showState("signed-out");
      return;
    }

    let body = null;
    try { body = await res.json(); } catch { /* non-JSON response */ }

    if (res.status === 201 && body?.prUrl) {
      showSuccess(body.prUrl);
      return;
    }

    submitBtn.disabled = false;

    if ((res.status === 400 || res.status === 409) && Array.isArray(body?.errors)) {
      renderErrors(form, body.errors);
      return;
    }

    if (body?.hint) {
      setSubmitNote(body.hint, true);
      return;
    }

    setSubmitNote("Something went wrong. Please try again in a moment.", true);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  showStatusBanner();
  wireSnippetCopyButtons();

  const me = await fetchMe();
  if (me?.authenticated) {
    document.getElementById("discord-username").textContent = me.username;
    document.getElementById("logout-btn").addEventListener("click", logout);
    wireFormSubmit();
    showState("signed-in");
  } else {
    showState("signed-out");
  }
});
