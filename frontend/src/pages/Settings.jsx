import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut, User, Palette, Trophy, Lock, Eye, EyeOff, ShieldAlert, Trash2, BadgeCheck, MailWarning } from "lucide-react";
import Topbar from "../components/Topbar";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { cx } from "../lib/utils";

const ACCENTS = [
  { key: "indigo", color: "#6366f1" },
  { key: "blue", color: "#3b82f6" },
  { key: "purple", color: "#a855f7" },
  { key: "emerald", color: "#10b981" },
];

export default function Settings() {
  const { user, updatePrefs, logout, changePassword, deleteAccount, resendVerification } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [resending, setResending] = useState(false);
  const [devLink, setDevLink] = useState(null);

  const saveName = async (e) => {
    e.preventDefault();
    await updatePrefs({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError("New passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current_password, pwForm.new_password);
      toast("Password updated");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwError(err.message || "Something went wrong.");
    } finally {
      setPwSaving(false);
    }
  };

  const submitDelete = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(err.message || "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const res = await resendVerification();
      if (res.dev_verification_url) setDevLink(res.dev_verification_url);
      else toast("Verification email sent");
    } finally {
      setResending(false);
    }
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
          <div className="flex items-center gap-1.5 mt-2">
            <p className="text-xs text-ink-faint">{user?.email}</p>
            {user?.is_verified ? (
              <span className="badge !py-0.5 !px-1.5 text-[10px] text-emerald-600 bg-emerald-500/10 dark:text-emerald-400">
                <BadgeCheck size={11} /> Verified
              </span>
            ) : (
              <span className="badge !py-0.5 !px-1.5 text-[10px] text-amber-600 bg-amber-500/10 dark:text-amber-400">
                <MailWarning size={11} /> Unverified
              </span>
            )}
          </div>
          {!user?.is_verified && (
            <div className="mt-2">
              {devLink ? (
                <a href={devLink} className="text-xs text-accent font-medium hover:underline break-all">
                  Dev mode — click to verify →
                </a>
              ) : (
                <button onClick={resend} disabled={resending} className="text-xs text-accent font-medium hover:underline">
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
              )}
            </div>
          )}
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

        {/* Change password */}
        <div className="card p-5">
          <p className="font-display font-semibold text-sm flex items-center gap-1.5 mb-4">
            <Lock size={15} /> Change Password
          </p>
          <form onSubmit={submitPasswordChange} className="space-y-3">
            <div>
              <label className="label">Current password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="input !pr-10"
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">New password</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="input"
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm new</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="input"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  minLength={8}
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-ink-faint">At least 8 characters, with letters and numbers.</p>
            {pwError && <p className="text-sm text-rose-500">{pwError}</p>}
            <button type="submit" disabled={pwSaving} className="btn-primary w-full">
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

        <button onClick={logout} className="btn-secondary w-full !text-rose-500">
          <LogOut size={15} /> Log out
        </button>

        {/* Danger zone */}
        <div className="card p-5 border-rose-500/20">
          <p className="font-display font-semibold text-sm flex items-center gap-1.5 mb-2 text-rose-500">
            <ShieldAlert size={15} /> Danger Zone
          </p>
          <p className="text-xs text-ink-muted mb-4">
            Deleting your account permanently removes all subjects, tasks, notes, revision history, and progress. This cannot be undone.
          </p>
          <button
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 text-rose-500 font-medium px-4 py-2.5 text-sm hover:bg-rose-500/10 transition-colors"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} /> Delete Account
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          setDeletePassword("");
          setDeleteError("");
        }}
        onConfirm={submitDelete}
        loading={deleting}
        title="Delete Your Account?"
        confirmLabel="Delete Forever"
        message={
          <>
            This permanently removes your account and all associated data — subjects, tasks, notes, revision
            history, everything. This action cannot be undone.
            <span className="block mt-3">
              <label className="label">Confirm your password to continue</label>
              <input
                type="password"
                className="input"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />
              {deleteError && <span className="block text-xs text-rose-500 mt-1.5">{deleteError}</span>}
            </span>
          </>
        }
      />
    </>
  );
}
