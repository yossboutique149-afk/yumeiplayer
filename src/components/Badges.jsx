export function StatusBadge({ status }) {
  const published = status === "published";
  return (
    <span className={`badge ${published ? "badge-published" : "badge-draft"}`}>
      {published ? "Published" : "Draft"}
    </span>
  );
}

export function SampleBadge({ show = true }) {
  if (!show) return null;
  return (
    <span className="badge badge-sample" title="Placeholder content awaiting administrator input">
      Sample
    </span>
  );
}

export function AiBadge({ label = "AI interpretation" }) {
  return (
    <span className="badge badge-ai" title="Generated with AI assistance — not an official artist statement">
      {label}
    </span>
  );
}

export function RoleBadge({ role }) {
  if (!role) return null;
  return <span className="badge badge-admin">{role}</span>;
}
