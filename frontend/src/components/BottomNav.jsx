import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, CheckSquare, RotateCcw, Grid3x3, X,
  ListTree, PenTool, GraduationCap, CalendarDays, NotebookText, Sparkles,
  Target, BarChart3, Bot, Settings,
} from "lucide-react";
import { cx } from "../lib/utils";

const PRIMARY = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/revision", label: "Revise", icon: RotateCcw },
];

const MORE = [
  { to: "/syllabus", label: "Syllabus", icon: ListTree },
  { to: "/practice", label: "Practice", icon: PenTool },
  { to: "/exams", label: "Exams", icon: GraduationCap },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/notes", label: "Notes", icon: NotebookText },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/skills", label: "Skills", icon: Sparkles },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 animate-fade-up" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-0 inset-x-0 bg-surface-raised rounded-t-3xl p-5 pb-8 animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-semibold text-base">All pages</p>
              <button className="btn-icon" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {MORE.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => {
                    navigate(to);
                    setOpen(false);
                  }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-surface-sunken transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center">
                    <Icon size={19} />
                  </div>
                  <span className="text-[11px] font-medium text-ink-muted text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-raised/90 backdrop-blur-md border-t border-black/5 dark:border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2">
          {PRIMARY.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cx(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px]",
                  isActive ? "text-accent" : "text-ink-faint"
                )
              }
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] text-ink-faint"
          >
            <Grid3x3 size={20} strokeWidth={2.2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
