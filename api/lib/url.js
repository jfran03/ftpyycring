export function formatUrl(url) {
  return String(url)
    .trim()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "");
}

export function isLooseDuplicate(candidate, existing) {
  const a = formatUrl(candidate);
  const b = formatUrl(existing);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export function slugifyName(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
