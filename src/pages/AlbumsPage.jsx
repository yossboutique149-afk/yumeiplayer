import { useContent } from "../contexts/ContentContext.jsx";
import AlbumCard from "../components/AlbumCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function AlbumsPage() {
  const { albums, songsForAlbum, loading } = useContent();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Discography</span>
          <h1>Albums</h1>
          <p className="muted small">
            The album library, including Japanese titles with romanisation. Metadata and
            tracks are editable in the Admin Studio.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="album-grid">
          {[0, 1, 2, 3].map(key => (
            <div className="skeleton" key={key} style={{ height: 300 }} />
          ))}
        </div>
      ) : albums.length ? (
        <div className="album-grid">
          {albums.map(album => (
            <AlbumCard key={album.id} album={album} songCount={songsForAlbum(album.id).length} />
          ))}
        </div>
      ) : (
        <EmptyState title="No albums published yet">
          Create the first album in the Admin Studio to start the discography.
        </EmptyState>
      )}
    </div>
  );
}
