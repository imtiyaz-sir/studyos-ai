import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-up" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-surface-raised rounded-t-3xl sm:rounded-2xl shadow-soft max-h-[90vh] overflow-y-auto animate-pop">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 sticky top-0 bg-surface-raised">
          <h2 className="font-display font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
