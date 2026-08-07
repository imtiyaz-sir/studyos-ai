import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListTree, Search } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { api } from "../lib/api";
import { cx, priorityColor, statusColor } from "../lib/utils";

const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", completed: "Completed" };

export default function Syllabus() {
  const [topics, setTopics] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/api/subjects/topics/all").then((d) => setTopics(d.topics));
  }, []);

  const filtered = useMemo(() => {
    if (!topics) return [];
    return topics.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [topics, statusFilter, search]);

  const counts = useMemo(() => {
    if (!topics) return {};
    return topics.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {});
  }, [topics]);

  return (
    <>
      <Topbar title="Syllabus Tracker" subtitle="Every topic, across every subject, in one place." />

      <div className="px-4 lg:px-8 py-6 max-w-6xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input !pl-9"
              placeholder="Search topics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {["all", "not_started", "in_progress", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cx(
                  "px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                  statusFilter === f ? "bg-accent text-white" : "bg-surface-sunken text-ink-muted hover:text-ink"
                )}
              >
                {f === "all" ? "All" : STATUS_LABEL[f]} {f !== "all" && counts[f] ? `(${counts[f]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {!topics ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListTree} title="No topics found" subtitle="Try a different filter or add topics from your Subjects page." />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-muted border-b border-black/5 dark:border-white/5">
                    <th className="px-4 py-3 font-medium">Topic</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Subject</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Priority</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Confidence</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Revisions</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-surface-sunken/50">
                      <td className="px-4 py-3">
                        <Link to={`/subjects/${t.subject_id}`} className="font-medium hover:text-accent">
                          {t.name}
                        </Link>
                        <p className="text-xs text-ink-faint sm:hidden">{t.subject_name}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.subject_color }} />
                          {t.subject_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cx("badge", statusColor[t.status])}>{STATUS_LABEL[t.status]}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={cx("badge", priorityColor[t.priority])}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs">{t.confidence_level}%</td>
                      <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs">{t.revision_count}</td>
                      <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs">{t.practice_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
