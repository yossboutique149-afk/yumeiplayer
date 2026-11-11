import { Download, Share, Smartphone, X } from "lucide-react";
import { useOffline } from "../contexts/OfflineContext.jsx";

/**
 * Dismissible "install this app" card, the same pattern fan apps use: one tap on
 * Android/Chrome, short Share-sheet instructions on iPhone/iPad.
 */
export default function InstallPrompt() {
  const { showInstallCard, canInstall, ios, install, dismissInstall, online } = useOffline();

  if (!showInstallCard) return null;

  return (
    <aside className="install-card" role="complementary" aria-label="Install YUMEIKA">
      <button
        type="button"
        className="install-card-close"
        onClick={dismissInstall}
        aria-label="Dismiss install prompt"
      >
        <X size={15} />
      </button>

      <div className="install-card-head">
        <span className="install-card-icon" aria-hidden="true">
          <Smartphone size={18} />
        </span>
        <div>
          <strong>Install YUMEIKA</strong>
          <p>Albums, lyrics and favorites stay on your phone — even without internet.</p>
        </div>
      </div>

      {canInstall ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={install}>
          <Download size={15} /> Install app
        </button>
      ) : (
        <p className="install-card-hint">
          <Share size={14} /> Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </p>
      )}

      {!online && (
        <p className="install-card-hint">You are offline right now — installation needs a connection.</p>
      )}

      {ios && !canInstall && (
        <p className="install-card-hint">Works on iPhone, iPad and Android once added.</p>
      )}
    </aside>
  );
}
