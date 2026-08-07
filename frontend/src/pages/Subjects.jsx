import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, ChevronRight, Pencil, Trash2, Copy, FileUp } from "lucide-react";
import Topbar from "../components/Topbar";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DropdownMenu from "../components/DropdownMenu";
import ImportSyllabusModal from "../components/ImportSyllabusModal";
import { SkeletonCardGrid } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import ProgressRing from "../components/ProgressRing";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"];

export default function Subjects() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ name: "", semester: "", color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => api.get("/api/subjects").then((d) => setSubjects(d.subjects));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setActive(null);
    setForm({ name: "", semester: "", color: COLORS[0] });
    setOpen(true);
  };

  const openEdit = (s) => {
    setActive(s);
    setForm({ name: s.name, semester: s.semester || "", color: s.color });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (active) {
        await api.put(`/api/subjects/${active.id}`, form);
        toast("Subject updated");
      } else {
        await api.post("/api/subjects", form);
        toast("Subject created");
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (s) => {
    await api.post("/api/subjects", { name: `${s.name} (Copy)`, semester: s.semester, color: s.color });
    toast(`Duplicated "${s.name}"`);
    load();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/subjects/${confirmTarget.id}`);
      toast(`"${confirmTarget.name}" deleted`);
      setConfirmTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Topbar
        title="Subjects"
        subtitle="Your full syllabus, organized by subject."
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              <FileUp size={16} /> <span className="hidden sm:inline">Import Syllabus</span>
            </button>
            <button className="btn-primary" onClick={openNew}>
              <Plus size={16} /> <span className="hidden sm:inline">Add Subject</span>
            </button>
          </div>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-7xl">
        {!subjects ? (
          <SkeletonCardGrid />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            subtitle="Add your first subject to start building your syllabus tracker."
            action={
              <button className="btn-primary" onClick={openNew}>
                <Plus size={16} /> Add Subject
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {subjects.map((s) => (
              <div key={s.id} className="card p-5 hover:shadow-soft transition-shadow group animate-fade-up relative">
                <div className="absolute top-4 right-4 z-10">
                  <DropdownMenu
                    items={[
                      { label: "Edit", icon: Pencil, onClick: () => openEdit(s) },
                      { label: "Duplicate", icon: Copy, onClick: () => duplicate(s) },
                      { label: "Delete", icon: Trash2, danger: true, onClick: () => setConfirmTarget(s) },
                    ]}
                  />
                </div>

                <Link to={`/subjects/${s.id}`} className="block">
                  <div className="flex items-start justify-between pr-8">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                        style={{ backgroundColor: `${s.color}1A`, color: s.color }}
                      >
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-sm leading-tight">{s.name}</p>
                        {s.semester && <p className="text-xs text-ink-muted mt-0.5">{s.semester}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-5">
                    <div className="text-xs text-ink-muted space-y-0.5">
                      <p>{s.unit_count} units</p>
                      <p>{s.topic_count} topics</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <ProgressRing value={s.completion_pct} size={52} stroke={5} />
                      <ChevronRight size={16} className="text-ink-faint group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={active ? "Edit Subject" : "Add Subject"}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Subject name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Data Structures & Algorithms"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Semester (optional)</label>
            <input
              className="input"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              placeholder="e.g. Semester 5"
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className="w-8 h-8 rounded-full grid place-items-center"
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
            {saving ? "Saving…" : active ? "Save Changes" : "Add Subject"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Subject?"
        message="This will permanently remove the subject and all its associated data. This action cannot be undone."
      />

      <ImportSyllabusModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(result) => {
          toast(`Imported "${result.subject}" — ${result.units_created} units, ${result.topics_created} topics`);
          load();
        }}
      />
    </>
  );
}
