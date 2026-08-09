import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div>
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 grid place-items-center mx-auto mb-4">
          <ShieldAlert size={24} />
        </div>
        <h1 className="font-display font-bold text-xl mb-1">Access Denied</h1>
        <p className="text-sm text-ink-muted mb-5 max-w-xs mx-auto">
          This area is restricted to administrators. If you think this is a mistake, contact support.
        </p>
        <Link to="/" className="btn-primary inline-flex">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
