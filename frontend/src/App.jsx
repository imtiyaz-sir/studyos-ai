import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Loader from "./components/Loader";

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Subjects from "./pages/Subjects";
import SubjectDetail from "./pages/SubjectDetail";
import Syllabus from "./pages/Syllabus";
import Tasks from "./pages/Tasks";
import Revision from "./pages/Revision";
import Practice from "./pages/Practice";
import Exams from "./pages/Exams";
import CalendarPage from "./pages/CalendarPage";
import Notes from "./pages/Notes";
import Skills from "./pages/Skills";
import Goals from "./pages/Goals";
import Analytics from "./pages/Analytics";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader full />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
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
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
