import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus, applyServiceWorkerUpdate } from "../lib/pwa";

/** Offline banner + "new version available" prompt. Neither blocks the UI. */
export default function ConnectionStatus() {
  const online = useOnlineStatus();
  const [updateReg, setUpdateReg] = useState(null);

  useEffect(() => {
    const h = (e) => setUpdateReg(e.detail);
    window.addEventListener("studyos:sw-update", h);
    return () => window.removeEventListener("studyos:sw-update", h);
  }, []);

  return (
    <>
      {!online && (
        <div role="status" className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm flex items-center gap-2">
          <WifiOff size={15} /> You're offline. Changes can't be saved until you reconnect.
        </div>
      )}
      {updateReg && (
        <div role="status" className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2 text-sm flex items-center justify-between gap-3">
          <span>A new version of StudyOS AI is ready.</span>
          <button type="button" className="btn-secondary !py-1.5" onClick={() => applyServiceWorkerUpdate(updateReg)}>
            <RefreshCw size={14} /> Update
          </button>
        </div>
      )}
    </>
  );
}
