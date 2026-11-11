/* Karaoke timing helpers — pure functions so they can be unit tested. */

export function sortLines(lines = []) {
  return [...lines].sort((a, b) => {
    const left = Number.isFinite(a?.line_index) ? a.line_index : 0;
    const right = Number.isFinite(b?.line_index) ? b.line_index : 0;
    return left - right;
  });
}

export function hasTiming(line) {
  return (
    line &&
    Number.isFinite(Number(line.start_ms)) &&
    Number(line.start_ms) >= 0 &&
    Number.isFinite(Number(line.end_ms)) &&
    Number(line.end_ms) > Number(line.start_ms)
  );
}

export function isKaraokeReady(song, lines = []) {
  if (!song || !song.audio_url) return false;
  const usable = sortLines(lines).filter(line => hasTiming(line));
  return usable.length > 0 && usable.length === lines.length;
}

export function findActiveLineIndex(lines = [], currentMs = 0) {
  const ordered = sortLines(lines);
  const now = Number(currentMs) || 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const line = ordered[index];
    if (!hasTiming(line)) continue;
    if (now >= Number(line.start_ms) && now < Number(line.end_ms)) return index;
  }
  return -1;
}

export function nextTimedIndex(lines = [], fromIndex = -1) {
  const ordered = sortLines(lines);
  for (let index = fromIndex + 1; index < ordered.length; index += 1) {
    if (hasTiming(ordered[index])) return index;
  }
  return -1;
}

export function karaokeProgress(line, currentMs = 0) {
  if (!hasTiming(line)) return 0;
  const start = Number(line.start_ms);
  const end = Number(line.end_ms);
  const value = (Number(currentMs) - start) / (end - start);
  return Math.min(Math.max(value, 0), 1);
}
