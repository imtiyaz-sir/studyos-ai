import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.resetPassword(token, password);
      setMessage("Password changed successfully. Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="card p-6 w-full max-w-sm">

        <h1 className="text-xl font-bold mb-4 text-center">
          Reset Password
        </h1>

        <form onSubmit={submit} className="space-y-4">

          <input
            className="input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            minLength={6}
            required
          />

          <input
            className="input"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e)=>setConfirm(e.target.value)}
            required
          />

          {message && (
            <p className="text-sm text-green-500">
              {message}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>

        </form>

      </div>
    </div>
  );
}
