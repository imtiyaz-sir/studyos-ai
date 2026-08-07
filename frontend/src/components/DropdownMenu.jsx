import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { cx } from "../lib/utils";

/**
 * items: [{ label, icon: LucideIcon, onClick, danger?: bool }]
 * Renders a "⋮" trigger button and a floating menu positioned under it.
 * Closes on outside click, Escape, or item selection.
 */
export default function DropdownMenu({ items, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="btn-icon !w-8 !h-8"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          className={cx(
            "absolute top-full mt-1 z-30 min-w-[160px] py-1.5 rounded-xl bg-surface-raised border border-black/5 dark:border-white/10 shadow-soft animate-pop",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={cx(
                "w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors",
                item.danger ? "text-rose-500 hover:bg-rose-500/10" : "text-ink hover:bg-surface-sunken"
              )}
            >
              {item.icon && <item.icon size={15} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
