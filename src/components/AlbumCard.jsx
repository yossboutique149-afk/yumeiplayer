import { Link } from "react-router-dom";
import CoverArt from "./CoverArt.jsx";
import { SampleBadge, StatusBadge } from "./Badges.jsx";
import { pluralize } from "../lib/format.js";

export default function AlbumCard({ album, songCount = 0, showStatus = false }) {
  return (
    <article className="album-card">
      <Link to={`/albums/${album.slug}`} aria-label={`Open ${album.title}`}>
        <CoverArt item={album} />
      </Link>

      <div className="album-body">
        <div className="album-cover-tags">
          <SampleBadge show={album.is_sample} />
          {showStatus && <StatusBadge status={album.status} />}
          {album.release_year && album.release_year !== "—" && (
            <span className="badge">{album.release_year}</span>
          )}
        </div>

        <Link className="album-title" to={`/albums/${album.slug}`}>
          {album.title}
        </Link>

        {album.romanized_title && (
          <div className="tiny faint">{album.romanized_title}</div>
        )}

        <p className="album-meta small muted">
          {pluralize(songCount, "track")}
        </p>
      </div>
    </article>
  );
}
