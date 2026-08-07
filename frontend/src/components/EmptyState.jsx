export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-up">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent grid place-items-center mb-4">
        <Icon size={24} />
      </div>
      <p className="font-display font-semibold text-base">{title}</p>
      {subtitle && <p className="text-sm text-ink-muted mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
