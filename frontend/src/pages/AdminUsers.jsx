import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, ShieldCheck, Shield, UserCheck, UserX } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import { api } from "../lib/api";
import { cx } from "../lib/utils";

export default function AdminUsers() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    api.get("/api/admin/users", { page, per_page: 20, search })
      .then(setData)
      .catch((err) => setError(err.message || "Unable to load users."));
  };

  useEffect(() => {
    load();
  }, [page, search]);

  return (
    <>
      <Topbar title="Users" subtitle="Manage and inspect StudyOS AI accounts." />
      <div className="px-4 lg:px-8 py-6 max-w-7xl space-y-4">
        <div className="relative max-w-xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input !pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {error ? (
          <div className="card p-5 text-sm text-red-500">{error}</div>
        ) : !data ? (
          <Loader />
        ) : data.users.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-muted">No users found.</div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted border-b border-black/5 dark:border-white/5">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Verification</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-surface-sunken/50">
                        <td className="px-4 py-3">
                          <Link to={`/admin/users/${u.id}`} className="block min-w-48 hover:text-accent">
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-ink-muted mt-0.5">{u.email}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cx(
                            "badge",
                            u.is_verified ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            {u.is_verified ? <UserCheck size={13} /> : <UserX size={13} />}
                            {u.is_verified ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cx(
                            "badge",
                            u.is_admin ? "bg-accent/10 text-accent" : "bg-surface-sunken text-ink-muted"
                          )}>
                            {u.is_admin ? <ShieldCheck size={13} /> : <Shield size={13} />}
                            {u.is_admin ? "Admin" : "Student"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-muted">{u.created_at || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted">
                Page {data.pagination.page} of {Math.max(1, data.pagination.pages)} · {data.pagination.total} users
              </p>
              <div className="flex gap-1">
                <button
                  className="btn-icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  className="btn-icon"
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
