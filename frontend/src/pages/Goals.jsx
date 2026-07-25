import { useEffect, useState } from "react";
import { Plus, Target, Flame, CheckCircle2, Circle, Trash2, Pencil } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { cx, formatDate } from "../lib/utils";

const PERIODS = ["daily", "weekly", "monthly", "yearly", "long_term"];
const PERIOD_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", long_term: "Long-Term" };

export default function Goals() {
  const [tab, setTab] = useState("weekly");
  const [goals, setGoals] = useState(null);
  const [habits, setHabits] = useState(null);
  const [open, setOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [activeHabit, setActiveHabit] = useState(null);
  const [form, setForm] = useState({ title: "", period: "weekly", target_value: 5, unit: "tasks", due_date: "" });
  const [habitForm, setHabitForm] = useState({ name: "", target_per_week: 7 });

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
    loadGoals();
  };

  const openNewHabit = () => {
    setActiveHabit(null);
    setHabitForm({ name: "", target_per_week: 7 });
    setHabitOpen(true);
  };

  const openEditHabit = (h) => {
    setActiveHabit(h);
    setHabitForm({ name: h.name, target_per_week: h.target_per_week });
    setHabitOpen(true);
  };

  const saveHabit = async (e) => {
    e.preventDefault();
    if (!habitForm.name.trim()) return;
    if (activeHabit) {
      await api.put(`/api/habits/${activeHabit.id}`, habitForm);
    } else {
      await api.post("/api/habits", habitForm);
    }
    setHabitOpen(false);
    loadHabits();
  };

  const toggleHabit = async (id) => {
    await api.post(`/api/habits/${id}/toggle`);
    loadHabits();
  };

  const bumpProgress = async (goal, delta) => {
    const newVal = Math.max(0, Math.min(goal.target_value, goal.current_value + delta));
    const status = newVal >= goal.target_value ? "completed" : "active";
    await api.put(`/api/goals/${goal.id}`, { current_value: newVal, status });
    loadGoals();
  };

  const deleteGoal = async (id) => {
    await api.del(`/api/goals/${id}`);
    loadGoals();
  };

  const deleteHabit = async (id) => {
    await api.del(`/api/habits/${id}`);
    loadHabits();
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
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-sm flex items-center gap-1.5">
              <Flame size={15} className="text-amber-500" /> Daily Habits
            </p>
            <button className="text-xs text-accent font-medium hover:underline" onClick={openNewHabit}>
              + Add habit
            </button>
          </div>
          {!habits ? (
            <Loader />
          ) : habits.length === 0 ? (
            <p className="text-sm text-ink-faint">No habits yet — add one to start a streak.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className={cx(
                    "card p-3.5 text-left transition-colors relative group",
                    h.done_today && "ring-2 ring-accent bg-accent/5"
                  )}
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditHabit(h)} className="text-ink-faint hover:text-accent" title="Edit habit">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteHabit(h.id)} className="text-ink-faint hover:text-rose-500" title="Delete habit">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <button onClick={() => toggleHabit(h.id)} className="w-full text-left">
                    <div className="flex items-center justify-between mb-2 pr-4">
                      {h.done_today ? (
                        <CheckCircle2 size={17} className="text-accent" />
                      ) : (
                        <Circle size={17} className="text-ink-faint" />
                      )}
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <Flame size={11} /> {h.current_streak}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate">{h.name}</p>
                    <p className="text-[11px] text-ink-faint mt-0.5">{h.completed_this_week}/{h.target_per_week} this week</p>
                  </button>
                </div>
              ))}
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
                        onClick={() => deleteGoal(g.id)}
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

      <Modal open={habitOpen} onClose={() => setHabitOpen(false)} title={activeHabit ? "Edit Habit" : "Add Habit"}>
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
            {activeHabit ? "Save Changes" : "Add Habit"}
          </button>
        </form>
      </Modal>
    </>
  );
}
