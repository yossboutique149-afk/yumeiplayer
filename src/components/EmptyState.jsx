export default function EmptyState({ icon = null, title, children, action = null }) {
  return (
    <div className="empty-state">
      {icon}
      {title && <h3>{title}</h3>}
      {children && <div className="muted small">{children}</div>}
      {action}
    </div>
  );
}
