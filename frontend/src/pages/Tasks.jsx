import { useEffect, useState } from "react";
import { Plus, CheckSquare, Sunrise, Sun, Sunset, Moon, Trash2 } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { cx, priorityColor, todayISO } from "../lib/utils";

const SLOTS = [
  { key: "morning", label: "Morning", icon: Sunrise },
  { key: "afternoon", label: "Afternoon", icon: Sun },
  { key: "evening", label: "Evening", icon: Sunset },
  { key: "night", label: "Night", icon: Moon },
];

export default function Tasks() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmTask, setConfirmTask] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: "", time_of_day: "morning", priority: "medium", estimated_minutes: 30 });

  const load = () => api.get("/api/tasks", { date: todayISO() }).then((d) => setTasks(d.tasks));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.post("/api/tasks", { ...form, due_date: todayISO() });
    setForm({ title: "", time_of_day: "morning", priority: "medium", estimated_minutes: 30 });
    setOpen(false);
    toast("Task added");
    load();
  };

  const toggleDone = async (t) => {
    await api.put(`/api/tasks/${t.id}`, { status: t.status === "done" ? "pending" : "done" });
    load();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/tasks/${confirmTask.id}`);
      toast("Task deleted");
      setConfirmTask(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const completed = tasks?.filter((t) => t.status === "done").length ?? 0;

  return (
    <>
      <Topbar
        title="Today's Planner"
        subtitle={tasks ? `${completed} of ${tasks.length} tasks done` : "Loading…"}
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Task</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-3xl">
        {!tasks ? (
          <Loader />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Nothing planned for today"
            subtitle="Add a task to start building your daily timeline."
            action={
              <button className="btn-primary" onClick={() => setOpen(true)}>
                <Plus size={16} /> Add Task
              </button>
            }
          />
        ) : (
          <div className="space-y-6">
            {SLOTS.map(({ key, label, icon: Icon }) => {
              const slotTasks = tasks.filter((t) => t.time_of_day === key);
              if (slotTasks.length === 0) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2.5 text-ink-muted">
                    <Icon size={15} />
                    <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
                  </div>
                  <div className="card divide-y divide-black/5 dark:divide-white/5">
                    {slotTasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3 group">
                        <button
                          onClick={() => toggleDone(t)}
                          className={cx(
                            "w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition-colors",
                            t.status === "done" ? "bg-accent border-accent" : "border-black/20 dark:border-white/20"
                          )}
                        >
                          {t.status === "done" && <CheckSquare size={12} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cx("text-sm", t.status === "done" && "line-through text-ink-faint")}>{t.title}</p>
                          {t.description && <p className="text-xs text-ink-muted truncate">{t.description}</p>}
                        </div>
                        <span className="text-[11px] font-mono text-ink-faint hidden sm:inline">{t.estimated_minutes}m</span>
                        <span className={cx("badge !py-0.5 !px-2 text-[10px]", priorityColor[t.priority])}>{t.priority}</span>
                        <button
                          onClick={() => setConfirmTask(t)}
                          className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-500 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Task">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Task title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Time of day</label>
              <select className="input" value={form.time_of_day} onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}>
                {SLOTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Estimated minutes</label>
            <input
              type="number"
              min="5"
              step="5"
              className="input"
              value={form.estimated_minutes}
              onChange={(e) => setForm({ ...form, estimated_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Add Task
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTask}
        onClose={() => setConfirmTask(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Task?"
        message={`This will permanently remove "${confirmTask?.title || ""}". This action cannot be undone.`}
      />
    </>
  );
}
