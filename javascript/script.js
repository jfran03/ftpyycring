import { fuzzyMatch, formatUrl, getSiteProfession } from "./helpers.js";

let logConsoleMessage = () => {
  console.log(
    "%c👋 Hey there" +
      "\n\n%cLooks like you're poking around in the console. Why not add your site to the webring?" +
      "\n\n%c→ https://github.com/jfran03/ftpyycring",
    "font-size: 18px; font-weight: bold; color: #FF3366;",
    "font-size: 14px; color: #00FF00;",
    "font-size: 14px; color: #CE1126; text-decoration: underline;"
  );
};
let createWebringList = (matchedSiteIndices, highlight = false) => {
  const webringList = document.getElementById("webring-list");
  webringList.innerHTML = "";

  let firstHighlightedItem = null;

  webringData.sites.forEach((site, index) => {
    const displayUrl = formatUrl(site.website);

    const listItem = document.createElement("div");
    listItem.className =
      "grid grid-cols-3 gap-x-4 sm:gap-x-6 items-baseline w-full max-w-full py-1";
    const narrowed =
      highlight &&
      (matchedSiteIndices.length < webringData.sites.length ||
        matchedSiteIndices.length === 1);
    const isSearchItem = matchedSiteIndices.includes(index) && narrowed;
    if (isSearchItem) {
      listItem.className += " bg-ftp-red";
    }

    if (firstHighlightedItem === null && isSearchItem) {
      firstHighlightedItem = listItem;
    }

    const name = document.createElement("span");
    name.className =
      "min-w-0 font-semibold truncate tracking-tight text-left self-center";
    name.textContent = site.name;
    if (isSearchItem) {
      name.className += " text-white"
    }

    const profession = document.createElement("span");
    profession.className =
      "min-w-0 font-ftpMono text-sm text-left truncate self-center tracking-tight";
    profession.textContent = getSiteProfession(site);
    if (isSearchItem) {
      profession.className += " text-white";
    }

    const link = document.createElement("a");
    link.href = site.website;
    link.className =
      "min-w-0 font-ftpMono text-sm underline truncate text-left self-center tracking-tight block";
    link.textContent = displayUrl;
    if (isSearchItem) {
      link.className += " text-white"
    } else {
      link.className += " text-ftp-red"
    }

    listItem.appendChild(name);
    listItem.appendChild(profession);
    listItem.appendChild(link);
    webringList.appendChild(listItem);
  });

  // Only scroll if there's a highlighted item
  if (firstHighlightedItem) {
    setTimeout(() => {
      firstHighlightedItem.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }
};
function hashSearchTerm() {
  const raw = window.location.hash.slice(1);
  if (!raw) return "";
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.split("?")[0].trim();
  } catch {
    return raw.split("?")[0].trim();
  }
}

function handleUrlFragment(searchInput) {
  const term = hashSearchTerm();
  if (!term) return;
  searchInput.value = term;
  filterWebring(term);
}
function filterWebring(searchTerm) {
  const allIndices = webringData.sites.map((_, i) => i);
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    createWebringList(allIndices, false);
    return;
  }

  const searchLower = trimmed.toLowerCase();
  const matchedSiteIndices = [];
  webringData.sites.forEach((site, index) => {
    const professionSample = getSiteProfession(site).toLowerCase();
    const yearMatches =
      site.year != null &&
      String(site.year).toLowerCase().includes(searchLower);
    if (
      site.name.toLowerCase().includes(searchLower) ||
      fuzzyMatch(site.website.toLowerCase(), searchLower) ||
      professionSample.includes(searchLower) ||
      yearMatches
    ) {
      matchedSiteIndices.push(index);
    }
  });
  createWebringList(matchedSiteIndices, true);
}
let navigateWebring = () => {
  // https://ftp-yyc-webring.vercel.app/#your-site-here?nav=next OR
  // https://ftp-yyc-webring.vercel.app/#your-site-here?nav=prev
  const fragment = window.location.hash.slice(1); // #your-site-here?nav=
  if (!fragment.includes("?")) return;

  const [currentSite, query] = fragment.split("?");
  const params = new URLSearchParams(query);
  const nav = params.get("nav");
  const navTrimmed = nav ? nav.replace(/\/+$/, "").trim() : "";
  if (!nav || !["next", "prev"].includes(navTrimmed)) return;

  const match = webringData.sites.filter((site) =>
    fuzzyMatch(currentSite, site.website)
  );
  if (match.length === 0) return;
  if (match.length > 1) {
    throw new Error(
      `Cannot calculate navigation state because mutiple URLs matched ${currentSite}`
    );
  }

  const currIndex = webringData.sites.findIndex((site) =>
    fuzzyMatch(currentSite, site.website)
  );
  const increment = navTrimmed === "next" ? 1 : -1;
  let newIndex = (currIndex + increment) % webringData.sites.length;
  if (newIndex < 0) newIndex = webringData.sites.length - 1;
  if (!webringData.sites[newIndex]) return;

  document.body.innerHTML = `
  <main class="p-6 min-h-[100vh] w-[100vw] font-ftpSans antialiased text-black-900">
    <p class="font-medium italic">redirecting...</p>
  </main>
  `;
  window.location.href = webringData.sites[newIndex].website;
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.hash.includes("?nav=")) {
    navigateWebring();
  }
  const desktopInput = document.getElementById("search");
  const mobileInput = document.getElementById("search-mobile");

  logConsoleMessage();
  const allIndices = webringData.sites.map((_, i) => i);
  createWebringList(allIndices, false);
  handleUrlFragment(desktopInput);
  handleUrlFragment(mobileInput);

  desktopInput.addEventListener("input", (e) => {
    filterWebring(e.target.value);
  });
  mobileInput.addEventListener("input", (e) => {
    filterWebring(e.target.value);
  });
  window.addEventListener("hashchange", () => {
    if (!window.location.hash.includes("?nav=")) {
      handleUrlFragment(desktopInput);
      handleUrlFragment(mobileInput);
    }
  });
  window.addEventListener("hashchange", navigateWebring);
});
