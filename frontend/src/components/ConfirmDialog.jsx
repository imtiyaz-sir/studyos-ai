import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
}) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-up" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-raised rounded-2xl shadow-soft p-6 animate-pop">
        <div className="w-11 h-11 rounded-full bg-rose-500/10 text-rose-500 grid place-items-center mb-4">
          <AlertTriangle size={20} />
        </div>
        <h2 className="font-display font-semibold text-base mb-1.5">{title}</h2>
        {message && <div className="text-sm text-ink-muted leading-relaxed">{message}</div>}

        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? "flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 text-white font-medium px-4 py-2.5 text-sm hover:bg-rose-600 active:scale-[0.98] transition-all disabled:opacity-60"
                : "btn-primary flex-1"
            }
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
