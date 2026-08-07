import { useState } from "react";
import { Upload, FileText, ChevronDown, Trash2, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { cx } from "../lib/utils";

export default function ImportSyllabusModal({ open, onClose, onImported }) {
  const [step, setStep] = useState("input"); // input | preview
  const [mode, setMode] = useState("text"); // text | pdf
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const [subjectName, setSubjectName] = useState("");
  const [units, setUnits] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  const reset = () => {
    setStep("input");
    setMode("text");
    setText("");
    setFile(null);
    setError("");
    setSubjectName("");
    setUnits([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const parse = async () => {
    setError("");
    setParsing(true);
    try {
      const result =
        mode === "pdf"
          ? await api.postFile("/api/preview/syllabus", file)
          : await api.post("/api/preview/text", { text });

      if (!result.units?.length) {
        setError("Couldn't detect any units in that content — try pasting more of the syllabus, or check the PDF has selectable text (not a scanned image).");
        return;
      }
      setSubjectName(result.subject || "Imported Subject");
      setUnits(
        result.units.map((u) => ({
          ...u,
          selected: u.selected !== false,
          topics: (u.topics || []).map((t) => ({ ...t, selected: true })),
        }))
      );
      setStep("preview");
    } catch (err) {
      setError(err.message || "Couldn't parse that content.");
    } finally {
      setParsing(false);
    }
  };

  const confirmImport = async () => {
    setImporting(true);
    setError("");
    try {
      const payload = {
        subject: subjectName,
        units: units
          .filter((u) => u.selected)
          .map((u) => ({
            name: u.name,
            selected: true,
            topics: u.topics.filter((t) => t.selected).map((t) => ({ title: t.title, subtopics: t.subtopics || [] })),
          })),
      };
      const result = await api.post("/api/import/syllabus", payload);
      onImported(result);
      close();
    } catch (err) {
      setError(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const updateUnit = (i, patch) => setUnits((u) => u.map((unit, idx) => (idx === i ? { ...unit, ...patch } : unit)));
  const updateTopic = (ui, ti, patch) =>
    setUnits((u) =>
      u.map((unit, idx) =>
        idx !== ui ? unit : { ...unit, topics: unit.topics.map((t, tIdx) => (tIdx === ti ? { ...t, ...patch } : t)) }
      )
    );
  const removeTopic = (ui, ti) =>
    setUnits((u) => u.map((unit, idx) => (idx !== ui ? unit : { ...unit, topics: unit.topics.filter((_, tIdx) => tIdx !== ti) })));
  const removeUnit = (i) => setUnits((u) => u.filter((_, idx) => idx !== i));

  const selectedUnitCount = units.filter((u) => u.selected).length;
  const selectedTopicCount = units.filter((u) => u.selected).reduce((sum, u) => sum + u.topics.filter((t) => t.selected).length, 0);

  return (
    <Modal open={open} onClose={close} title={step === "input" ? "Import Syllabus" : "Preview & Confirm"}>
      {step === "input" && (
        <div className="space-y-4">
          <div className="flex rounded-xl bg-surface-sunken p-1">
            {[
              { key: "text", label: "Paste Text", icon: FileText },
              { key: "pdf", label: "Upload PDF", icon: Upload },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={cx(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  mode === key ? "bg-surface-raised shadow-softer text-ink" : "text-ink-muted"
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <div>
              <label className="label">Paste your syllabus</label>
              <textarea
                className="input min-h-[220px] text-sm font-mono"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"UNIT I: INTRODUCTION\nMeaning of Financial System\nComponents of Financial System\n..."}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label className="label">Upload a PDF</label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl py-10 cursor-pointer hover:border-accent/40 transition-colors">
                <Upload size={22} className="text-ink-faint" />
                <span className="text-sm text-ink-muted">{file ? file.name : "Click to choose a PDF"}</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button
            onClick={parse}
            disabled={parsing || (mode === "text" ? !text.trim() : !file)}
            className="btn-primary w-full"
          >
            {parsing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {parsing ? "Parsing…" : "Parse Syllabus"}
          </button>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <button onClick={() => setStep("input")} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
            <ArrowLeft size={13} /> Back
          </button>

          <div>
            <label className="label">Subject name</label>
            <input className="input" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
          </div>

          <p className="text-xs text-ink-muted">
            {selectedUnitCount} unit{selectedUnitCount === 1 ? "" : "s"}, {selectedTopicCount} topic{selectedTopicCount === 1 ? "" : "s"} selected — uncheck anything you don't want, edit names inline.
          </p>

          <div className="max-h-80 overflow-y-auto space-y-2 -mx-1 px-1">
            {units.map((unit, ui) => (
              <div key={ui} className="rounded-xl border border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={unit.selected}
                    onChange={(e) => updateUnit(ui, { selected: e.target.checked })}
                    className="rounded accent-accent shrink-0"
                  />
                  <input
                    className="flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none"
                    value={unit.name}
                    onChange={(e) => updateUnit(ui, { name: e.target.value })}
                  />
                  <span className="text-[11px] text-ink-faint shrink-0">{unit.topics.length} topics</span>
                  <button onClick={() => removeUnit(ui)} className="text-ink-faint hover:text-rose-500 shrink-0">
                    <Trash2 size={13} />
                  </button>
                  <button onClick={() => setCollapsed((c) => ({ ...c, [ui]: !c[ui] }))} className="text-ink-faint shrink-0">
                    <ChevronDown size={14} className={cx("transition-transform", collapsed[ui] && "-rotate-90")} />
                  </button>
                </div>
                {!collapsed[ui] && (
                  <div className="border-t border-black/5 dark:border-white/10 px-3 py-1.5 space-y-1">
                    {unit.topics.map((topic, ti) => (
                      <div key={ti} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={topic.selected}
                          onChange={(e) => updateTopic(ui, ti, { selected: e.target.checked })}
                          className="rounded accent-accent shrink-0"
                        />
                        <input
                          className="flex-1 min-w-0 bg-transparent text-[13px] text-ink-muted focus:outline-none"
                          value={topic.title}
                          onChange={(e) => updateTopic(ui, ti, { title: e.target.value })}
                        />
                        {topic.subtopics?.length > 0 && (
                          <span className="text-[10px] text-ink-faint shrink-0">+{topic.subtopics.length} sub</span>
                        )}
                        <button onClick={() => removeTopic(ui, ti)} className="text-ink-faint hover:text-rose-500 shrink-0">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                    {unit.topics.length === 0 && <p className="text-xs text-ink-faint py-2">No topics detected in this unit.</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button onClick={confirmImport} disabled={importing || selectedUnitCount === 0} className="btn-primary w-full">
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {importing ? "Importing…" : `Import ${selectedUnitCount} Unit${selectedUnitCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </Modal>
  );
}
