import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Trash2 } from "lucide-react";
import Topbar from "../components/Topbar";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import { api } from "../lib/api";
import { cx } from "../lib/utils";

const EVENT_COLOR = {
  exam: "bg-rose-500",
  assignment: "bg-amber-500",
  study: "bg-accent",
  revision: "bg-purple-500",
  deadline: "bg-rose-500",
  event: "bg-emerald-500",
};

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [events, setEvents] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ title: "", event_type: "study", start_datetime: "" });

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const load = () => {
    const start = new Date(cursor.year, cursor.month, 1).toISOString();
    const end = new Date(cursor.year, cursor.month + 1, 1).toISOString();
    api.get("/api/calendar", { start, end }).then((d) => setEvents(d.events));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = {};
    (events || []).forEach((e) => {
      const day = new Date(e.start_datetime).getDate();
      map[day] = map[day] || [];
      map[day].push(e);
    });
    return map;
  }, [events]);

  const openAdd = (day) => {
    const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00`;
    setForm({ title: "", event_type: "study", start_datetime: iso });
    setSelectedDay(day);
    setOpen(true);
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.post("/api/calendar", form);
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    await api.del(`/api/calendar/${id}`);
    load();
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  const isToday = (d) => d === today.getDate() && cursor.month === today.getMonth() && cursor.year === today.getFullYear();

  return (
    <>
      <Topbar
        title="Calendar"
        subtitle="Exams, assignments, and study sessions at a glance."
        actions={
          <div className="flex items-center gap-1">
            <button className="btn-icon" onClick={() => setCursor((c) => ({ year: c.month === 0 ? c.year - 1 : c.year, month: (c.month + 11) % 12 }))}>
              <ChevronLeft size={17} />
            </button>
            <span className="text-sm font-medium w-32 text-center">{monthLabel}</span>
            <button className="btn-icon" onClick={() => setCursor((c) => ({ year: c.month === 11 ? c.year + 1 : c.year, month: (c.month + 1) % 12 }))}>
              <ChevronRight size={17} />
            </button>
          </div>
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-4xl">
        {!events ? (
          <Loader />
        ) : (
          <div className="card p-3 lg:p-4">
            <div className="grid grid-cols-7 mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-ink-faint py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((day, i) => (
                <button
                  key={i}
                  disabled={!day}
                  onClick={() => day && openAdd(day)}
                  className={cx(
                    "aspect-square rounded-xl p-1.5 text-left flex flex-col transition-colors",
                    day ? "hover:bg-surface-sunken cursor-pointer" : "invisible",
                    isToday(day) && "ring-2 ring-accent"
                  )}
                >
                  <span className={cx("text-xs font-medium", isToday(day) && "text-accent font-bold")}>{day}</span>
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {(eventsByDay[day] || []).slice(0, 3).map((e) => (
                      <span key={e.id} className={cx("w-1.5 h-1.5 rounded-full", EVENT_COLOR[e.event_type] || "bg-accent")} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {events?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2.5">This Month</p>
            <div className="card divide-y divide-black/5 dark:divide-white/5">
              {events
                .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                .map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3 group">
                    <span className={cx("w-2 h-2 rounded-full shrink-0", EVENT_COLOR[e.event_type] || "bg-accent")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(e.start_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {e.event_type}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-500 transition-opacity shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Add Event — ${selectedDay ? monthLabel : ""} ${selectedDay || ""}`}>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
              {Object.keys(EVENT_COLOR).map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date & time</label>
            <input
              type="datetime-local"
              className="input"
              value={form.start_datetime}
              onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            <Plus size={15} /> Add Event
          </button>
        </form>
      </Modal>
    </>
  );
}
