import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [form, setForm] = useState({ name: "", email: "demo@studyos.ai", password: "password123" });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState(null);
  const [forgotSent, setForgotSent] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDevLink(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password, rememberMe);
        navigate(from, { replace: true });
      } else if (mode === "register") {
        const res = await register(form.name, form.email, form.password);
        if (res.dev_verification_url) setDevLink({ type: "verify", url: res.dev_verification_url });
        else navigate(from, { replace: true });
      } else if (mode === "forgot") {
        const res = await forgotPassword(form.email);
        if (res.dev_reset_url) setDevLink({ type: "reset", url: res.dev_reset_url });
        setForgotSent(true);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dark grid place-items-center shadow-glow mb-3">
            <GraduationCap size={22} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight">StudyOS AI</h1>
          <p className="text-sm text-ink-muted mt-1">Your complete academic life, one dashboard.</p>
        </div>

        <div className="card p-6">
          {mode !== "forgot" && (
            <div className="flex rounded-xl bg-surface-sunken p-1 mb-5">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError("");
                    setDevLink(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === m ? "bg-surface-raised shadow-softer text-ink" : "text-ink-muted"
                  }`}
                >
                  {m === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          )}

          {mode === "forgot" && (
            <div className="mb-5">
              <h2 className="font-display font-semibold text-base">Reset your password</h2>
              <p className="text-xs text-ink-muted mt-1">Enter your email and we'll send you a reset link.</p>
            </div>
          )}

          {forgotSent ? (
            <div className="text-center py-4">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Check your email</p>
              <p className="text-xs text-ink-muted mb-4">
                If an account exists for {form.email}, a reset link is on its way.
              </p>
              {devLink && (
                <a href={devLink.url} className="text-xs text-accent font-medium hover:underline break-all">
                  Dev mode (no SMTP configured) — click to reset now →
                </a>
              )}
              <button
                className="btn-secondary w-full mt-4"
                onClick={() => {
                  setMode("login");
                  setForgotSent(false);
                  setDevLink(null);
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ada Lovelace"
                    required
                  />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input !pr-10"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {mode === "register" && (
                    <p className="text-[11px] text-ink-faint mt-1.5">At least 8 characters, with letters and numbers.</p>
                  )}
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between -mt-1">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded accent-accent"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                    }}
                    className="text-xs text-accent font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-rose-500">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading && <Loader2 size={15} className="animate-spin" />}
                {mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
              </button>

              {mode === "forgot" && (
                <button type="button" className="text-xs text-ink-muted hover:text-ink w-full text-center" onClick={() => setMode("login")}>
                  Back to sign in
                </button>
              )}
            </form>
          )}

          {devLink && devLink.type === "verify" && (
            <div className="mt-4 p-3 rounded-xl bg-accent/10 text-xs">
              <p className="font-medium mb-1">Account created — verify your email to unlock all features.</p>
              <p className="text-ink-muted mb-2">SMTP isn't configured, so here's your dev-mode verification link:</p>
              <a href={devLink.url} className="text-accent font-medium hover:underline break-all">
                {devLink.url}
              </a>
              <button className="btn-secondary w-full mt-3" onClick={() => navigate(from, { replace: true })}>
                Continue to app
              </button>
            </div>
          )}

          {mode === "login" && !devLink && (
            <p className="text-xs text-ink-faint text-center mt-4">Demo account is pre-filled — just hit sign in.</p>
          )}
        </div>
      </div>
    </div>
  );
}
