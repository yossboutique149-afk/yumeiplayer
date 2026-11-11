import { useEffect, useMemo, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { AiBadge } from "../../components/Badges.jsx";
import { AI_DISCLAIMER } from "../../data/sample.js";

const FIELDS = [
  ["story", "Story"],
  ["verses", "Verse by verse"],
  ["metaphors", "Metaphors"],
  ["symbolism", "Symbolism"],
  ["emotions", "Emotions"],
  ["production", "Production"],
  ["themes", "Themes (comma separated)"],
  ["connections", "Connections to other songs"]
];

const EMPTY = {
  story: "",
  verses: "",
  metaphors: "",
  symbolism: "",
  emotions: "",
  production: "",
  themes: "",
  connections: "",
  is_ai_generated: true,
  disclaimer: AI_DISCLAIMER
};

export default function DecodeAdminPage() {
  const { songs, loading } = useContent();
  const { success, error: toastError } = useToast();
  const [songId, setSongId] = useState("");
  const [values, setValues] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  const song = useMemo(() => songs.find(item => item.id === songId) || null, [songs, songId]);

  useEffect(() => {
    if (!songId) return;
    let active = true;
    setFetching(true);
    repo
      .getSongBundle({ id: songId })
      .then(bundle => {
        if (!active) return;
        const analysis = bundle.analysis;
        setValues(
          analysis
            ? {
                story: analysis.story || "",
                verses: analysis.verses || "",
                metaphors: analysis.metaphors || "",
                symbolism: analysis.symbolism || "",
                emotions: analysis.emotions || "",
                production: analysis.production || "",
                themes: analysis.themes || "",
                connections: analysis.connections || "",
                is_ai_generated: Boolean(analysis.is_ai_generated),
                disclaimer: analysis.disclaimer || AI_DISCLAIMER
              }
            : { ...EMPTY }
        );
      })
      .catch(err => active && toastError(err.message || "Could not load the analysis."))
      .finally(() => active && setFetching(false));
    return () => {
      active = false;
    };
  }, [songId, toastError]);

  async function save(event) {
    event.preventDefault();
    if (!songId) return;
    setBusy(true);
    try {
      await repo.saveAnalysis(songId, values);
      success("Song decode saved.");
    } catch (err) {
      toastError(err.message || "Could not save the analysis.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Interpretation</span>
          <h1>Song decode</h1>
          <p className="muted small">
            Write the analysis yourself or keep the AI label on. AI-assisted text is always shown
            with a disclaimer on the public page — never as an official artist statement.
          </p>
        </div>
        {values.is_ai_generated && <AiBadge />}
      </div>

      <div className="admin-card stack">
        <label className="field-label">
          Song
          <select
            className="select"
            value={songId}
            onChange={event => setSongId(event.target.value)}
            disabled={loading}
          >
            <option value="">Choose a song…</option>
            {songs.map(item => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.status})
              </option>
            ))}
          </select>
        </label>
      </div>

      {!songs.length && !loading ? (
        <EmptyState title="No songs to analyse">Create a song first.</EmptyState>
      ) : (
        song && (
          <form className="admin-card stack" onSubmit={save}>
            {fetching ? (
              <div className="skeleton" style={{ height: 220 }} />
            ) : (
              <>
                {FIELDS.map(([key, label]) => (
                  <label className="field-label" key={key}>
                    {label}
                    <textarea
                      className="input"
                      rows={key === "verses" || key === "story" ? 5 : 3}
                      value={values[key] || ""}
                      onChange={event => setValues({ ...values, [key]: event.target.value })}
                    />
                  </label>
                ))}

                <label className="row tiny">
                  <input
                    type="checkbox"
                    checked={Boolean(values.is_ai_generated)}
                    onChange={event =>
                      setValues({ ...values, is_ai_generated: event.target.checked })
                    }
                  />
                  This analysis was produced with AI assistance
                </label>

                <label className="field-label">
                  Disclaimer shown on the public page
                  <textarea
                    className="input"
                    rows={2}
                    value={values.disclaimer || ""}
                    onChange={event => setValues({ ...values, disclaimer: event.target.value })}
                  />
                </label>

                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    <Save size={15} /> {busy ? "Saving…" : "Save decode"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => setValues({ ...EMPTY, story: values.story })}
                  >
                    <Sparkles size={14} /> Reset other fields
                  </button>
                </div>
              </>
            )}
          </form>
        )
      )}
    </div>
  );
}
