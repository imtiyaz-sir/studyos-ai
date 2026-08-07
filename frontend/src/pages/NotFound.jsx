import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div>
        <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent grid place-items-center mx-auto mb-4">
          <Compass size={24} />
        </div>
        <h1 className="font-display font-bold text-xl mb-1">Page not found</h1>
        <p className="text-sm text-ink-muted mb-5">That page doesn't exist — let's get you back on track.</p>
        <Link to="/" className="btn-primary inline-flex">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
