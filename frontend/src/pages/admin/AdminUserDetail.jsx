import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, BookOpen, CheckSquare, RotateCcw, Flame, Trophy } from "lucide-react";
import Topbar from "../../components/Topbar";
import AdminTabs from "../../components/AdminTabs";
import Loader from "../../components/Loader";
import StatCard from "../../components/StatCard";
import { api } from "../../lib/api";
import { formatDate, cx } from "../../lib/utils";

export default function AdminUserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/admin/users/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  return (
    <>
      <Topbar title="Admin" subtitle="Private admin panel — not visible to students." />
      <AdminTabs />

      <div className="px-4 lg:px-8 py-6 max-w-3xl">
        <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5">
          <ArrowLeft size={15} /> All users
        </Link>

        {error && <p className="text-sm text-rose-500">{error}</p>}
        {!data ? (
          <Loader />
        ) : (
          <>
            <div className="card p-5 mb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display font-bold text-lg flex items-center gap-2">
                    {data.user.name}
                    {data.user.is_admin && <ShieldCheck size={16} className="text-accent" title="Admin" />}
                  </p>
                  <p className="text-sm text-ink-muted">{data.user.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={cx("badge !py-0.5 !px-2 text-[10px]", data.user.is_verified ? "text-emerald-600 bg-emerald-500/10" : "text-amber-600 bg-amber-500/10")}>
                    {data.user.is_verified ? "Verified" : "Unverified"}
                  </span>
                  {data.user.is_blocked && <span className="badge !py-0.5 !px-2 text-[10px] text-rose-600 bg-rose-500/10">Blocked</span>}
                </div>
              </div>
              <p className="text-xs text-ink-faint mt-3">Joined {formatDate(data.user.created_at)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard icon={Trophy} label="Level" value={data.user.level} accentClass="text-accent bg-accent/10" />
              <StatCard icon={Flame} label="Current Streak" value={`${data.user.current_streak}d`} accentClass="text-amber-600 bg-amber-500/10" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2.5">Activity</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={BookOpen} label="Subjects" value={data.counts.subjects} accentClass="text-emerald-600 bg-emerald-500/10" />
              <StatCard icon={CheckSquare} label="Tasks" value={data.counts.tasks} accentClass="text-purple-600 bg-purple-500/10" />
              <StatCard icon={RotateCcw} label="Revisions Done" value={data.counts.revisions_completed} accentClass="text-accent bg-accent/10" />
              <StatCard icon={Flame} label="Habits" value={data.counts.habits} accentClass="text-amber-600 bg-amber-500/10" />
            </div>
          </>
        )}
      </div>
    </>
  );
}
