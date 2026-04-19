/** Prefer "Profession" (sites table); fall back to legacy "profession". */
const getSiteProfession = (site) =>
  site.Profession ?? site.profession ?? "Software Developer";

// remove protocol, www, trailing slashes and www. from a url
const formatUrl = (url) => {
  return url
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "");
};
// search for website urls within tolerance of protocol, subdomain and trailing slashes
const fuzzyMatch = (searchTerm, target) => {
  const searchTermFormatted = formatUrl(searchTerm);
  const targetFormatted = formatUrl(target);
  return searchTermFormatted.includes(targetFormatted) || targetFormatted.includes(searchTermFormatted);
};
export { fuzzyMatch, formatUrl, getSiteProfession };
