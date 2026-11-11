/* Small pure helpers shared by the public platform and the admin studio. */

export function slugify(input = "") {
  return String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "—";
  const total = Math.round(value);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatTimecode(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const total = Math.floor(value / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function parseTimecode(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 1000);
  const match = text.match(/^(\d+):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!match) return null;
  const [, mins, secs, fraction] = match;
  const extra = fraction ? Number(`0.${fraction}`) * 1000 : 0;
  return Math.round(Number(mins) * 60000 + Number(secs) * 1000 + extra);
}

export function formatDate(value, locale = "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale === "en" ? "en-GB" : locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function truncate(text = "", max = 140) {
  const value = String(text).trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function groupBy(list, keyFn) {
  return (list || []).reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function uniqueBy(list, keyFn) {
  const seen = new Set();
  return (list || []).filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeText(value = "") {
  return String(value).toLowerCase().trim();
}

export function matchesQuery(query, ...fields) {
  const needle = normalizeText(query);
  if (!needle) return true;
  return fields.some(field => normalizeText(field).includes(needle));
}
