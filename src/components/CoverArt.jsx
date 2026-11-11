const GRADIENTS = [
  "linear-gradient(140deg, #6d4a9c, #2a1b3f 60%, #120b1e)",
  "linear-gradient(140deg, #b06a9b, #3a1f46 60%, #140c20)",
  "linear-gradient(140deg, #7f6bd4, #241a3d 60%, #0f0a18)",
  "linear-gradient(140deg, #c98fb8, #4a2a54 60%, #150d20)"
];

function hash(value = "") {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 9973;
  }
  return total;
}

export default function CoverArt({ item, className = "album-cover", alt }) {
  const glyph =
    item?.cover_glyph ||
    (item?.title_ja ? item.title_ja.slice(0, 1) : (item?.title || "Y").slice(0, 1));

  if (item?.cover_url) {
    return (
      <img
        className={className}
        src={item.cover_url}
        alt={alt || `${item.title || "Cover"} artwork`}
        loading="lazy"
      />
    );
  }

  const gradient = GRADIENTS[hash(item?.id || item?.title || "yumeika") % GRADIENTS.length];

  return (
    <div
      className={`${className} cover-fallback`}
      style={{ backgroundImage: gradient }}
      role="img"
      aria-label={alt || `${item?.title || "Untitled"} — placeholder cover artwork`}
    >
      <span className={item?.title_ja ? "jp" : ""}>{glyph}</span>
    </div>
  );
}
