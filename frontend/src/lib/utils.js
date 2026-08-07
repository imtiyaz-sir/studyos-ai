export function cx(...args) {
  return args.filter(Boolean).join(" ");
}

export function formatDate(iso, opts = {}) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...opts });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  return diff;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const priorityColor = {
  high: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
  medium: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  low: "text-slate-600 bg-slate-500/10 dark:text-slate-400",
};

export const statusColor = {
  completed: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  done: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  in_progress: "text-accent bg-accent/10",
  not_started: "text-slate-500 bg-slate-500/10",
  pending: "text-slate-500 bg-slate-500/10",
};
