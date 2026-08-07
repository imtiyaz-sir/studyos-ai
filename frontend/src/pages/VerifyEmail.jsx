import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { MailCheck, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

export default function VerifyEmail() {
  const { verifyEmail, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This verification link is missing a token.");
      return;
    }
    verifyEmail(token)
      .then(async () => {
        setStatus("success");
        await refresh();
      })
      .catch((err) => {
        setStatus("error");
        setError(err.message || "This verification link is invalid or has expired.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-sm animate-fade-up text-center">
        <div className="card p-8">
          {status === "verifying" && (
            <>
              <Loader />
              <p className="text-sm text-ink-muted mt-2">Verifying your email…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-display font-semibold text-base mb-1">Email verified!</p>
              <p className="text-sm text-ink-muted mb-5">All features are now unlocked.</p>
              <button className="btn-primary w-full" onClick={() => navigate("/")}>
                Go to dashboard
              </button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle size={36} className="text-rose-500 mx-auto mb-3" />
              <p className="font-display font-semibold text-base mb-1">Verification failed</p>
              <p className="text-sm text-ink-muted mb-5">{error}</p>
              <Link to="/" className="btn-primary inline-flex">
                <MailCheck size={15} /> Go to app
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
