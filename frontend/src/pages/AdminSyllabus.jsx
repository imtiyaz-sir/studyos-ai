import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, ListTree, BookOpen, Search,
} from "lucide-react";
import Topbar from "../components/Topbar";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Loader from "../components/Loader";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

export default function AdminSyllabus() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "" });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");

  const loadSubjects = () => {
    setError("");
    api.get("/api/admin/syllabus", { per_page: 50, search })
      .then((d) => setSubjects(d.subjects))
      .catch((err) => setError(err.message || "Unable to load syllabus."));
  };

  useEffect(() => { loadSubjects(); }, [search]);

  const loadSubject = async (id) => {
    const data = await api.get(`/api/admin/syllabus/${id}`);
    setSelected(data.subject);
    setExpanded((e) => ({ ...e, [id]: true }));
  };

  const openModal = (type, target = null) => {
    setModal({ type, target });
    setForm({ name: target?.name || "" });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal.type === "add-unit") {
        await api.post(`/api/admin/syllabus/${selected.id}/units`, form);
        toast("Unit added");
      } else if (modal.type === "edit-unit") {
        await api.put(`/api/admin/syllabus/units/${modal.target.id}`, form);
        toast("Unit updated");
      } else if (modal.type === "add-topic") {
        await api.post(`/api/admin/syllabus/units/${modal.target.id}/topics`, form);
        toast("Topic added");
      } else if (modal.type === "edit-topic") {
        await api.put(`/api/admin/syllabus/topics/${modal.target.id}`, form);
        toast("Topic updated");
      }
      setModal(null);
      await loadSubject(selected.id);
      loadSubjects();
    } catch (err) {
      toast(err.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      if (confirm.type === "unit") {
        await api.del(`/api/admin/syllabus/units/${confirm.id}`);
        toast("Unit deleted");
      } else {
        await api.del(`/api/admin/syllabus/topics/${confirm.id}`);
        toast("Topic deleted");
      }
      setConfirm(null);
      await loadSubject(selected.id);
      loadSubjects();
    } catch (err) {
      toast(err.message || "Could not delete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Syllabus Management" subtitle="Inspect and safely edit existing subjects, units and topics." />
      <div className="px-4 lg:px-8 py-6 max-w-7xl space-y-4">
        <div className="relative max-w-xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input !pl-9"
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error ? (
          <div className="card p-5 text-sm text-red-500">{error}</div>
        ) : !subjects ? (
          <Loader />
        ) : subjects.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-muted">No subjects found.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-3">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSubject(s.id)}
                  className={`card w-full text-left p-4 transition-shadow ${selected?.id === s.id ? "ring-2 ring-accent/40" : "hover:shadow-soft"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0">
                      <BookOpen size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold text-sm truncate">{s.name}</p>
                      <p className="text-xs text-ink-muted mt-0.5 truncate">{s.owner_name} · {s.owner_email}</p>
                      <p className="text-xs text-ink-faint mt-1">{s.unit_count} units · {s.topic_count} topics</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="card p-4 min-h-64">
              {!selected ? (
                <div className="h-full min-h-56 grid place-items-center text-center text-sm text-ink-muted">
                  <div>
                    <ListTree size={28} className="mx-auto mb-2 text-ink-faint" />
                    Select a subject to inspect its units and topics.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-display font-semibold">{selected.name}</h2>
                      <p className="text-xs text-ink-muted mt-0.5">{selected.owner_name} · {selected.owner_email}</p>
                    </div>
                    <button className="btn-primary !px-3" onClick={() => openModal("add-unit")}>
                      <Plus size={15} /> Unit
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selected.units.map((unit) => (
                      <div key={unit.id} className="rounded-xl bg-surface-sunken/60 p-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-icon !w-8 !h-8"
                            onClick={() => setExpanded((e) => ({ ...e, [unit.id]: !e[unit.id] }))}
                          >
                            {expanded[unit.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <p className="font-medium text-sm flex-1">{unit.name}</p>
                          <button className="btn-icon !w-8 !h-8" title="Edit unit" onClick={() => openModal("edit-unit", unit)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon !w-8 !h-8 text-red-500" title="Delete unit" onClick={() => setConfirm({ type: "unit", id: unit.id, name: unit.name })}>
                            <Trash2 size={14} />
                          </button>
                          <button className="btn-icon !w-8 !h-8" title="Add topic" onClick={() => openModal("add-topic", unit)}>
                            <Plus size={14} />
                          </button>
                        </div>

                        {expanded[unit.id] && (
                          <div className="mt-2 ml-10 space-y-1.5">
                            {unit.topics.map((topic) => (
                              <TopicNode
                                key={topic.id}
                                topic={topic}
                                depth={0}
                                onEdit={(t) => openModal("edit-topic", t)}
                                onDelete={(t) => setConfirm({ type: "topic", id: t.id, name: t.name })}
                              />
                            ))}
                            {unit.topics.length === 0 && (
                              <p className="text-xs text-ink-faint py-2">No topics in this unit.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {selected.units.length === 0 && <p className="text-sm text-ink-muted py-5 text-center">No units yet.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.type === "add-unit" ? "Add Unit" :
          modal?.type === "edit-unit" ? "Edit Unit" :
          modal?.type === "add-topic" ? "Add Topic" : "Edit Topic"
        }
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        loading={saving}
        title={`Delete ${confirm?.type === "unit" ? "unit" : "topic"}?`}
        message="This changes the existing syllabus data and may remove related records through the database's existing cascade rules. Continue only if you intend to make this change."
      />
    </>
  );
}

function TopicNode({ topic, depth, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div className="flex items-center gap-1.5 py-1.5">
        <button
          className="btn-icon !w-7 !h-7"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse topic" : "Expand topic"}
        >
          {topic.subtopics?.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5" />}
        </button>
        <span className="text-sm flex-1 break-words">{topic.name}</span>
        <button className="btn-icon !w-7 !h-7" title="Edit topic" onClick={() => onEdit(topic)}>
          <Pencil size={13} />
        </button>
        <button className="btn-icon !w-7 !h-7 text-red-500" title="Delete topic" onClick={() => onDelete(topic)}>
          <Trash2 size={13} />
        </button>
      </div>
      {open && topic.subtopics?.length > 0 && (
        <div className="ml-5 pl-2 border-l border-black/10 dark:border-white/10">
          {topic.subtopics.map((child) => (
            <TopicNode key={child.id} topic={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
