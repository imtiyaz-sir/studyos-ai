import { Moon, Sun, Flame, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ title, subtitle, actions }) {
  const { user, updatePrefs } = useAuth();
  const isDark = user?.theme === "dark";

  return (
    <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8 py-4">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl lg:text-2xl tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-surface-raised border border-black/5 dark:border-white/5 pl-3 pr-1 py-1">
            <Flame size={14} className="text-amber-500" />
            <span className="text-xs font-mono font-medium">{user?.current_streak ?? 0}</span>
            <span className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-1" />
            <Zap size={14} className="text-accent" />
            <span className="text-xs font-mono font-medium pr-1.5">{user?.xp ?? 0}</span>
          </div>
          <button
            onClick={() => updatePrefs({ theme: isDark ? "light" : "dark" })}
            className="btn-icon"
            title="Toggle theme"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}
