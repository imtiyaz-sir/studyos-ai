import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ListTree, CheckSquare, RotateCcw, PenTool,
  GraduationCap, CalendarDays, NotebookText, Sparkles, Target, BarChart3,
  Bot, Settings, Flame, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cx } from "../lib/utils";

const SECTIONS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Academics",
    items: [
      { to: "/subjects", label: "Subjects", icon: BookOpen },
      { to: "/syllabus", label: "Syllabus", icon: ListTree },
      { to: "/revision", label: "Revision", icon: RotateCcw },
      { to: "/practice", label: "Practice", icon: PenTool },
      { to: "/exams", label: "Exams", icon: GraduationCap },
    ],
  },
  {
    label: "Productivity",
    items: [
      { to: "/tasks", label: "Tasks", icon: CheckSquare },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/notes", label: "Notes", icon: NotebookText },
      { to: "/goals", label: "Goals", icon: Target },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/skills", label: "Skills", icon: Sparkles },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-black/5 dark:border-white/5 bg-surface-raised/60 backdrop-blur-md">
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark grid place-items-center shadow-glow shrink-0">
          <span className="text-white font-display font-bold text-sm">S</span>
        </div>
        <span className="font-display font-bold text-[15px] tracking-tight">StudyOS AI</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-ring",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
                    )
                  }
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-accent/10 text-accent" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
            )
          }
        >
          <Settings size={17} />
          Settings
        </NavLink>

        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg bg-surface-sunken">
          <div className="w-8 h-8 rounded-full bg-accent/15 text-accent grid place-items-center font-display font-semibold text-xs shrink-0">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-[11px] text-ink-muted flex items-center gap-1">
              <Flame size={11} className="text-amber-500" /> {user?.current_streak ?? 0} day streak
            </p>
          </div>
          <button onClick={logout} className="btn-icon !w-7 !h-7" title="Log out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
