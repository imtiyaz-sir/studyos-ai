import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, ChevronRight } from "lucide-react";
import Topbar from "../components/Topbar";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import ProgressRing from "../components/ProgressRing";
import { api } from "../lib/api";

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"];

export default function Subjects() {
  const [subjects, setSubjects] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", semester: "", color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/api/subjects").then((d) => setSubjects(d.subjects));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/subjects", form);
      setForm({ name: "", semester: "", color: COLORS[0] });
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar
        title="Subjects"
        subtitle="Your full syllabus, organized by subject."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Subject</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-7xl">
        {!subjects ? (
          <Loader />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            subtitle="Add your first subject to start building your syllabus tracker."
            action={
              <button className="btn-primary" onClick={() => setOpen(true)}>
                <Plus size={16} /> Add Subject
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {subjects.map((s) => (
              <Link
                key={s.id}
                to={`/subjects/${s.id}`}
                className="card p-5 hover:shadow-soft transition-shadow group animate-fade-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                      style={{ backgroundColor: `${s.color}1A`, color: s.color }}
                    >
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm leading-tight">{s.name}</p>
                      {s.semester && <p className="text-xs text-ink-muted mt-0.5">{s.semester}</p>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-ink-faint group-hover:translate-x-0.5 transition-transform mt-1" />
                </div>

                <div className="flex items-center justify-between mt-5">
                  <div className="text-xs text-ink-muted space-y-0.5">
                    <p>{s.unit_count} units</p>
                    <p>{s.topic_count} topics</p>
                  </div>
                  <ProgressRing value={s.completion_pct} size={52} stroke={5} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Subject">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Subject name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Data Structures & Algorithms"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Semester (optional)</label>
            <input
              className="input"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              placeholder="e.g. Semester 5"
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className="w-8 h-8 rounded-full grid place-items-center"
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
            {saving ? "Adding…" : "Add Subject"}
          </button>
        </form>
      </Modal>
    </>
  );
}
