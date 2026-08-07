import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div>
          <p className="font-display font-semibold text-base mb-1">Invalid link</p>
          <p className="text-sm text-ink-muted mb-4">This reset link is missing a token.</p>
          <Link to="/login" className="btn-primary inline-flex">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dark grid place-items-center shadow-glow mb-3">
            <KeyRound size={20} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight">Set a new password</h1>
        </div>

        <div className="card p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium mb-4">Password updated — you can sign in now.</p>
              <button className="btn-primary w-full" onClick={() => navigate("/login")}>
                Go to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input !pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    autoFocus
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
                <p className="text-[11px] text-ink-faint mt-1.5">At least 8 characters, with letters and numbers.</p>
              </div>
              {error && <p className="text-sm text-rose-500">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading && <Loader2 size={15} className="animate-spin" />}
                Reset password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
