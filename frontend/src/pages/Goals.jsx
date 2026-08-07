import { useEffect, useState } from "react";
import { Plus, Target, Flame, CheckCircle2, Circle, Trash2, Pencil, X, Square, CheckSquare } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { cx, formatDate } from "../lib/utils";

const PERIODS = ["daily", "weekly", "monthly", "yearly", "long_term"];
const PERIOD_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", long_term: "Long-Term" };

export default function Goals() {
  const { toast } = useToast();
  const [tab, setTab] = useState("weekly");
  const [goals, setGoals] = useState(null);
  const [habits, setHabits] = useState(null);
  const [open, setOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(null); // "new" | habit object | null
  const [habitForm, setHabitForm] = useState({ name: "", target_per_week: 7 });
  const [form, setForm] = useState({ title: "", period: "weekly", target_value: 5, unit: "tasks", due_date: "" });

  // Habit management: 'view' (default) | 'edit' (pencils visible) | 'select' (checkboxes, multi-delete)
  const [habitMode, setHabitMode] = useState("view");
  const [selectedHabits, setSelectedHabits] = useState(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmGoal, setConfirmGoal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadGoals = () => api.get("/api/goals").then((d) => setGoals(d.goals));
  const loadHabits = () => api.get("/api/habits").then((d) => setHabits(d.habits));

  useEffect(() => {
    loadGoals();
    loadHabits();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.post("/api/goals", form);
    setForm({ title: "", period: tab, target_value: 5, unit: "tasks", due_date: "" });
    setOpen(false);
    toast("Goal added");
    loadGoals();
  };

  const openNewHabit = () => {
    setHabitForm({ name: "", target_per_week: 7 });
    setHabitOpen("new");
  };

  const saveHabit = async (e) => {
    e.preventDefault();
    if (!habitForm.name.trim()) return;
    if (habitOpen && habitOpen !== "new") {
      await api.put(`/api/habits/${habitOpen.id}`, habitForm);
      toast("Habit updated");
    } else {
      await api.post("/api/habits", habitForm);
      toast("Habit added");
    }
    setHabitOpen(null);
    loadHabits();
  };

  const toggleHabit = async (h) => {
    if (habitMode === "select") {
      setSelectedHabits((prev) => {
        const next = new Set(prev);
        next.has(h.id) ? next.delete(h.id) : next.add(h.id);
        return next;
      });
      return;
    }
    if (habitMode === "edit") {
      setHabitForm({ name: h.name, target_per_week: h.target_per_week });
      setHabitOpen(h);
      return;
    }
    await api.post(`/api/habits/${h.id}/toggle`);
    loadHabits();
  };

  const enterSelectMode = () => {
    setHabitMode((m) => (m === "select" ? "view" : "select"));
    setSelectedHabits(new Set());
  };

  const enterEditMode = () => {
    setHabitMode((m) => (m === "edit" ? "view" : "edit"));
  };

  const confirmDeleteSelected = async () => {
    setDeleting(true);
    try {
      await Promise.all([...selectedHabits].map((id) => api.del(`/api/habits/${id}`)));
      toast(`${selectedHabits.size} habit${selectedHabits.size === 1 ? "" : "s"} deleted`);
      setConfirmBulkDelete(false);
      setHabitMode("view");
      setSelectedHabits(new Set());
      loadHabits();
    } finally {
      setDeleting(false);
    }
  };

  const bumpProgress = async (goal, delta) => {
    const newVal = Math.max(0, Math.min(goal.target_value, goal.current_value + delta));
    const status = newVal >= goal.target_value ? "completed" : "active";
    await api.put(`/api/goals/${goal.id}`, { current_value: newVal, status });
    loadGoals();
  };

  const confirmDeleteGoal = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/goals/${confirmGoal.id}`);
      toast("Goal deleted");
      setConfirmGoal(null);
      loadGoals();
    } finally {
      setDeleting(false);
    }
  };

  const filteredGoals = goals?.filter((g) => g.period === tab) ?? [];

  return (
    <>
      <Topbar
        title="Goals & Habits"
        subtitle="Set targets, build streaks."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Goal</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-5xl space-y-8">
        {/* Habits */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <p className="font-display font-semibold text-sm flex items-center gap-1.5">
              <Flame size={15} className="text-amber-500" /> Daily Habits
            </p>

            {habitMode === "select" ? (
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary !text-rose-500 !py-1.5 !px-3 text-xs"
                  disabled={selectedHabits.size === 0}
                  onClick={() => setConfirmBulkDelete(true)}
                >
                  Delete Selected ({selectedHabits.size})
                </button>
                <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={enterSelectMode}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={openNewHabit}>
                  <Plus size={13} /> Add Habit
                </button>
                <button
                  className={cx("btn-secondary !py-1.5 !px-3 text-xs", habitMode === "edit" && "!bg-accent/15 !text-accent")}
                  onClick={enterEditMode}
                >
                  <Pencil size={13} /> Edit
                </button>
                <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={enterSelectMode}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>

          {habitMode === "edit" && (
            <p className="text-[11px] text-ink-faint mb-2.5 -mt-1">Tap a habit to edit its name or weekly target.</p>
          )}
          {habitMode === "select" && (
            <p className="text-[11px] text-ink-faint mb-2.5 -mt-1">Tap habits to select, then delete them together.</p>
          )}

          {!habits ? (
            <Loader />
          ) : habits.length === 0 ? (
            <p className="text-sm text-ink-faint">No habits yet — add one to start a streak.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {habits.map((h) => {
                const selected = selectedHabits.has(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHabit(h)}
                    className={cx(
                      "card p-3.5 text-left transition-colors relative",
                      habitMode === "view" && h.done_today && "ring-2 ring-accent bg-accent/5",
                      habitMode === "select" && selected && "ring-2 ring-rose-500 bg-rose-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {habitMode === "select" ? (
                        selected ? (
                          <CheckSquare size={17} className="text-rose-500" />
                        ) : (
                          <Square size={17} className="text-ink-faint" />
                        )
                      ) : habitMode === "edit" ? (
                        <Pencil size={15} className="text-accent" />
                      ) : h.done_today ? (
                        <CheckCircle2 size={17} className="text-accent" />
                      ) : (
                        <Circle size={17} className="text-ink-faint" />
                      )}
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <Flame size={11} /> {h.current_streak}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate">{h.name}</p>
                    <p className="text-[11px] text-ink-faint mt-0.5">
                      {h.completed_this_week}/{h.target_per_week} this week
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Goals */}
        <div>
          <div className="flex gap-1.5 mb-4 overflow-x-auto">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setTab(p)}
                className={cx(
                  "px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                  tab === p ? "bg-accent text-white" : "bg-surface-sunken text-ink-muted hover:text-ink"
                )}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>

          {!goals ? (
            <Loader />
          ) : filteredGoals.length === 0 ? (
            <EmptyState icon={Target} title={`No ${PERIOD_LABEL[tab].toLowerCase()} goals`} subtitle="Add one to start tracking progress." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredGoals.map((g) => (
                <div key={g.id} className="card p-4 group">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium pr-2">{g.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {g.status === "completed" && <CheckCircle2 size={16} className="text-emerald-500" />}
                      <button
                        onClick={() => setConfirmGoal(g)}
                        className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-500 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden mb-2.5">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${g.progress_pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span>
                      {g.current_value}/{g.target_value} {g.unit}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button className="btn-icon !w-6 !h-6" onClick={() => bumpProgress(g, -1)}>
                        −
                      </button>
                      <button className="btn-icon !w-6 !h-6" onClick={() => bumpProgress(g, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                  {g.due_date && <p className="text-[11px] text-ink-faint mt-2">Due {formatDate(g.due_date)}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Goal">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Goal title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Period</label>
            <select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target value</label>
              <input
                type="number"
                min="1"
                className="input"
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="tasks, hours…" />
            </div>
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full">
            Add Goal
          </button>
        </form>
      </Modal>

      <Modal open={!!habitOpen} onClose={() => setHabitOpen(null)} title={habitOpen && habitOpen !== "new" ? "Edit Habit" : "Add Habit"}>
        <form onSubmit={saveHabit} className="space-y-4">
          <div>
            <label className="label">Habit name</label>
            <input
              className="input"
              value={habitForm.name}
              onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })}
              placeholder="e.g. Read for 20 minutes"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Target days per week</label>
            <input
              type="number"
              min="1"
              max="7"
              className="input"
              value={habitForm.target_per_week}
              onChange={(e) => setHabitForm({ ...habitForm, target_per_week: parseInt(e.target.value) || 7 })}
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            {habitOpen && habitOpen !== "new" ? "Save Changes" : "Add Habit"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={confirmDeleteSelected}
        loading={deleting}
        title="Delete Habits?"
        message={`This will permanently remove ${selectedHabits.size} habit${selectedHabits.size === 1 ? "" : "s"} and all logged history. This action cannot be undone.`}
      />

      <ConfirmDialog
        open={!!confirmGoal}
        onClose={() => setConfirmGoal(null)}
        onConfirm={confirmDeleteGoal}
        loading={deleting}
        title="Delete Goal?"
        message={`This will permanently remove "${confirmGoal?.title || ""}". This action cannot be undone.`}
      />
    </>
  );
}
