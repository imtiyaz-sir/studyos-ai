import { useState } from "react";
import { Moon, Sun, LogOut, User, Palette, Trophy } from "lucide-react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { cx } from "../lib/utils";

const ACCENTS = [
  { key: "indigo", color: "#6366f1" },
  { key: "blue", color: "#3b82f6" },
  { key: "purple", color: "#a855f7" },
  { key: "emerald", color: "#10b981" },
];

export default function Settings() {
  const { user, updatePrefs, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saved, setSaved] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    await updatePrefs({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <Topbar title="Settings" subtitle="Personalize your StudyOS AI experience." />

      <div className="px-4 lg:px-8 py-6 max-w-2xl space-y-5">
        <div className="card p-5">
          <p className="font-display font-semibold text-sm flex items-center gap-1.5 mb-4">
            <User size={15} /> Profile
          </p>
          <form onSubmit={saveName} className="flex gap-2">
            <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn-secondary">
              {saved ? "Saved ✓" : "Save"}
            </button>
          </form>
          <p className="text-xs text-ink-faint mt-2">{user?.email}</p>
        </div>

        <div className="card p-5">
          <p className="font-display font-semibold text-sm flex items-center gap-1.5 mb-4">
            <Palette size={15} /> Appearance
          </p>

          <p className="label">Theme</p>
          <div className="flex gap-2 mb-4">
            {["light", "dark"].map((t) => (
              <button
                key={t}
                onClick={() => updatePrefs({ theme: t })}
                className={cx(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                  user?.theme === t
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-black/10 dark:border-white/10 text-ink-muted"
                )}
              >
                {t === "light" ? <Sun size={15} /> : <Moon size={15} />}
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>

          <p className="label">Accent Color</p>
          <div className="flex gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                onClick={() => updatePrefs({ accent_color: a.key })}
                className="w-10 h-10 rounded-full grid place-items-center transition-transform hover:scale-105"
                style={{ backgroundColor: a.color }}
              >
                {user?.accent_color === a.key && <span className="w-3 h-3 rounded-full bg-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="font-display font-semibold text-sm flex items-center gap-1.5 mb-4">
            <Trophy size={15} /> Progress
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-mono text-xl font-semibold">{user?.level}</p>
              <p className="text-[11px] text-ink-muted">Level</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold">{user?.xp}</p>
              <p className="text-[11px] text-ink-muted">XP</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold">{user?.longest_streak}</p>
              <p className="text-[11px] text-ink-muted">Best streak</p>
            </div>
          </div>
        </div>

        <button onClick={logout} className="btn-secondary w-full !text-rose-500">
          <LogOut size={15} /> Log out
        </button>
      </div>
    </>
  );
}
