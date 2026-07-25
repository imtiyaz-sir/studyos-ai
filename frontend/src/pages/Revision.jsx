import { useEffect, useState } from "react";
import { RotateCcw, Sparkles, X } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function Revision() {
  const [due, setDue] = useState(null);
  const [active, setActive] = useState(null);
  const [memoryStrength, setMemoryStrength] = useState(70);
  const [confidence, setConfidence] = useState(70);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get("/api/revision/due").then((d) => setDue(d.due));

  useEffect(() => {
    load();
  }, []);

  const complete = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/revision/${active.id}/complete`, { memory_strength: memoryStrength, confidence_level: confidence });
      setActive(null);
      setMemoryStrength(70);
      setConfidence(70);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    await api.del(`/api/revision/${id}`);
    load();
  };

  return (
    <>
      <Topbar title="Revision" subtitle="Spaced repetition — review what's due before you forget it." />

      <div className="px-4 lg:px-8 py-6 max-w-3xl">
        {!due ? (
          <Loader />
        ) : due.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="You're all caught up!"
            subtitle="No revisions due today. Mark topics as completed in Subjects to start their revision cycle."
          />
        ) : (
          <div className="space-y-2.5">
            {due.map((r) => (
              <div key={r.id} className="card p-4 flex items-center gap-3.5 animate-fade-up">
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center shrink-0 font-mono text-xs font-semibold"
                  style={{ backgroundColor: `${r.subject_color}1A`, color: r.subject_color }}
                >
                  R{r.revision_number}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.topic_name}</p>
                  <p className="text-xs text-ink-muted">
                    {r.subject_name} · Scheduled {formatDate(r.scheduled_date)}
                  </p>
                </div>
                <button className="btn-secondary shrink-0" onClick={() => setActive(r)}>
                  <RotateCcw size={14} /> Revise
                </button>
                <button className="btn-icon hover:text-rose-500 shrink-0" onClick={() => remove(r.id)} title="Remove from queue">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={`Revising: ${active?.topic_name || ""}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setActive(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={complete} disabled={submitting}>
              {submitting ? "Saving…" : "Mark Complete"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="label !mb-0">How well did you recall it?</label>
              <span className="text-xs font-mono text-accent">{memoryStrength}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={memoryStrength}
              onChange={(e) => setMemoryStrength(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <p className="text-[11px] text-ink-faint mt-1">
              Below 50% pulls your next revision closer so it doesn't slip away.
            </p>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="label !mb-0">Confidence in this topic</label>
              <span className="text-xs font-mono text-accent">{confidence}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
