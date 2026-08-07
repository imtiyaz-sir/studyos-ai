import { useEffect, useState } from "react";
import { Plus, Sparkles, CheckCircle2, Circle, Trash2 } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { cx } from "../lib/utils";

export default function Skills() {
  const { toast } = useToast();
  const [skills, setSkills] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Programming", current_level: 1, target_level: 10 });
  const [milestoneInputs, setMilestoneInputs] = useState({});
  const [confirmSkill, setConfirmSkill] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => api.get("/api/skills").then((d) => setSkills(d.skills));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await api.post("/api/skills", form);
    setForm({ name: "", category: "Programming", current_level: 1, target_level: 10 });
    setOpen(false);
    toast("Skill added");
    load();
  };

  const bumpLevel = async (skill, delta) => {
    const newLevel = Math.max(1, Math.min(skill.target_level, skill.current_level + delta));
    await api.put(`/api/skills/${skill.id}`, { current_level: newLevel });
    load();
  };

  const addMilestone = async (skillId) => {
    const title = milestoneInputs[skillId];
    if (!title?.trim()) return;
    await api.post(`/api/skills/${skillId}/milestones`, { title });
    setMilestoneInputs((m) => ({ ...m, [skillId]: "" }));
    load();
  };

  const toggleMilestone = async (id) => {
    await api.put(`/api/skills/milestones/${id}/toggle`);
    load();
  };

  const deleteMilestone = async (id) => {
    await api.del(`/api/skills/milestones/${id}`);
    load();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/skills/${confirmSkill.id}`);
      toast(`"${confirmSkill.name}" deleted`);
      setConfirmSkill(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Topbar
        title="Skills"
        subtitle="Track hours, projects, and milestones toward mastery."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Skill</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-5xl">
        {!skills ? (
          <Loader />
        ) : skills.length === 0 ? (
          <EmptyState icon={Sparkles} title="No skills tracked yet" subtitle="Add a skill — Python, Design, Communication, anything." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {skills.map((s) => (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-display font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-ink-muted">{s.category}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button className="btn-icon !w-7 !h-7 text-lg" onClick={() => bumpLevel(s, -1)}>
                      −
                    </button>
                    <span className="font-mono text-sm font-semibold w-14 text-center">
                      Lv {s.current_level}/{s.target_level}
                    </span>
                    <button className="btn-icon !w-7 !h-7 text-lg" onClick={() => bumpLevel(s, 1)}>
                      +
                    </button>
                    <button className="btn-icon !w-7 !h-7 hover:text-rose-500" onClick={() => setConfirmSkill(s)} title="Delete skill">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-surface-sunken overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500 transition-all"
                    style={{ width: `${Math.min((s.current_level / s.target_level) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex gap-4 text-xs text-ink-muted mb-3">
                  <span>{s.hours_logged}h logged</span>
                  <span>{s.projects_count} projects</span>
                </div>

                <div className="space-y-1.5 mb-3">
                  {s.milestones?.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm group">
                      <button onClick={() => toggleMilestone(m.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        {m.completed ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Circle size={15} className="text-ink-faint shrink-0" />
                        )}
                        <span className={cx("truncate", m.completed && "line-through text-ink-faint")}>{m.title}</span>
                      </button>
                      <button
                        onClick={() => deleteMilestone(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-500 transition-opacity shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    className="input !py-1.5 text-xs"
                    placeholder="Add a milestone…"
                    value={milestoneInputs[s.id] || ""}
                    onChange={(e) => setMilestoneInputs((mi) => ({ ...mi, [s.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addMilestone(s.id)}
                  />
                  <button className="btn-secondary !px-3" onClick={() => addMilestone(s.id)}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Skill">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Skill name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Current level</label>
              <input
                type="number"
                min="1"
                max="10"
                className="input"
                value={form.current_level}
                onChange={(e) => setForm({ ...form, current_level: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="label">Target level</label>
              <input
                type="number"
                min="1"
                max="10"
                className="input"
                value={form.target_level}
                onChange={(e) => setForm({ ...form, target_level: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            Add Skill
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmSkill}
        onClose={() => setConfirmSkill(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Skill?"
        message={`This will permanently remove "${confirmSkill?.name || ""}" and its milestones. This action cannot be undone.`}
      />
    </>
  );
}
