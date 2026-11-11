import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="page page-narrow">
      <div className="panel stack center">
        <Compass size={28} />
        <h1>Lost in the universe</h1>
        <p className="muted small">
          This page does not exist, or the content was unpublished by the administrator.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/">
            Back home
          </Link>
          <Link className="btn btn-ghost" to="/music">
            Music library
          </Link>
        </div>
      </div>
    </div>
  );
}
