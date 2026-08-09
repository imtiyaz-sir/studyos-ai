import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import Topbar from "../../components/Topbar";
import AdminTabs from "../../components/AdminTabs";
import { SkeletonList } from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { api } from "../../lib/api";
import ProgressRing from "../../components/ProgressRing";

export default function AdminSyllabus() {
  const [subjects, setSubjects] = useState(null);

  useEffect(() => {
    api.get("/api/subjects").then((d) => setSubjects(d.subjects));
  }, []);

  return (
    <>
      <Topbar title="Admin" subtitle="Private admin panel — not visible to students." />
      <AdminTabs />

      <div className="px-4 lg:px-8 py-6 max-w-3xl space-y-4">
        <p className="text-xs text-ink-faint -mt-1">
          This lists subjects on your own account. Full unit/topic add, edit, delete, and reorder happens on the
          regular Subjects page — this just gives you a quick admin-context jump-in point.
        </p>

        {!subjects ? (
          <SkeletonList count={4} />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            subtitle="Add a subject from the main Subjects page to manage its syllabus here."
            action={
              <Link to="/subjects" className="btn-primary inline-flex">
                Go to Subjects
              </Link>
            }
          />
        ) : (
          <div className="card divide-y divide-black/5 dark:divide-white/5">
            {subjects.map((s) => (
              <Link key={s.id} to={`/subjects/${s.id}`} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-sunken/50">
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{ backgroundColor: `${s.color}1A`, color: s.color }}
                >
                  <BookOpen size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-ink-muted">
                    {s.unit_count} units · {s.topic_count} topics
                  </p>
                </div>
                <ProgressRing value={s.completion_pct} size={34} stroke={4} />
                <ExternalLink size={14} className="text-ink-faint shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
