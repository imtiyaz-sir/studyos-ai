import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, ListTree } from "lucide-react";
import { cx } from "../lib/utils";

const TABS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/syllabus", label: "Syllabus", icon: ListTree },
];

export default function AdminTabs() {
  return (
    <div className="flex gap-1.5 px-4 lg:px-8 pb-3 overflow-x-auto">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cx(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
              isActive ? "bg-accent text-white" : "bg-surface-sunken text-ink-muted hover:text-ink"
            )
          }
        >
          <Icon size={14} /> {label}
        </NavLink>
      ))}
    </div>
  );
}
