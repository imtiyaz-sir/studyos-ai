import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function VerifyBanner() {
  const { user, resendVerification } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [devLink, setDevLink] = useState(null);

  if (!user || user.is_verified || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      const res = await resendVerification();
      if (res.dev_verification_url) {
        setDevLink(res.dev_verification_url);
      } else {
        toast("Verification email sent — check your inbox.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 lg:px-8 py-2.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <MailWarning size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs font-medium flex-1 min-w-[200px]">
          Verify your email to unlock creating and editing — you can still browse everything.
        </p>
        {devLink ? (
          <a href={devLink} className="text-xs text-accent font-medium hover:underline break-all">
            Dev mode — click to verify →
          </a>
        ) : (
          <button onClick={resend} disabled={sending} className="text-xs text-accent font-medium hover:underline shrink-0">
            {sending ? "Sending…" : "Resend email"}
          </button>
        )}
        <button onClick={() => setDismissed(true)} className="text-ink-faint hover:text-ink shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
