const BLOCKED_HOSTS = [
  "grabify.link",
  "iplogger.org",
  "iplogger.com",
  "2no.co",
  "yip.su",
  "blasze.com",
  "bmwforum.co",
  "leancoding.co",
  "spottyfly.com",
  "whatstheirip.com",
];

function normalizeHost(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

export function getBlockedHostMatch(hostname) {
  const host = normalizeHost(hostname);
  if (!host) return null;

  return (
    BLOCKED_HOSTS.find(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`)
    ) || null
  );
}

export function isBlockedHostname(hostname) {
  return Boolean(getBlockedHostMatch(hostname));
}
