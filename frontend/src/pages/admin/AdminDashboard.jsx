import { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Users, BadgeCheck, MailWarning, Ban, Activity, UserPlus, BookOpen, ListTree, CheckSquare, RotateCcw } from "lucide-react";
import Topbar from "../../components/Topbar";
import AdminTabs from "../../components/AdminTabs";
import StatCard from "../../components/StatCard";
import { SkeletonStatCards } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/utils";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Topbar title="Admin" subtitle="Private admin panel — not visible to students." />
      <AdminTabs />

      <div className="px-4 lg:px-8 py-6 space-y-6 max-w-6xl">
        {error && <p className="text-sm text-rose-500">{error}</p>}

        {!stats ? (
          <SkeletonStatCards count={8} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <StatCard icon={Users} label="Total Users" value={stats.total_users} accentClass="text-accent bg-accent/10" />
              <StatCard icon={BadgeCheck} label="Verified" value={stats.verified_users} accentClass="text-emerald-600 bg-emerald-500/10" />
              <StatCard icon={MailWarning} label="Unverified" value={stats.unverified_users} accentClass="text-amber-600 bg-amber-500/10" />
              <StatCard icon={Ban} label="Blocked" value={stats.blocked_users} accentClass="text-rose-600 bg-rose-500/10" />
              <StatCard icon={Activity} label="Active (7d)" value={stats.active_users_7d} accentClass="text-purple-600 bg-purple-500/10" />
              <StatCard icon={UserPlus} label="New Signups (30d)" value={stats.new_registrations_30d} accentClass="text-accent bg-accent/10" />
              <StatCard icon={BookOpen} label="Total Subjects" value={stats.total_subjects} accentClass="text-emerald-600 bg-emerald-500/10" />
              <StatCard icon={ListTree} label="Total Topics" value={stats.total_topics} accentClass="text-purple-600 bg-purple-500/10" />
              <StatCard icon={CheckSquare} label="Total Tasks" value={stats.total_tasks} accentClass="text-amber-600 bg-amber-500/10" />
              <StatCard icon={RotateCcw} label="Revisions Completed" value={stats.total_revisions_completed} accentClass="text-accent bg-accent/10" />
            </div>

            <div className="card p-5">
              <p className="font-display font-semibold text-sm mb-4">Signups — Last 14 Days</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.signups_series} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatDate(v)}
                    tick={{ fontSize: 10, fill: "rgb(var(--ink-faint))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(v) => formatDate(v)}
                    contentStyle={{ borderRadius: 12, border: "none", fontSize: 12, background: "rgb(var(--surface-raised))", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
                  />
                  <Bar dataKey="count" fill="rgb(var(--accent))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </>
  );
}
