import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight as ChevronRightIcon, Trash2,
  CheckCircle2, Circle, CircleDot, Clock, Layers,
} from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import ProgressRing from "../components/ProgressRing";
import { api } from "../lib/api";
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
  return (
    <div>
      <div
        className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-surface-sunken group"
        style={{ paddingLeft: depth * 20 + 8 }}
      >
        <button onClick={() => onCycleStatus(topic)} className={cx("shrink-0", STATUS_COLOR[topic.status])}>
          <Icon size={17} />
        </button>
        <span className={cx("text-sm flex-1 truncate", topic.status === "completed" && "text-ink-faint line-through")}>
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
          onClick={() => onDelete(topic.id)}
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
  const [subject, setSubject] = useState(null);
  const [error, setError] = useState("");
  const [unitModal, setUnitModal] = useState(false);
  const [topicModal, setTopicModal] = useState(null); // unit_id or null
  const [unitName, setUnitName] = useState("");
  const [topicForm, setTopicForm] = useState({ name: "", priority: "medium", difficulty: "medium", estimated_hours: 2 });
  const [collapsed, setCollapsed] = useState({});
  const [renamingUnit, setRenamingUnit] = useState(null);
  const [renameValue, setRenameValue] = useState("");

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
    }
    load();
  };

  const deleteTopic = async (topicId) => {
    await api.del(`/api/subjects/topics/${topicId}`);
    load();
  };

  const deleteUnit = async (unitId) => {
    await api.del(`/api/subjects/units/${unitId}`);
    load();
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
  if (!subject?.subject) return <Loader full />;

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
          <div className="space-y-3">
            {s.units.map((u) => (
              <div key={u.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [u.id]: !c[u.id] }))}
                    className="btn-icon !w-7 !h-7"
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
                        className="font-display font-semibold text-sm cursor-text"
                        onClick={() => startRename(u)}
                        title="Click to rename"
                      >
                        {u.name}
                      </p>
                    )}
                    <p className="text-xs text-ink-muted">{u.topics.length} topics</p>
                  </div>
                  <ProgressRing value={u.completion_pct} size={38} stroke={4} />
                  <button
                    onClick={() => setTopicModal(u.id)}
                    className="btn-icon"
                    title="Add topic"
                  >
                    <Plus size={16} />
                  </button>
                  <button onClick={() => deleteUnit(u.id)} className="btn-icon hover:text-rose-500" title="Delete unit">
                    <Trash2 size={15} />
                  </button>
                </div>

                {!collapsed[u.id] && (
                  <div className="mt-2 border-t border-black/5 dark:border-white/5 pt-2">
                    {u.topics.length === 0 ? (
                      <p className="text-xs text-ink-faint py-3 px-2">No topics yet — add one to get started.</p>
                    ) : (
                      u.topics.map((t) => (
                        <TopicRow key={t.id} topic={t} onCycleStatus={cycleStatus} onDelete={deleteTopic} />
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
    </>
  );
}
