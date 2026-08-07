import { useEffect, useState } from "react";
import { Plus, PenTool, Target, Clock, TrendingUp, Trash2, Pencil } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../lib/utils";

const TYPES = ["mcq", "theory", "coding", "assignment", "lab", "project"];

export default function Practice() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState(null);
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [confirmSession, setConfirmSession] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ type: "mcq", total_questions: 10, correct_answers: 8, duration_minutes: 20 });

  const load = () => {
    api.get("/api/practice").then((d) => setSessions(d.sessions));
    api.get("/api/practice/stats").then(setStats);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setActive(null);
    setForm({ type: "mcq", total_questions: 10, correct_answers: 8, duration_minutes: 20 });
    setOpen(true);
  };

  const openEdit = (s) => {
    setActive(s);
    setForm({ type: s.type, total_questions: s.total_questions, correct_answers: s.correct_answers, duration_minutes: s.duration_minutes });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (active) {
      await api.put(`/api/practice/${active.id}`, form);
      toast("Session updated");
    } else {
      await api.post("/api/practice", form);
      toast("Session logged");
    }
    setOpen(false);
    load();
  };

  const askDelete = () => {
    setConfirmSession(active);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/practice/${confirmSession.id}`);
      toast("Session deleted");
      setConfirmSession(null);
      setOpen(false);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Topbar
        title="Practice Tracker"
        subtitle="MCQs, coding, assignments — log every rep."
        actions={
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16} /> <span className="hidden sm:inline">Log Session</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-4xl space-y-6">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Target} label="Total Sessions" value={stats.total_sessions} accentClass="text-accent bg-accent/10" />
            <StatCard icon={TrendingUp} label="Accuracy" value={`${stats.accuracy_pct}%`} accentClass="text-emerald-600 bg-emerald-500/10" />
            <StatCard icon={PenTool} label="Questions Attempted" value={stats.total_questions} accentClass="text-purple-600 bg-purple-500/10" />
            <StatCard icon={Clock} label="Practice Minutes" value={stats.total_practice_minutes} accentClass="text-amber-600 bg-amber-500/10" />
          </div>
        )}

        {!sessions ? (
          <Loader />
        ) : sessions.length === 0 ? (
          <EmptyState icon={PenTool} title="No practice sessions yet" subtitle="Log your first MCQ set, coding round, or assignment." />
        ) : (
          <div className="card divide-y divide-black/5 dark:divide-white/5">
            {sessions.map((s) => {
              const acc = s.total_questions ? Math.round((s.correct_answers / s.total_questions) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer hover:bg-surface-sunken/50" onClick={() => openEdit(s)}>
                  <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0 uppercase text-[10px] font-bold">
                    {s.type.slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">{s.type} {s.topic_name ? `· ${s.topic_name}` : ""}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(s.session_date)} · {s.duration_minutes} min
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold">{acc}%</p>
                    <p className="text-[11px] text-ink-faint">
                      {s.correct_answers}/{s.total_questions}
                    </p>
                  </div>
                  <Pencil size={13} className="text-ink-faint shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={active ? "Edit Practice Session" : "Log Practice Session"}
        footer={
          active && (
            <button className="btn-secondary !text-rose-500" onClick={askDelete}>
              <Trash2 size={14} /> Delete
            </button>
          )
        }
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Total questions</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.total_questions}
                onChange={(e) => setForm({ ...form, total_questions: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Correct answers</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.correct_answers}
                onChange={(e) => setForm({ ...form, correct_answers: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input
              type="number"
              min="0"
              className="input"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            {active ? "Save Changes" : "Log Session"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmSession}
        onClose={() => setConfirmSession(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Practice Session?"
        message="This will permanently remove this logged session. This action cannot be undone."
      />
    </>
  );
}
