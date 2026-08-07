import { useEffect, useState } from "react";
import { Plus, NotebookText, Search, Pin, Trash2 } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { cx, formatDate } from "../lib/utils";

export default function Notes() {
  const { toast } = useToast();
  const [notes, setNotes] = useState(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ title: "", content_markdown: "", folder: "General", tags: "" });
  const [confirmNote, setConfirmNote] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = (q) => api.get("/api/notes", q ? { q } : undefined).then((d) => setNotes(d.notes));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openNew = () => {
    setActive(null);
    setForm({ title: "", content_markdown: "", folder: "General", tags: "" });
    setOpen(true);
  };

  const openEdit = (n) => {
    setActive(n);
    setForm({ title: n.title, content_markdown: n.content_markdown || "", folder: n.folder, tags: n.tags || "" });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (active) {
      await api.put(`/api/notes/${active.id}`, form);
      toast("Note updated");
    } else {
      await api.post("/api/notes", form);
      toast("Note created");
    }
    setOpen(false);
    load(search);
  };

  const togglePin = async (n) => {
    await api.put(`/api/notes/${n.id}`, { pinned: n.pinned ? 0 : 1 });
    load(search);
  };

  const askDelete = () => {
    setConfirmNote(active);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/notes/${confirmNote.id}`);
      toast(`"${confirmNote.title}" deleted`);
      setConfirmNote(null);
      setOpen(false);
      load(search);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Topbar
        title="Notes"
        subtitle="Markdown notes, organized by folder and tags."
        actions={
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16} /> <span className="hidden sm:inline">New Note</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-5xl space-y-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="input !pl-9" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {!notes ? (
          <Loader />
        ) : notes.length === 0 ? (
          <EmptyState icon={NotebookText} title="No notes yet" subtitle="Capture your first note — markdown supported." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {notes.map((n) => (
              <div key={n.id} className="card p-4 cursor-pointer hover:shadow-soft transition-shadow" onClick={() => openEdit(n)}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display font-semibold text-sm truncate pr-2">{n.title}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(n);
                    }}
                    className={cx("shrink-0", n.pinned ? "text-amber-500" : "text-ink-faint")}
                  >
                    <Pin size={14} fill={n.pinned ? "currentColor" : "none"} />
                  </button>
                </div>
                <p className="text-xs text-ink-muted line-clamp-3 whitespace-pre-line">{n.content_markdown}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="badge bg-accent/10 text-accent !py-0.5 !px-2 text-[10px]">{n.folder}</span>
                  <span className="text-[11px] text-ink-faint">{formatDate(n.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={active ? "Edit Note" : "New Note"}
        footer={
          active && (
            <button className="btn-secondary !text-rose-500" onClick={askDelete}>
              <Trash2 size={14} /> Delete
            </button>
          )
        }
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Folder</label>
              <input className="input" value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} />
            </div>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Content (Markdown supported)</label>
            <textarea
              className="input min-h-[160px] font-mono text-xs"
              value={form.content_markdown}
              onChange={(e) => setForm({ ...form, content_markdown: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            {active ? "Save Changes" : "Create Note"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmNote}
        onClose={() => setConfirmNote(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Note?"
        message={`This will permanently remove "${confirmNote?.title || ""}". This action cannot be undone.`}
      />
    </>
  );
}
