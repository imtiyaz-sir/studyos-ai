import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/admin/users")
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Admin Dashboard
      </h1>

      {error && (
        <p className="text-red-500 mb-4">
          {error}
        </p>
      )}

      <p className="mb-4">
        Total Users: {users.length}
      </p>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="card p-4"
          >
            <h2 className="font-semibold">
              {user.name}
            </h2>

            <p className="text-sm">
              {user.email}
            </p>

            <p className="text-sm text-ink-muted">
              Level: {user.level} |
              XP: {user.xp}
            </p>

            <p className="text-xs text-ink-muted">
              Joined: {user.created_at}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
