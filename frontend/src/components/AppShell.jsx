import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import VerifyBanner from "./VerifyBanner";

export default function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        <VerifyBanner />
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
