import { cx } from "../lib/utils";

export default function Loader({ full = false, className }) {
  return (
    <div className={cx("flex items-center justify-center", full ? "h-[60vh]" : "py-10", className)}>
      <div className="w-6 h-6 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
    </div>
  );
}
