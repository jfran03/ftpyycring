const NAME_RE = /^[A-Za-z0-9 \-']+$/;
const PROFESSION_RE = /^[A-Za-z0-9 \-]+$/;
const MAX_URL_LEN = 200;

const ALLOWED_FIELDS = new Set(["name", "profession", "url"]);

function asTrimmedString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function validateName(value) {
  if (!value) return "Name is required.";
  if (value.length < 2) return "Name must be at least 2 characters.";
  if (value.length > 64) return "Name must be at most 64 characters.";
  if (!NAME_RE.test(value)) {
    return "Name may only contain letters, numbers, spaces, hyphens, and apostrophes.";
  }
  return null;
}

function validateProfession(value) {
  if (!value) return "Profession is required.";
  if (value.length < 2) return "Profession must be at least 2 characters.";
  if (value.length > 64) return "Profession must be at most 64 characters.";
  if (!PROFESSION_RE.test(value)) {
    return "Profession may only contain letters, numbers, spaces, and hyphens.";
  }
  return null;
}

function validateUrl(value) {
  if (!value) return "URL is required.";
  if (value.length > MAX_URL_LEN) {
    return `URL must be at most ${MAX_URL_LEN} characters.`;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "URL is not a valid web address.";
  }
  if (parsed.protocol !== "https:") return "URL must use https://.";
  if (!parsed.hostname.includes(".")) return "URL must include a valid domain.";
  return null;
}

export function validateSubmission(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      errors: [{ field: "_form", code: "invalid_body", message: "Request body must be a JSON object." }],
      data: null,
    };
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push({
        field: key,
        code: "unknown_field",
        message: `Unknown field "${key}".`,
      });
    }
  }

  const name = asTrimmedString(body.name);
  const profession = asTrimmedString(body.profession);
  const url = asTrimmedString(body.url);

  const nameErr = validateName(name);
  if (nameErr) errors.push({ field: "name", code: "invalid_name", message: nameErr });

  const professionErr = validateProfession(profession);
  if (professionErr) {
    errors.push({ field: "profession", code: "invalid_profession", message: professionErr });
  }

  const urlErr = validateUrl(url);
  if (urlErr) errors.push({ field: "url", code: "invalid_url", message: urlErr });

  return {
    errors,
    data: errors.length ? null : { name, profession, url },
  };
}
