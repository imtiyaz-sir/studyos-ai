import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckSquare, RotateCcw, Flame, ShieldCheck, UserCheck } from "lucide-react";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { api } from "../lib/api";

export default function AdminUserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/admin/users/${id}`)
      .then(setData)
      .catch((err) => setError(err.message || "Unable to load user."));
  }, [id]);

  if (error) {
    return (
      <>
        <Topbar title="User details" />
        <div className="px-4 lg:px-8 py-6">
          <div className="card p-5 text-sm text-red-500">{error}</div>
        </div>
      </>
    );
  }

  if (!data) return <Loader full />;

  const { user, stats } = data;

  return (
    <>
      <Topbar title="User details" subtitle={user.email} />
      <div className="px-4 lg:px-8 py-6 max-w-7xl space-y-5">
        <Link to="/admin/users" className="btn-secondary w-fit">
          <ArrowLeft size={16} /> Back to users
        </Link>

        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center font-display font-semibold">
              {user.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold">{user.name}</h2>
              <p className="text-sm text-ink-muted break-all">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="badge bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserCheck size={13} /> {user.is_verified ? "Verified" : "Unverified"}
                </span>
                {user.is_admin && (
                  <span className="badge bg-accent/10 text-accent">
                    <ShieldCheck size={13} /> Admin
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 text-xs text-ink-muted space-y-1">
            <p>Account created: {user.created_at || "Not available"}</p>
            <p>Last recorded activity: {stats.last_activity_date || "No activity recorded"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
          <StatCard icon={BookOpen} label="Subjects" value={stats.subjects_count ?? 0} />
          <StatCard icon={CheckSquare} label="Topics" value={stats.topics_count ?? 0} />
          <StatCard icon={CheckSquare} label="Tasks" value={stats.tasks_count ?? 0} />
          <StatCard icon={RotateCcw} label="Revisions" value={stats.revisions_count ?? 0} />
          <StatCard icon={Flame} label="Habits" value={stats.habits_count ?? 0} />
        </div>
      </div>
    </>
  );
}
