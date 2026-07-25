import { useState } from "react";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const data = await api.forgotPassword(email);
      setMessage(
        "Reset token generated. Check console for token: " + data.token
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="card p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">
          Forgot Password
        </h1>

        <form onSubmit={submit} className="space-y-4">
          <input
            className="input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />

          {message && (
            <p className="text-sm text-green-500">{message}</p>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button className="btn-primary w-full">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
