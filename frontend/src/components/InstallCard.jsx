import { useState } from "react";
import { Download, Smartphone, CheckCircle2, Share, MoreVertical } from "lucide-react";
import { useInstall } from "../lib/pwa";
import { useToast } from "../context/ToastContext";

export default function InstallCard() {
  const { installed, canPrompt, dismissed, install, platform } = useInstall();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const onInstall = async () => {
    setBusy(true);
    try {
      const outcome = await install();
      if (outcome === "accepted") toast("Installing StudyOS AI…");
      else if (outcome === "dismissed") toast("No problem — you can install it any time from here.");
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-5">
      <p className="font-display font-semibold text-sm flex items-center gap-1.5 mb-3">
        <Smartphone size={15} /> Install app
      </p>

      {installed ? (
        <p className="text-sm text-emerald-500 flex items-center gap-1.5">
          <CheckCircle2 size={16} /> StudyOS AI is installed on this device.
        </p>
      ) : canPrompt ? (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Add StudyOS AI to your home screen for a full-screen, app-like experience and faster launches.
          </p>
          <button type="button" className="btn-primary" onClick={onInstall} disabled={busy}>
            <Download size={16} /> {busy ? "Opening…" : "Install app"}
          </button>
          {dismissed && <p className="text-xs text-slate-500 mt-2">You can still install any time.</p>}
        </>
      ) : platform === "ios" ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          On iPhone/iPad, open this page in Safari, tap <Share size={14} className="inline -mt-0.5" /> <b>Share</b>,
          then <b>Add to Home Screen</b>.
        </p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Open your browser menu <MoreVertical size={14} className="inline -mt-0.5" /> and choose{" "}
          <b>{platform === "android" ? "Install app" : "Install StudyOS AI"}</b> or <b>Add to Home screen</b>.
          If you don't see it, your browser may not support installing web apps, or the app needs to be opened over HTTPS.
        </p>
      )}
    </div>
  );
}
