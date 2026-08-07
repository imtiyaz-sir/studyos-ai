import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  fontSize: 12,
  background: "rgb(var(--surface-raised))",
  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
};

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/dashboard/analytics").then(setData);
  }, []);

  if (!data) return <Loader full />;

  const trend = (data.daily_stats || []).map((d) => ({
    date: formatDate(d.stat_date),
    minutes: d.study_minutes,
    score: d.productivity_score,
  }));

  return (
    <>
      <Topbar title="Analytics" subtitle="Your consistency and progress, visualized." />

      <div className="px-4 lg:px-8 py-6 max-w-6xl space-y-5">
        <div className="card p-5">
          <p className="font-display font-semibold text-sm mb-4">Study Minutes — Last 90 Days</p>
          {trend.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-black/5 dark:stroke-white/5" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgb(var(--ink-faint))" }} axisLine={false} tickLine={false} interval={Math.ceil(trend.length / 10)} />
                <YAxis tick={{ fontSize: 10, fill: "rgb(var(--ink-faint))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="minutes" fill="rgb(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No data yet" subtitle="Complete tasks and revisions to build your history." />
          )}
        </div>

        <div className="card p-5">
          <p className="font-display font-semibold text-sm mb-4">Productivity Score Trend</p>
          {trend.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-black/5 dark:stroke-white/5" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgb(var(--ink-faint))" }} axisLine={false} tickLine={false} interval={Math.ceil(trend.length / 10)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgb(var(--ink-faint))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="score" stroke="rgb(var(--accent))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No data yet" subtitle="Your productivity trend will appear here." />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Subject Progress</p>
            {data.subject_progress?.length ? (
              <div className="space-y-3.5">
                {data.subject_progress.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="text-xs font-mono text-ink-muted">{s.completion_pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.completion_pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">No subjects yet.</p>
            )}
          </div>

          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Habit Streaks</p>
            {data.habits?.length ? (
              <div className="space-y-3">
                {data.habits.map((h) => (
                  <div key={h.name} className="flex items-center justify-between">
                    <span className="text-sm">{h.name}</span>
                    <span className="text-xs font-mono text-ink-muted">
                      {h.current_streak}d current · {h.longest_streak}d best
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">No habits tracked yet.</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <p className="font-display font-semibold text-sm mb-4">Goal Completion by Period</p>
          {Object.keys(data.goal_completion || {}).length ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(data.goal_completion).map(([period, c]) => (
                <div key={period} className="text-center p-3 rounded-xl bg-surface-sunken">
                  <p className="font-mono text-lg font-semibold">
                    {c.completed}/{c.total}
                  </p>
                  <p className="text-[11px] text-ink-muted capitalize mt-0.5">{period.replace("_", " ")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">No goals tracked yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
