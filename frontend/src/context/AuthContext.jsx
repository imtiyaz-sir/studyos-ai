import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Apply theme + accent to <html> whenever the user record changes.
  useEffect(() => {
    const root = document.documentElement;
    const theme = user?.theme || localStorage.getItem("studyos-theme") || "light";
    const accent = user?.accent_color || localStorage.getItem("studyos-accent") || "indigo";
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-accent", accent);
  }, [user]);

  const login = async (email, password, rememberMe = false) => {
    const data = await api.post("/api/auth/login", { email, password, remember_me: rememberMe });
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await api.post("/api/auth/register", { name, email, password });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  };

  const resendVerification = () => api.post("/api/auth/resend-verification");
  const forgotPassword = (email) => api.post("/api/auth/forgot-password", { email });
  const resetPassword = (token, password) => api.post("/api/auth/reset-password", { token, password });
  const verifyEmail = (token) => api.post("/api/auth/verify-email", { token });
  const changePassword = (current_password, new_password) =>
    api.post("/api/auth/change-password", { current_password, new_password });
  const deleteAccount = async (password) => {
    await api.post("/api/auth/delete-account", { password });
    setUser(null);
  };

  const updatePrefs = async (patch) => {
    setUser((u) => ({ ...u, ...patch }));
    if (patch.theme) localStorage.setItem("studyos-theme", patch.theme);
    if (patch.accent_color) localStorage.setItem("studyos-accent", patch.accent_color);
    try {
      await api.put("/api/auth/me", patch);
    } catch {
      // Local state already updated optimistically; a failed sync isn't worth interrupting the UI for.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, login, register, logout, updatePrefs, refresh,
        resendVerification, forgotPassword, resetPassword, verifyEmail, changePassword, deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
