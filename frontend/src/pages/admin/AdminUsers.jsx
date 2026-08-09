import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";
import Topbar from "../../components/Topbar";
import AdminTabs from "../../components/AdminTabs";
import ConfirmDialog from "../../components/ConfirmDialog";
import { SkeletonList } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { cx, formatDate } from "../../lib/utils";

export default function AdminUsers() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [confirmBlock, setConfirmBlock] = useState(null);
  const [working, setWorking] = useState(false);

  const load = () => api.get("/api/admin/users", { q, page }).then(setData);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    setPage(1);
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleBlock = async (user) => {
    if (!user.is_blocked) {
      setConfirmBlock(user);
      return;
    }
    await api.put(`/api/admin/users/${user.id}/unblock`);
    toast(`${user.name} unblocked`);
    load();
  };

  const confirmDoBlock = async () => {
    setWorking(true);
    try {
      await api.put(`/api/admin/users/${confirmBlock.id}/block`);
      toast(`${confirmBlock.name} blocked`);
      setConfirmBlock(null);
      load();
    } catch (err) {
      toast(err.message || "Couldn't block that user.", "error");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <Topbar title="Admin" subtitle="Private admin panel — not visible to students." />
      <AdminTabs />

      <div className="px-4 lg:px-8 py-6 max-w-5xl space-y-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="input !pl-9" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {!data ? (
          <SkeletonList count={8} />
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted border-b border-black/5 dark:border-white/5">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">Joined</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-surface-sunken/50">
                        <td className="px-4 py-3">
                          <Link to={`/admin/users/${u.id}`} className="font-medium hover:text-accent flex items-center gap-1.5">
                            {u.name}
                            {u.is_admin && <ShieldCheck size={13} className="text-accent" title="Admin" />}
                          </Link>
                          <p className="text-xs text-ink-faint sm:hidden">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-ink-muted">{u.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cx("badge !py-0.5 !px-2 text-[10px]", u.is_verified ? "text-emerald-600 bg-emerald-500/10" : "text-amber-600 bg-amber-500/10")}>
                              {u.is_verified ? "Verified" : "Unverified"}
                            </span>
                            {u.is_blocked && <span className="badge !py-0.5 !px-2 text-[10px] text-rose-600 bg-rose-500/10">Blocked</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-faint">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          {!u.is_admin && (
                            <button
                              onClick={() => toggleBlock(u)}
                              className={cx(
                                "text-xs font-medium inline-flex items-center gap-1",
                                u.is_blocked ? "text-emerald-600 hover:underline" : "text-rose-500 hover:underline"
                              )}
                            >
                              {u.is_blocked ? <><CheckCircle2 size={12} /> Unblock</> : <><Ban size={12} /> Block</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>
                {data.total} user{data.total === 1 ? "" : "s"} · Page {data.page} of {data.pages}
              </span>
              <div className="flex gap-1.5">
                <button className="btn-icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={15} />
                </button>
                <button className="btn-icon" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmBlock}
        onClose={() => setConfirmBlock(null)}
        onConfirm={confirmDoBlock}
        loading={working}
        title="Block This User?"
        message={`${confirmBlock?.name} won't be able to sign in until you unblock them. Their data is kept intact.`}
      />
    </>
  );
}
