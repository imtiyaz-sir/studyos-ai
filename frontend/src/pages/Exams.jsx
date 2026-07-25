import { useEffect, useState } from "react";
import { Plus, GraduationCap, Trash2, Pencil } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { formatDate, daysUntil, cx } from "../lib/utils";

export default function Exams() {
  const [exams, setExams] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ title: "", exam_date: "", status: "upcoming", year: "", marks_scored: "", marks_total: "" });

  const load = () => api.get("/api/exams").then((d) => setExams(d.exams));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setActive(null);
    setForm({ title: "", exam_date: "", status: "upcoming", year: "", marks_scored: "", marks_total: "" });
    setOpen(true);
  };

  const openEdit = (e) => {
    setActive(e);
    setForm({
      title: e.title,
      exam_date: e.exam_date || "",
      status: e.status,
      year: e.year || "",
      marks_scored: e.marks_scored ?? "",
      marks_total: e.marks_total ?? "",
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (active) {
      await api.put(`/api/exams/${active.id}`, form);
    } else {
      await api.post("/api/exams", form);
    }
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    await api.del(`/api/exams/${id}`);
    load();
  };

  const upcoming = exams?.filter((e) => e.status === "upcoming") ?? [];
  const completed = exams?.filter((e) => e.status === "completed") ?? [];

  return (
    <>
      <Topbar
        title="Exams"
        subtitle="Upcoming exams and previous year papers."
        actions={
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Exam</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-4xl space-y-8">
        {!exams ? (
          <Loader />
        ) : exams.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No exams yet" subtitle="Add an upcoming exam or a previous year paper to track." />
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2.5">Upcoming</p>
              {upcoming.length === 0 ? (
                <p className="text-sm text-ink-faint">Nothing upcoming.</p>
              ) : (
                <div className="space-y-2.5">
                  {upcoming.map((e) => {
                    const d = daysUntil(e.exam_date);
                    return (
                      <div key={e.id} className="card p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center shrink-0">
                          <GraduationCap size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className="text-xs text-ink-muted">{e.exam_date ? formatDate(e.exam_date) : "No date set"}</p>
                        </div>
                        {d !== null && (
                          <span className="text-xs font-mono font-medium text-rose-600 dark:text-rose-400 shrink-0">
                            {d >= 0 ? `${d}d left` : "past due"}
                          </span>
                        )}
                        <button onClick={() => openEdit(e)} className="btn-icon shrink-0">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(e.id)} className="btn-icon hover:text-rose-500 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2.5">Previous Year Papers</p>
              {completed.length === 0 ? (
                <p className="text-sm text-ink-faint">No completed papers logged.</p>
              ) : (
                <div className="card divide-y divide-black/5 dark:divide-white/5">
                  {completed.map((e) => {
                    const pct = e.marks_total ? Math.round((e.marks_scored / e.marks_total) * 100) : null;
                    return (
                      <div key={e.id} className="flex items-center gap-3.5 px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {e.title} {e.year ? `(${e.year})` : ""}
                          </p>
                          {e.university && <p className="text-xs text-ink-muted">{e.university}</p>}
                        </div>
                        {pct !== null && (
                          <span
                            className={cx(
                              "text-sm font-mono font-semibold shrink-0",
                              pct >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {e.marks_scored}/{e.marks_total}
                          </span>
                        )}
                        <button onClick={() => openEdit(e)} className="btn-icon shrink-0">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(e.id)} className="btn-icon hover:text-rose-500 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={active ? "Edit Exam" : "Add Exam"}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed (previous year paper)</option>
            </select>
          </div>
          {form.status === "upcoming" ? (
            <div>
              <label className="label">Exam date</label>
              <input type="date" className="input" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Year</label>
                  <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                </div>
                <div>
                  <label className="label">Marks (scored/total)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      className="input"
                      placeholder="Scored"
                      value={form.marks_scored}
                      onChange={(e) => setForm({ ...form, marks_scored: e.target.value })}
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder="Total"
                      value={form.marks_total}
                      onChange={(e) => setForm({ ...form, marks_total: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          <button type="submit" className="btn-primary w-full">
            {active ? "Save Changes" : "Add Exam"}
          </button>
        </form>
      </Modal>
    </>
  );
}
