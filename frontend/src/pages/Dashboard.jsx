import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, Flame, Clock, RotateCcw, PenTool, CheckSquare,
  GraduationCap, Sparkles, Quote, Zap,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, YAxis } from "recharts";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import ProgressRing from "../components/ProgressRing";
import { SkeletonStatCards } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, daysUntil, priorityColor } from "../lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-rose-500">Couldn't load your dashboard: {error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <>
        <Topbar title="Welcome back" subtitle="Here's how your studying is going." />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-7xl">
          <SkeletonStatCards count={8} />
        </div>
      </>
    );
  }

  const chartData = (data.daily_trend || []).map((d) => ({
    date: formatDate(d.stat_date, { month: "short", day: "numeric" }),
    score: d.productivity_score,
  }));

  return (
    <>
      <Topbar title={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`} subtitle="Here's how your studying is going." />

      <div className="px-4 lg:px-8 py-6 space-y-6 max-w-7xl">
        {/* Hero row: overall progress + quote */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 lg:p-6 lg:col-span-2 flex items-center gap-5">
            <ProgressRing value={data.overall_progress_pct} size={84} stroke={7} />
            <div>
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Overall Progress</p>
              <p className="font-display font-bold text-2xl mt-0.5">{data.overall_progress_pct}% complete</p>
              <p className="text-sm text-ink-muted mt-1">
                Across all subjects and units — keep the momentum going.
              </p>
            </div>
          </div>
          <div className="card p-5 lg:p-6 bg-gradient-to-br from-accent/10 to-transparent flex flex-col justify-center">
            <Quote size={18} className="text-accent mb-2" />
            <p className="text-sm font-medium leading-snug">{data.quote}</p>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard icon={Flame} label="Current Streak" value={`${data.current_streak}d`} sub={`Best: ${data.longest_streak}d`} accentClass="text-amber-600 bg-amber-500/10" />
          <StatCard icon={Clock} label="Total Study Hours" value={data.total_study_hours} accentClass="text-accent bg-accent/10" />
          <StatCard icon={RotateCcw} label="Revision Due Today" value={data.revisions_due_today} accentClass="text-purple-600 bg-purple-500/10" />
          <StatCard icon={PenTool} label="Practice This Week" value={data.practice_sessions_week} sub={`${data.practice_minutes_week} min`} accentClass="text-emerald-600 bg-emerald-500/10" />
          <StatCard icon={TrendingUp} label="Weekly Progress" value={`${data.weekly_progress_pct}%`} accentClass="text-accent bg-accent/10" />
          <StatCard icon={TrendingUp} label="Monthly Progress" value={`${data.monthly_progress_pct}%`} accentClass="text-purple-600 bg-purple-500/10" />
          <StatCard icon={CheckSquare} label="Pending Tasks" value={data.pending_tasks} accentClass="text-rose-600 bg-rose-500/10" />
          <StatCard icon={Zap} label="Productivity Score" value={data.productivity_score} accentClass="text-amber-600 bg-amber-500/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Productivity trend chart */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-semibold text-sm">Productivity — Last 7 Days</p>
              <Link to="/analytics" className="text-xs text-accent font-medium hover:underline">
                Full analytics →
              </Link>
            </div>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgb(var(--ink-faint))" }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12, border: "none", fontSize: 12,
                      background: "rgb(var(--surface-raised))", boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="rgb(var(--accent))" strokeWidth={2.5} fill="url(#scoreGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={TrendingUp} title="No activity yet" subtitle="Complete tasks and revisions to see your trend." />
            )}
          </div>

          {/* Today's plan */}
          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Today's Study Plan</p>
            {data.today_tasks?.length ? (
              <div className="space-y-2.5">
                {data.today_tasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <span className={`badge ${priorityColor[t.priority]} !px-1.5 !py-0.5`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </span>
                    <p className={`text-sm flex-1 truncate ${t.status === "done" ? "line-through text-ink-faint" : ""}`}>
                      {t.title}
                    </p>
                  </div>
                ))}
                <Link to="/tasks" className="block text-xs text-accent font-medium hover:underline pt-1">
                  View all tasks →
                </Link>
              </div>
            ) : (
              <EmptyState icon={CheckSquare} title="Nothing planned" subtitle="Add tasks to build today's plan." />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Upcoming exams */}
          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Upcoming Exams</p>
            {data.upcoming_exams?.length ? (
              <div className="space-y-3">
                {data.upcoming_exams.map((e) => {
                  const d = daysUntil(e.exam_date);
                  return (
                    <div key={e.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center shrink-0">
                        <GraduationCap size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-xs text-ink-muted">{formatDate(e.exam_date)}</p>
                      </div>
                      {d !== null && (
                        <span className="text-xs font-mono font-medium text-rose-600 dark:text-rose-400 shrink-0">
                          {d >= 0 ? `${d}d` : "past"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={GraduationCap} title="No upcoming exams" subtitle="You're all clear for now." />
            )}
          </div>

          {/* Skill progress */}
          <div className="card p-5">
            <p className="font-display font-semibold text-sm mb-4">Skill Progress</p>
            {data.skills?.length ? (
              <div className="space-y-3.5">
                {data.skills.slice(0, 5).map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <Sparkles size={12} className="text-accent" /> {s.name}
                      </span>
                      <span className="text-xs font-mono text-ink-muted">
                        Lv {s.current_level}/{s.target_level}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${Math.min((s.current_level / s.target_level) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <Link to="/skills" className="block text-xs text-accent font-medium hover:underline pt-1">
                  View all skills →
                </Link>
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="No skills tracked yet" subtitle="Add a skill to start tracking growth." />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
