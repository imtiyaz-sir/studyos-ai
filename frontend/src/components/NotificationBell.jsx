import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "../lib/api";
import { cx } from "../lib/utils";

const POLL_MS = 60000;

function ago(iso) {
  const t = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z").getTime();
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

/** Bell + unread badge + dropdown inbox. Polls the unread count (only while the tab is visible). */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null); // null = not loaded yet
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState(false);
  const box = useRef(null);

  const refreshCount = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try { setUnread((await api.get("/api/notifications/unread-count")).unread_count); } catch { /* offline: keep last value */ }
  }, []);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await api.get("/api/notifications", { limit: 20 });
      setItems(r.notifications); setUnread(r.unread_count);
    } catch { setError(true); }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    document.addEventListener("visibilitychange", refreshCount);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", refreshCount); };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    load();
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, load]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.is_read) {
      setItems((cur) => cur?.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.put(`/api/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setItems((cur) => cur?.map((x) => ({ ...x, is_read: 1 }))); setUnread(0);
    } catch { setError(true); }
  };

  return (
    <div className="relative" ref={box}>
      <button type="button" className="btn-icon relative" onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} aria-expanded={open} aria-haspopup="true">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold grid place-items-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications"
          className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:right-0 sm:mt-2 sm:w-96 z-50 card p-0 shadow-xl max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
            <p className="font-display font-semibold text-sm">Notifications</p>
            <button type="button" onClick={markAll} disabled={!unread}
              className="text-xs text-accent disabled:opacity-40 flex items-center gap-1 min-h-[32px]">
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>
          <div className="overflow-y-auto">
            {error ? (
              <div className="p-6 text-center text-sm text-ink-muted">
                Couldn't load notifications. <button type="button" className="text-accent underline" onClick={load}>Retry</button>
              </div>
            ) : items === null ? (
              <p className="p-6 text-center text-sm text-ink-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-muted">You're all caught up. Reminders for tomorrow's plan, exams and streaks will show up here.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => openItem(n)}
                      className={cx("w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                        !n.is_read && "bg-accent/5")}>
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" aria-label="Unread" />}
                        <div className="min-w-0">
                          {n.title && <p className="text-sm font-medium">{n.title}</p>}
                          <p className="text-sm text-ink-muted break-words">{n.message}</p>
                          <p className="text-xs text-ink-muted/70 mt-1">{ago(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
