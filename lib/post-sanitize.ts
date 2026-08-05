export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function sanitizePostHtml(value: string) {
  return value
    .replace(/<(script|style|iframe|object|embed|form|input|button|svg|math|meta|link|base)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|svg|math|meta|link|base)\b[^>]*\/?>/gi, "")
    .replace(/\s(?:on\w+|style|id|class)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:javascript|data\s*:\s*text\/html)\s*:/gi, "")
    .trim();
}

export function cleanList(values: unknown, limit = 10) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value).trim()).filter(Boolean).slice(0, limit);
}
