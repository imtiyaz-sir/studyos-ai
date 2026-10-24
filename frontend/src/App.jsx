import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Loader from "./components/Loader";

import Login from "./pages/Login";
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Subjects = lazy(() => import("./pages/Subjects"));
const SubjectDetail = lazy(() => import("./pages/SubjectDetail"));
const Syllabus = lazy(() => import("./pages/Syllabus"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Revision = lazy(() => import("./pages/Revision"));
const Practice = lazy(() => import("./pages/Practice"));
const Exams = lazy(() => import("./pages/Exams"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Notes = lazy(() => import("./pages/Notes"));
const Skills = lazy(() => import("./pages/Skills"));
const Goals = lazy(() => import("./pages/Goals"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Settings = lazy(() => import("./pages/Settings"));
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminSyllabus = lazy(() => import("./pages/admin/AdminSyllabus"));

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader full />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// Frontend gating is UX-only — the real security boundary is the
// @admin_required decorator on every /api/admin/* backend route, which
// re-checks is_admin against the database on every request regardless of
// what this component does. This just avoids showing a student a flash of
// admin UI before redirecting them.
function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader full />;
  if (!user?.is_admin) return <AccessDenied />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Suspense fallback={<Loader full />}>
    <Routes>
      <Route
        path="/login"
        element={loading ? <Loader full /> : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="subjects/:id" element={<SubjectDetail />} />
        <Route path="syllabus" element={<Syllabus />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="revision" element={<Revision />} />
        <Route path="practice" element={<Practice />} />
        <Route path="exams" element={<Exams />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="notes" element={<Notes />} />
        <Route path="skills" element={<Skills />} />
        <Route path="goals" element={<Goals />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="settings" element={<Settings />} />

        <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
        <Route path="admin/users/:id" element={<RequireAdmin><AdminUserDetail /></RequireAdmin>} />
        <Route path="admin/syllabus" element={<RequireAdmin><AdminSyllabus /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
