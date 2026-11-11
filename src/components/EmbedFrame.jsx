import { WifiOff } from "lucide-react";
import { useOffline } from "../contexts/OfflineContext.jsx";

const ALLOWED = [
  { host: "open.spotify.com", path: "/embed/" },
  { host: "www.youtube.com", path: "/embed/" },
  { host: "youtube.com", path: "/embed/" },
  { host: "www.youtube-nocookie.com", path: "/embed/" },
  { host: "player.vimeo.com", path: "/video/" }
];

export function isAllowedEmbed(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, "https://example.invalid");
    return ALLOWED.some(
      entry => parsed.hostname === entry.host && parsed.pathname.startsWith(entry.path)
    );
  } catch {
    return false;
  }
}

export default function EmbedFrame({ url, title = "Official embed", label }) {
  const { online } = useOffline();

  if (!url) return null;

  if (!online) {
    return (
      <div className="notice embed-offline">
        <WifiOff size={16} />
        <span>
          The official player needs a connection. Covers, lyrics and your favorites still work
          offline.
        </span>
        <a href={url} target="_blank" rel="noreferrer noopener">
          {label || "Open on the official platform"}
        </a>
      </div>
    );
  }

  if (!isAllowedEmbed(url)) {
    return (
      <div className="notice">
        This embed link is not from a supported official player. Open it on the original
        platform instead:{" "}
        <a href={url} target="_blank" rel="noreferrer noopener">
          {label || url}
        </a>
      </div>
    );
  }

  return (
    <div className="embed-frame">
      <iframe
        src={url}
        title={title}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
