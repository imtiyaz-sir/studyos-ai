import { cx } from "../lib/utils";

// `data` is an array of { date: "YYYY-MM-DD", count: number }, oldest first.
export default function Heatmap({ data = [] }) {
  if (!data.length) return null;

  const weeks = [];
  let currentWeek = [];
  // Pad the first week so it starts on Sunday, matching GitHub's layout.
  const firstDay = new Date(`${data[0].date}T00:00:00`).getDay();
  for (let i = 0; i < firstDay; i++) currentWeek.push(null);
  data.forEach((d) => {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const levelOf = (count) => {
    if (!count) return 0;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };
  const LEVEL_CLASS = [
    "bg-black/[0.04] dark:bg-white/[0.06]",
    "bg-accent/25",
    "bg-accent/50",
    "bg-accent/75",
    "bg-accent",
  ];

  // Month labels above the columns where a new month begins.
  const monthLabels = weeks.map((week, i) => {
    const firstReal = week.find((d) => d);
    if (!firstReal) return "";
    const date = new Date(`${firstReal.date}T00:00:00`);
    const prevWeek = weeks[i - 1];
    const prevReal = prevWeek?.find((d) => d);
    if (!prevReal) return date.toLocaleDateString("en-US", { month: "short" });
    const prevDate = new Date(`${prevReal.date}T00:00:00`);
    return date.getMonth() !== prevDate.getMonth() ? date.toLocaleDateString("en-US", { month: "short" }) : "";
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1 min-w-full">
        <div className="flex gap-[3px] pl-6">
          {weeks.map((_, i) => (
            <div key={i} className="w-[11px] text-[9px] text-ink-faint shrink-0">
              {monthLabels[i]}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] justify-between text-[9px] text-ink-faint w-5 shrink-0 pt-[2px]">
            <span>Sun</span>
            <span>Wed</span>
            <span>Sat</span>
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) =>
                  day ? (
                    <div
                      key={di}
                      title={`${day.date}: ${day.count} revision${day.count === 1 ? "" : "s"}`}
                      className={cx("w-[11px] h-[11px] rounded-[2px]", LEVEL_CLASS[levelOf(day.count)])}
                    />
                  ) : (
                    <div key={di} className="w-[11px] h-[11px]" />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 pl-6 mt-1">
          <span className="text-[9px] text-ink-faint">Less</span>
          {LEVEL_CLASS.map((c, i) => (
            <div key={i} className={cx("w-[10px] h-[10px] rounded-[2px]", c)} />
          ))}
          <span className="text-[9px] text-ink-faint">More</span>
        </div>
      </div>
    </div>
  );
}
