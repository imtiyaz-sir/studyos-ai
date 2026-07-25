import { cx } from "../lib/utils";

export default function StatCard({ icon: Icon, label, value, sub, accentClass = "text-accent bg-accent/10", className }) {
  return (
    <div className={cx("card p-4 lg:p-5 animate-fade-up", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cx("w-9 h-9 rounded-xl grid place-items-center", accentClass)}>
          <Icon size={17} />
        </div>
      </div>
      <p className="font-mono text-2xl font-semibold tracking-tight leading-none">{value}</p>
      <p className="text-xs text-ink-muted mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  );
}
