import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight as ChevronRightIcon, Trash2,
  CheckCircle2, Circle, CircleDot, Clock, Layers,
} from "lucide-react";
import Topbar from "../components/Topbar";
import { SkeletonList } from "../components/Skeleton";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ProgressRing from "../components/ProgressRing";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { cx, priorityColor } from "../lib/utils";

const STATUS_CYCLE = ["not_started", "in_progress", "completed"];
const STATUS_ICON = { not_started: Circle, in_progress: CircleDot, completed: CheckCircle2 };
const STATUS_COLOR = {
  not_started: "text-ink-faint",
  in_progress: "text-accent",
  completed: "text-emerald-500",
};

function TopicRow({ topic, onCycleStatus, onDelete, depth = 0 }) {
  const Icon = STATUS_ICON[topic.status];
  const isSubtopic = depth > 0;
  return (
    <div className={isSubtopic ? "ml-4 border-l border-black/5 dark:border-white/5" : ""}>
      <div
        className="flex items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-surface-sunken group"
        style={{ paddingLeft: isSubtopic ? 14 : 8 }}
      >
        <span className={cx("text-xs shrink-0 select-none", isSubtopic ? "text-ink-faint" : "text-ink-muted")}>
          {isSubtopic ? "○" : "•"}
        </span>
        <button onClick={() => onCycleStatus(topic)} className={cx("shrink-0", STATUS_COLOR[topic.status])}>
          <Icon size={isSubtopic ? 15 : 17} />
        </button>
        <span
          className={cx(
            "flex-1 truncate",
            isSubtopic ? "text-[13px] text-ink-muted" : "text-sm font-medium",
            topic.status === "completed" && "text-ink-faint line-through"
          )}
        >
          {topic.name}
        </span>
        {topic.priority && (
          <span className={cx("badge !py-0.5 !px-2 text-[10px] hidden sm:inline-flex", priorityColor[topic.priority])}>
            {topic.priority}
          </span>
        )}
        {topic.confidence_level > 0 && (
          <span className="text-[11px] font-mono text-ink-faint hidden sm:inline w-9 text-right">
            {topic.confidence_level}%
          </span>
        )}
        <button
          onClick={() => onDelete(topic)}
          className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-500 transition-opacity shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {topic.subtopics?.map((st) => (
        <TopicRow key={st.id} topic={st} onCycleStatus={onCycleStatus} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function SubjectDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [subject, setSubject] = useState(null);
  const [error, setError] = useState("");
  const [unitModal, setUnitModal] = useState(false);
  const [topicModal, setTopicModal] = useState(null); // unit_id or null
  const [unitName, setUnitName] = useState("");
  const [topicForm, setTopicForm] = useState({ name: "", priority: "medium", difficulty: "medium", estimated_hours: 2 });
  const [collapsed, setCollapsed] = useState({});
  const [renamingUnit, setRenamingUnit] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmUnit, setConfirmUnit] = useState(null);
  const [confirmTopic, setConfirmTopic] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    api
      .get(`/api/subjects/${id}`)
      .then(setSubject)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addUnit = async (e) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    await api.post(`/api/subjects/${id}/units`, { name: unitName });
    setUnitName("");
    setUnitModal(false);
    load();
  };

  const addTopic = async (e) => {
    e.preventDefault();
    if (!topicForm.name.trim() || !topicModal) return;
    await api.post(`/api/subjects/units/${topicModal}/topics`, topicForm);
    setTopicForm({ name: "", priority: "medium", difficulty: "medium", estimated_hours: 2 });
    setTopicModal(null);
    load();
  };

  const cycleStatus = async (topic) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(topic.status) + 1) % STATUS_CYCLE.length];
    await api.put(`/api/subjects/topics/${topic.id}`, { status: next });
    if (next === "completed") {
      api.post(`/api/revision/topic/${topic.id}/schedule`).catch(() => {});
      toast(`"${topic.name}" marked complete — revision schedule started`);
    }
    load();
  };

  const deleteTopic = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/subjects/topics/${confirmTopic.id}`);
      toast(`"${confirmTopic.name}" removed`);
      setConfirmTopic(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const deleteUnit = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/subjects/units/${confirmUnit.id}`);
      toast(`"${confirmUnit.name}" and its topics removed`);
      setConfirmUnit(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const startRename = (unit) => {
    setRenamingUnit(unit.id);
    setRenameValue(unit.name);
  };

  const saveRename = async (unitId) => {
    if (renameValue.trim()) {
      await api.put(`/api/subjects/units/${unitId}`, { name: renameValue.trim() });
    }
    setRenamingUnit(null);
    load();
  };

  if (error) return <div className="p-8 text-sm text-rose-500">Couldn't load subject: {error}</div>;
  if (!subject?.subject) {
    return (
      <>
        <Topbar title="Loading…" />
        <div className="px-4 lg:px-8 py-6 max-w-4xl">
          <SkeletonList count={3} />
        </div>
      </>
    );
  }

  const s = subject.subject;

  return (
    <>
      <Topbar
        title={s.name}
        subtitle={s.semester || "Syllabus breakdown"}
        actions={
          <button className="btn-primary" onClick={() => setUnitModal(true)}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Unit</span>
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-4xl">
        <Link to="/subjects" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5">
          <ArrowLeft size={15} /> All subjects
        </Link>

        {s.units.length === 0 ? (
          <div className="card p-10 text-center">
            <Layers size={28} className="mx-auto text-ink-faint mb-3" />
            <p className="font-medium text-sm mb-1">No units yet</p>
            <p className="text-xs text-ink-muted mb-4">Break this subject into units, then add topics to each.</p>
            <button className="btn-primary mx-auto" onClick={() => setUnitModal(true)}>
              <Plus size={15} /> Add first unit
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {s.units.map((u, unitIndex) => (
              <div key={u.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [u.id]: !c[u.id] }))}
                    className="btn-icon !w-7 !h-7 shrink-0"
                  >
                    {collapsed[u.id] ? <ChevronRightIcon size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    {renamingUnit === u.id ? (
                      <input
                        className="input !py-1 text-sm font-display font-semibold"
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => saveRename(u.id)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(u.id)}
                      />
                    ) : (
                      <p
                        className="font-display font-semibold text-[15px] cursor-text tracking-tight"
                        onClick={() => startRename(u)}
                        title="Click to rename"
                      >
                        <span className="text-ink-faint font-normal mr-1.5">Unit {unitIndex + 1} ·</span>
                        {u.name}
                      </p>
                    )}
                    <p className="text-xs text-ink-muted mt-0.5">
                      {u.topics.length} {u.topics.length === 1 ? "topic" : "topics"}
                    </p>
                  </div>
                  <ProgressRing value={u.completion_pct} size={38} stroke={4} />
                  <button
                    onClick={() => setTopicModal(u.id)}
                    className="btn-icon"
                    title="Add topic"
                  >
                    <Plus size={16} />
                  </button>
                  <button onClick={() => setConfirmUnit(u)} className="btn-icon hover:text-rose-500" title="Delete unit">
                    <Trash2 size={15} />
                  </button>
                </div>

                {!collapsed[u.id] && (
                  <div className="mt-2 border-t border-black/5 dark:border-white/5 pt-2">
                    {u.topics.length === 0 ? (
                      <p className="text-xs text-ink-faint py-3 px-2">No topics yet — add one to get started.</p>
                    ) : (
                      u.topics.map((t) => (
                        <TopicRow key={t.id} topic={t} onCycleStatus={cycleStatus} onDelete={setConfirmTopic} />
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={unitModal} onClose={() => setUnitModal(false)} title="Add Unit">
        <form onSubmit={addUnit} className="space-y-4">
          <div>
            <label className="label">Unit name</label>
            <input className="input" value={unitName} onChange={(e) => setUnitName(e.target.value)} autoFocus required />
          </div>
          <button type="submit" className="btn-primary w-full">
            Add Unit
          </button>
        </form>
      </Modal>

      <Modal open={!!topicModal} onClose={() => setTopicModal(null)} title="Add Topic">
        <form onSubmit={addTopic} className="space-y-4">
          <div>
            <label className="label">Topic name</label>
            <input
              className="input"
              value={topicForm.name}
              onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={topicForm.priority}
                onChange={(e) => setTopicForm({ ...topicForm, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select
                className="input"
                value={topicForm.difficulty}
                onChange={(e) => setTopicForm({ ...topicForm, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <Clock size={12} /> Estimated hours
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="input"
              value={topicForm.estimated_hours}
              onChange={(e) => setTopicForm({ ...topicForm, estimated_hours: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Add Topic
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmUnit}
        onClose={() => setConfirmUnit(null)}
        onConfirm={deleteUnit}
        loading={deleting}
        title="Delete Unit?"
        message={`This will permanently remove "${confirmUnit?.name || ""}" and every topic inside it. This action cannot be undone.`}
      />

      <ConfirmDialog
        open={!!confirmTopic}
        onClose={() => setConfirmTopic(null)}
        onConfirm={deleteTopic}
        loading={deleting}
        title="Delete Topic?"
        message={`This will permanently remove "${confirmTopic?.name || ""}" along with its revision history and notes. This action cannot be undone.`}
      />
    </>
  );
}
