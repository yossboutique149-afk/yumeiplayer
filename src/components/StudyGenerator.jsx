import { useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Sparkles, Wand2 } from "lucide-react";
import { repo } from "../lib/dataClient.js";
import { useToast } from "../contexts/ToastContext.jsx";
import { distributeTimings, studyStats } from "../lib/study.js";
import {
  IntegrationError,
  generateSongStudy,
  getServerPassword,
  setServerPassword
} from "../lib/integrations.js";

/**
 * Generates lyrics study material for one song with the AI endpoint and writes
 * it into the song bundle: lines (with karaoke timings when the song has audio),
 * vocabulary and the deep analysis. Everything saved here is flagged as AI.
 */
export default function StudyGenerator({ song, onApplied, language = "ja" }) {
  const { success, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(getServerPassword());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [problem, setProblem] = useState(null);
  const [study, setStudy] = useState(null);

  async function run() {
    setBusy(true);
    setProblem(null);
    setStudy(null);
    try {
      setServerPassword(password);
      const data = await generateSongStudy({ song, language, notes, password });
      setStudy(data.study);
      success("Study generated. Review it, then save it to the song.");
    } catch (err) {
      setProblem(
        err instanceof IntegrationError
          ? { message: err.message, missing: err.missing, hint: err.hint }
          : { message: err.message || "Study generation failed." }
      );
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!study) return;
    setApplying(true);
    try {
      if (study.lines.length) {
        await repo.saveLyricLines(song.id, distributeTimings(study.lines, song.duration_seconds));
      }
      if (study.vocabulary.length) {
        await repo.saveVocabulary(song.id, study.vocabulary);
      }
      await repo.saveAnalysis(song.id, {
        ...study.analysis,
        is_ai_generated: true,
        disclaimer: study.disclaimer
      });
      await onApplied?.();
      const stats = studyStats(study);
      success(
        `Saved to “${song.title}”: ${stats.lines} lines, ${stats.vocabulary} words, ${stats.sections} analysis sections.`
      );
      setStudy(null);
      setOpen(false);
    } catch (err) {
      toastError(err.message || "Could not save the generated study.");
    } finally {
      setApplying(false);
    }
  }

  const stats = study ? studyStats(study) : null;

  return (
    <div className="stack">
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
      >
        <Sparkles size={14} /> {open ? "Close AI study" : "AI study"}
      </button>

      {open && (
        <div className="admin-card stack">
          <div className="row between">
            <h3>
              <Wand2 size={16} /> Generate study for “{song.title}”
            </h3>
          </div>

          <p className="tiny faint">
            The server writes lyrics, romanisation, pronunciation, translation, vocabulary and the
            full analysis, then flags it as an AI interpretation. Real published lyrics are never
            reproduced: in that case only vocabulary and analysis are returned.
          </p>

          <label className="field-label">
            <span className="row tiny">
              <KeyRound size={13} /> Studio password
            </span>
            <input
              className="input"
              type="password"
              autoComplete="off"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="ADMIN_PASSWORD from the hosting environment"
            />
          </label>

          <label className="field-label">
            Language of the lyrics
            <select
              className="select"
              value={language}
              onChange={() => {}}
              disabled
              title="Change the language in Settings when other languages are supported"
            >
              <option value="ja">Japanese</option>
            </select>
          </label>

          <label className="field-label">
            Extra instructions (optional)
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="e.g. focus on the imagery of the second verse"
            />
          </label>

          <div className="row">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={run}
              disabled={busy || !password}
            >
              <Sparkles size={14} /> {busy ? "Writing…" : "Generate study"}
            </button>
            {study && (
              <button type="button" className="btn btn-primary btn-sm" onClick={apply} disabled={applying}>
                <CheckCircle2 size={14} /> {applying ? "Saving…" : "Save to song"}
              </button>
            )}
          </div>

          {problem && (
            <div className="notice notice-warn stack">
              <strong className="row">
                <AlertTriangle size={15} /> {problem.message}
              </strong>
              {problem.missing?.length > 0 && (
                <p className="tiny">
                  Missing on the server: <code>{problem.missing.join(", ")}</code>
                </p>
              )}
              {problem.hint && <p className="tiny faint">{problem.hint}</p>}
            </div>
          )}

          {study && stats && (
            <div className="stack">
              <div className="row wrap">
                <span className="badge">{stats.lines} lines</span>
                <span className="badge">{stats.vocabulary} words</span>
                <span className="badge">{stats.sections} sections</span>
                <span className="badge">{study.lyricsSource}</span>
              </div>
              {study.analysis.meaning && (
                <article className="analysis-section">
                  <h4>Meaning</h4>
                  <p className="pre-line muted">{study.analysis.meaning}</p>
                </article>
              )}
              {study.analysis.pronunciation_guide && (
                <article className="analysis-section">
                  <h4>Pronunciation</h4>
                  <p className="pre-line muted">{study.analysis.pronunciation_guide}</p>
                </article>
              )}
              <p className="tiny faint">{study.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
