import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { formatTimecode, parseTimecode, pluralize } from "../../lib/format.js";

const EMPTY_LINE = {
  original: "",
  translation: "",
  romanization: "",
  pronunciation: "",
  start: "",
  end: ""
};

const EMPTY_TERM = { term: "", reading: "", romaji: "", meaning: "", notes: "" };

function toEditor(line) {
  return {
    original: line.original || "",
    translation: line.translation || "",
    romanization: line.romanization || "",
    pronunciation: line.pronunciation || "",
    start: line.start_ms === null || line.start_ms === undefined ? "" : formatTimecode(line.start_ms),
    end: line.end_ms === null || line.end_ms === undefined ? "" : formatTimecode(line.end_ms)
  };
}

export default function LyricsAdminPage() {
  const { songs, loading } = useContent();
  const { success, error: toastError, info } = useToast();
  const [songId, setSongId] = useState("");
  const [lines, setLines] = useState([]);
  const [terms, setTerms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  const song = useMemo(() => songs.find(item => item.id === songId) || null, [songs, songId]);

  useEffect(() => {
    if (!songId) {
      setLines([]);
      setTerms([]);
      return;
    }
    let active = true;
    setFetching(true);
    repo
      .getSongBundle({ id: songId })
      .then(bundle => {
        if (!active) return;
        setLines(bundle.lines.length ? bundle.lines.map(toEditor) : [{ ...EMPTY_LINE }]);
        setTerms(bundle.vocabulary.length ? bundle.vocabulary : []);
      })
      .catch(err => active && toastError(err.message || "Could not load the lyrics."))
      .finally(() => active && setFetching(false));
    return () => {
      active = false;
    };
  }, [songId, toastError]);

  function patchLine(index, changes) {
    setLines(current => current.map((line, position) => (position === index ? { ...line, ...changes } : line)));
  }

  function move(index, direction) {
    setLines(current => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function addLine() {
    setLines(current => [...current, { ...EMPTY_LINE }]);
  }

  async function saveLines(event) {
    event.preventDefault();
    if (!songId) return;
    setBusy(true);
    try {
      const payload = lines
        .filter(line => line.original.trim() || line.translation.trim())
        .map(line => ({
          original: line.original,
          translation: line.translation,
          romanization: line.romanization,
          pronunciation: line.pronunciation,
          start_ms: line.start === "" ? null : parseTimecode(line.start),
          end_ms: line.end === "" ? null : parseTimecode(line.end)
        }));
      await repo.saveLyricLines(songId, payload);
      success(`Saved ${pluralize(payload.length, "line")}.`);
    } catch (err) {
      toastError(err.message || "Could not save the lyrics.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTerms(event) {
    event.preventDefault();
    if (!songId) return;
    setBusy(true);
    try {
      const payload = terms.filter(entry => entry.term.trim());
      await repo.saveVocabulary(songId, payload);
      success(`Saved ${pluralize(payload.length, "vocabulary entry", "vocabulary entries")}.`);
    } catch (err) {
      toastError(err.message || "Could not save the vocabulary.");
    } finally {
      setBusy(false);
    }
  }

  const timed = lines.filter(line => line.start !== "" && line.end !== "").length;

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Words</span>
          <h1>Lyrics &amp; vocabulary</h1>
          <p className="muted small">
            Enter only lyrics you are authorised to publish. Timing is optional, but every line
            needs both start and end before karaoke unlocks.
          </p>
        </div>
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
        {song && (
          <p className="tiny faint">
            {song.slug} · {pluralize(lines.length, "line")} · {timed} timed ·{" "}
            {song.audio_url ? "audio uploaded" : "no audio (karaoke disabled)"}
          </p>
        )}
      </div>

      {!songs.length && !loading && (
        <EmptyState title="No songs to write lyrics for">
          Create a song first in the Songs section.
        </EmptyState>
      )}

      {song && (
        <>
          <form className="admin-card stack" onSubmit={saveLines}>
            <div className="row between">
              <h2>Lyric lines</h2>
              <div className="row">
                <button type="button" className="btn btn-quiet btn-sm" onClick={addLine}>
                  <Plus size={14} /> Add line
                </button>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() =>
                    info("Timing format is mm:ss.mmm, for example 00:12.500. Leave empty for no timing.")
                  }
                >
                  <Wand2 size={14} /> Timing help
                </button>
              </div>
            </div>

            {fetching ? (
              <div className="skeleton" style={{ height: 180 }} />
            ) : (
              <div className="line-editor">
                {lines.map((line, index) => (
                  <div className="line-row" key={index}>
                    <span className="line-num">{index + 1}</span>

                    <div className="line-fields">
                      <textarea
                        className="input jp"
                        rows={2}
                        placeholder="Original lyric line"
                        value={line.original}
                        onChange={event => patchLine(index, { original: event.target.value })}
                      />
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Translation"
                        value={line.translation}
                        onChange={event => patchLine(index, { translation: event.target.value })}
                      />
                      <textarea
                        className="input"
                        rows={1}
                        placeholder="Romaji / romanisation"
                        value={line.romanization}
                        onChange={event => patchLine(index, { romanization: event.target.value })}
                      />
                      <textarea
                        className="input"
                        rows={1}
                        placeholder="Pronunciation guide"
                        value={line.pronunciation}
                        onChange={event => patchLine(index, { pronunciation: event.target.value })}
                      />
                      <div className="row">
                        <label className="field-label tiny">
                          Start
                          <input
                            className="input"
                            placeholder="00:12.500"
                            value={line.start}
                            onChange={event => patchLine(index, { start: event.target.value })}
                          />
                        </label>
                        <label className="field-label tiny">
                          End
                          <input
                            className="input"
                            placeholder="00:18.000"
                            value={line.end}
                            onChange={event => patchLine(index, { end: event.target.value })}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="line-tools">
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(index, -1)}>
                        <ArrowUp size={13} />
                      </button>
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(index, 1)}>
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() => setLines(current => current.filter((_, position) => position !== index))}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                <Save size={15} /> {busy ? "Saving…" : "Save lyrics"}
              </button>
              <span className="tiny faint">
                Saving replaces the stored lines for this song.
              </span>
            </div>
          </form>

          <form className="admin-card stack" onSubmit={saveTerms}>
            <div className="row between">
              <h2>Vocabulary</h2>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => setTerms(current => [...current, { ...EMPTY_TERM }])}
              >
                <Plus size={14} /> Add term
              </button>
            </div>

            {terms.length ? (
              <div className="stack">
                {terms.map((entry, index) => (
                  <div className="form-grid vocab-editor" key={index}>
                    <label className="field-label">
                      Term
                      <input
                        className="input jp"
                        value={entry.term || ""}
                        onChange={event =>
                          setTerms(current =>
                            current.map((item, position) =>
                              position === index ? { ...item, term: event.target.value } : item
                            )
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      Reading
                      <input
                        className="input jp"
                        value={entry.reading || ""}
                        onChange={event =>
                          setTerms(current =>
                            current.map((item, position) =>
                              position === index ? { ...item, reading: event.target.value } : item
                            )
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      Romaji
                      <input
                        className="input"
                        value={entry.romaji || ""}
                        onChange={event =>
                          setTerms(current =>
                            current.map((item, position) =>
                              position === index ? { ...item, romaji: event.target.value } : item
                            )
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      Meaning
                      <input
                        className="input"
                        value={entry.meaning || ""}
                        onChange={event =>
                          setTerms(current =>
                            current.map((item, position) =>
                              position === index ? { ...item, meaning: event.target.value } : item
                            )
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      Notes
                      <input
                        className="input"
                        value={entry.notes || ""}
                        onChange={event =>
                          setTerms(current =>
                            current.map((item, position) =>
                              position === index ? { ...item, notes: event.target.value } : item
                            )
                          )
                        }
                      />
                    </label>
                    <div className="row" style={{ alignItems: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() => setTerms(current => current.filter((_, position) => position !== index))}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted">No vocabulary yet. Add terms to build the study list.</p>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={busy || !terms.length}>
                <Save size={15} /> Save vocabulary
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
