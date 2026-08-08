import { useEffect, useState } from "react";
import {
  Users, UserCheck, UserX, BookOpen, ListTree, CheckSquare, RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { api } from "../lib/api";

const cards = [
  ["total_users", "Total users", Users],
  ["verified_users", "Verified users", UserCheck],
  ["unverified_users", "Unverified users", UserX],
  ["total_subjects", "Total subjects", BookOpen],
  ["total_topics", "Total topics", ListTree],
  ["total_tasks", "Total tasks", CheckSquare],
  ["total_revisions", "Total revisions", RotateCcw],
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/admin/stats")
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message || "Unable to load admin statistics."));
  }, []);

  return (
    <>
      <Topbar title="Admin Dashboard" subtitle="Private StudyOS AI administration." />
      <div className="px-4 lg:px-8 py-6 max-w-7xl space-y-6">
        <div className="card p-4 lg:p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0">
            <ShieldCheck size={19} />
          </div>
          <div>
            <p className="font-display font-semibold text-sm">Administrator access</p>
            <p className="text-xs text-ink-muted mt-1">
              These statistics come from the existing PostgreSQL database. Sensitive authentication data is never returned.
            </p>
          </div>
        </div>

        {error ? (
          <div className="card p-5 text-sm text-red-500">{error}</div>
        ) : !stats ? (
          <Loader />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {cards.map(([key, label, Icon]) => (
                <StatCard key={key} icon={Icon} label={label} value={stats[key] ?? 0} />
              ))}
            </div>
            <div className="card p-5">
              <p className="font-display font-semibold text-sm">Recent activity</p>
              <p className="text-sm text-ink-muted mt-1">
                {stats.latest_activity_date
                  ? `Latest recorded daily activity: ${stats.latest_activity_date}`
                  : "No daily activity has been recorded yet."}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
