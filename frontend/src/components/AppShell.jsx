import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Loader from "./Loader";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import VerifyBanner from "./VerifyBanner";
import ConnectionStatus from "./ConnectionStatus";

export default function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        <ConnectionStatus />
        <VerifyBanner />
        {/* Keeps sidebar/nav on screen while a page's code chunk downloads */}
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </div>
      <BottomNav />
    </div>
  );
}
