import { useEffect, useMemo, useState } from "react";
import {
  RotateCcw, Sparkles, Flame, CheckCircle2, AlertCircle, Clock, Trophy,
  TrendingUp, Plus, X, Award, ChevronDown, Search,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import StatCard from "../components/StatCard";
import Heatmap from "../components/Heatmap";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { cx, formatDate } from "../lib/utils";

const TABS = [
  { key: "overdue", label: "Overdue" },
  { key: "due_today", label: "Due Today" },
  { key: "upcoming", label: "Upcoming" },
];

const DIFFICULTY_COLOR = {
  easy: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  medium: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  hard: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
};

export default function Revision() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("due_today");
  const [active, setActive] = useState(null); // revision being completed
  const [memoryStrength, setMemoryStrength] = useState(70);
  const [confidence, setConfidence] = useState(70);
  const [difficulty, setDifficulty] = useState("medium");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Add-to-revision picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allTopics, setAllTopics] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const load = () => api.get("/api/revision/dashboard").then((d) => {
    setData(d);
    if (d.counts.overdue > 0) setTab("overdue");
    else if (d.counts.due_today > 0) setTab("due_today");
    else setTab("upcoming");
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openComplete = (r) => {
    setActive(r);
    setMemoryStrength(70);
    setConfidence(70);
    setDifficulty(r.difficulty || "medium");
    setNotes(r.notes || "");
  };

  const complete = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/revision/${active.id}/complete`, {
        memory_strength: memoryStrength,
        confidence_level: confidence,
        difficulty,
        notes,
      });
      toast("Revision completed — nice work!");
      setActive(null);
      load();
    } catch (err) {
      toast(err.message || "Couldn't complete this revision — please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteRevision = async () => {
    setRemoving(true);
    try {
      await api.del(`/api/revision/${confirmRemove.id}`);
      toast("Removed from revision queue");
      setConfirmRemove(null);
      load();
    } finally {
      setRemoving(false);
    }
  };

  const openPicker = () => {
    setPickerOpen(true);
    if (!allTopics) api.get("/api/subjects/topics/all").then((d) => setAllTopics(d.topics));
  };

  const addToRevision = async (topic) => {
    await api.post(`/api/revision/topic/${topic.id}/schedule`);
    toast(`"${topic.name}" added to revision`);
    load();
  };

  const filteredPicker = useMemo(() => {
    if (!allTopics) return [];
    if (!pickerSearch) return allTopics;
    return allTopics.filter((t) => t.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  }, [allTopics, pickerSearch]);

  if (!data) return <Loader full />;

  const list = data[tab] || [];
  const weeklyGoal = (data.daily_goal || 5) * 7;
  const weeklyPct = Math.min(100, Math.round((data.weekly_completed / weeklyGoal) * 100));
  const todayPct = Math.min(100, Math.round((data.today_completed / (data.daily_goal || 5)) * 100));

  return (
    <>
      <Topbar
        title="Revision"
        subtitle="Spaced repetition — plan, track, and master every topic."
        actions={
          <button className="btn-primary" onClick={openPicker}>
            <Plus size={16} /> <span className="hidden sm:inline">Add to Revision</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-6xl space-y-6">
        {/* Reminder banner */}
        {(data.counts.overdue > 0 || data.counts.due_today > 0) && (
          <div
            className={cx(
              "rounded-2xl px-4 py-3.5 flex items-center gap-3 animate-fade-up",
              data.counts.overdue > 0 ? "bg-rose-500/10" : "bg-accent/10"
            )}
          >
            <AlertCircle size={18} className={data.counts.overdue > 0 ? "text-rose-500 shrink-0" : "text-accent shrink-0"} />
            <p className="text-sm font-medium flex-1">
              {data.counts.overdue > 0
                ? `${data.counts.overdue} revision${data.counts.overdue === 1 ? " is" : "s are"} overdue — catch up before they pile up.`
                : `${data.counts.due_today} revision${data.counts.due_today === 1 ? "" : "s"} due today. Keep your ${data.revision_streak}-day streak alive!`}
            </p>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
          <StatCard icon={AlertCircle} label="Overdue" value={data.counts.overdue} accentClass="text-rose-600 bg-rose-500/10" />
          <StatCard icon={Clock} label="Due Today" value={data.counts.due_today} accentClass="text-accent bg-accent/10" />
          <StatCard icon={TrendingUp} label="Upcoming (7d)" value={data.counts.upcoming} accentClass="text-purple-600 bg-purple-500/10" />
          <StatCard icon={Flame} label="Revision Streak" value={`${data.revision_streak}d`} accentClass="text-amber-600 bg-amber-500/10" />
          <StatCard icon={CheckCircle2} label="Total Completed" value={data.total_completed} accentClass="text-emerald-600 bg-emerald-500/10" />
        </div>

        {/* Goal progress + monthly chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Progress</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-ink-muted">Today's goal</span>
                  <span className="font-mono">{data.today_completed}/{data.daily_goal}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${todayPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-ink-muted">This week</span>
                  <span className="font-mono">{data.weekly_completed}/{weeklyGoal}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${weeklyPct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
                <Trophy size={13} className="text-amber-500" /> Level {data.level} · {data.xp} XP
              </div>
            </div>
          </div>

          <div className="card p-5 lg:col-span-2">
            <p className="font-display font-semibold text-sm mb-4">Monthly Revision Activity</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.monthly_series} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <Tooltip
                  labelFormatter={(v) => formatDate(v)}
                  formatter={(v) => [`${v} revision${v === 1 ? "" : "s"}`, ""]}
                  contentStyle={{ borderRadius: 12, border: "none", fontSize: 12, background: "rgb(var(--surface-raised))", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
                />
                <Bar dataKey="count" fill="rgb(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap */}
        <div className="card p-5">
          <p className="font-display font-semibold text-sm mb-4">Revision Heatmap — Past Year</p>
          <Heatmap data={data.heatmap} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Subject-wise completion */}
          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Subject-wise Mastery</p>
            {data.subject_completion.length ? (
              <div className="space-y-3.5">
                {data.subject_completion.map((s) => (
                  <div key={s.subject_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
                      </span>
                      <span className="text-xs font-mono text-ink-muted">{s.mastery_pct}% mastery</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.mastery_pct}%`, backgroundColor: s.color }} />
                    </div>
                    <p className="text-[11px] text-ink-faint mt-1">
                      {s.completed_topics}/{s.total_topics} topics complete · {s.total_revisions} revisions done
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">Add subjects to see mastery breakdown.</p>
            )}
          </div>

          {/* Badges */}
          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Achievements</p>
            <div className="grid grid-cols-3 gap-3">
              {data.badges.map((b) => (
                <div
                  key={b.key}
                  title={b.description}
                  className={cx(
                    "flex flex-col items-center text-center gap-1.5 p-2.5 rounded-xl",
                    b.earned ? "bg-amber-500/10" : "bg-surface-sunken opacity-50"
                  )}
                >
                  <Award size={20} className={b.earned ? "text-amber-500" : "text-ink-faint"} />
                  <span className="text-[10px] font-medium leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Queue tabs */}
        <div>
          <div className="flex gap-1.5 mb-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cx(
                  "px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5",
                  tab === t.key ? "bg-accent text-white" : "bg-surface-sunken text-ink-muted hover:text-ink"
                )}
              >
                {t.label} <span className="font-mono opacity-70">({data.counts[t.key]})</span>
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing here" subtitle="You're all caught up in this category." />
          ) : (
            <div className="space-y-2.5">
              {list.map((r) => (
                <RevisionCard key={r.id} r={r} onComplete={() => openComplete(r)} onRemove={() => setConfirmRemove(r)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete revision modal */}
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
            <input type="range" min="0" max="100" value={memoryStrength} onChange={(e) => setMemoryStrength(parseInt(e.target.value))} className="w-full accent-accent" />
            <p className="text-[11px] text-ink-faint mt-1">Below 50% pulls your next revision closer so it doesn't slip away.</p>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="label !mb-0">Confidence in this topic</label>
              <span className="text-xs font-mono text-accent">{confidence}%</span>
            </div>
            <input type="range" min="0" max="100" value={confidence} onChange={(e) => setConfidence(parseInt(e.target.value))} className="w-full accent-accent" />
          </div>
          <div>
            <label className="label">Difficulty</label>
            <div className="flex gap-2">
              {["easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={cx(
                    "flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition-colors",
                    difficulty === d ? "border-accent bg-accent/10 text-accent" : "border-black/10 dark:border-white/10 text-ink-muted"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input min-h-[80px] text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember for next time…"
            />
          </div>
        </div>
      </Modal>

      {/* Add-to-revision picker */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add Topic to Revision">
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input className="input !pl-9" placeholder="Search topics…" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {!allTopics ? (
              <Loader />
            ) : filteredPicker.length === 0 ? (
              <p className="text-sm text-ink-faint text-center py-6">No topics found.</p>
            ) : (
              filteredPicker.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addToRevision(t)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-sunken text-left"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.subject_color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-ink-muted">{t.subject_name}</p>
                  </div>
                  <Plus size={15} className="text-accent shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={confirmDeleteRevision}
        loading={removing}
        title="Remove from Revision Queue?"
        message={`This will remove this scheduled revision for "${confirmRemove?.topic_name || ""}". This action cannot be undone.`}
      />
    </>
  );
}

function RevisionCard({ r, onComplete, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-center gap-3.5">
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
        {r.difficulty && (
          <span className={cx("badge !py-0.5 !px-2 text-[10px] hidden sm:inline-flex", DIFFICULTY_COLOR[r.difficulty])}>{r.difficulty}</span>
        )}
        <button className="btn-secondary shrink-0" onClick={onComplete}>
          <RotateCcw size={14} /> Revise
        </button>
        <button className="btn-icon hover:text-rose-500 shrink-0" onClick={onRemove} title="Remove">
          <X size={15} />
        </button>
        <button className="btn-icon shrink-0" onClick={() => setExpanded((x) => !x)} title="Notes">
          <ChevronDown size={15} className={cx("transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
          <p className="text-xs text-ink-muted">{r.notes || "No notes yet — add some when you complete this revision."}</p>
        </div>
      )}
    </div>
  );
}
